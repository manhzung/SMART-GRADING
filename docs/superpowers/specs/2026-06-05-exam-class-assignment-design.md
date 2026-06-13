# Spec: Gán Exam cho Class

**Date:** 2026-06-05
**Status:** Approved
**Platform:** React Web + Node.js/Express

---

## 1. Overview

Cho phép người dùng (giáo viên, admin) gán bài thi (exam) vào một lớp học cụ thể từ giao diện Class Detail. Mỗi exam có thể thuộc nhiều lớp (quan hệ nhiều-nhiều).

---

## 2. Decisions Made

| # | Question | Decision |
|---|---------|---------|
| 1 | Exam-Class relationship | Many-to-many: `classIds[]` array on Exam model (already exists) |
| 2 | Primary class | Not needed — all classes are equal |
| 3 | Add/remove after publish | Allow for `draft` and `published`. Block for `in_progress`. |
| 4 | UI approach | Table management + modal selection |
| 5 | Platform | React Web only |

---

## 3. Backend Changes

### 3.1 Business Rule: Block add/remove when exam is `in_progress`

**File:** `server/src/services/exam.service.js`

Modify `addClasses()` and `removeClasses()`:

```javascript
async addClasses(id, classIds) {
  const exam = await Exam.findById(id);
  if (!exam) throw new ApiError(404, 'Exam not found');
  if (exam.status === 'in_progress') {
    throw new ApiError(409, 'Cannot add classes to an exam that is in progress');
  }
  // ... existing logic
}

async removeClasses(id, classIds) {
  const exam = await Exam.findById(id);
  if (!exam) throw new ApiError(404, 'Exam not found');
  if (exam.status === 'in_progress') {
    throw new ApiError(409, 'Cannot remove classes from an exam that is in progress');
  }
  // ... existing logic
}
```

### 3.2 Reverse Routes (Class → Exams)

**File:** `server/src/routes/v1/class.route.js`

Add three routes for managing exams from the class perspective:

```
GET    /classes/:id/exams    → List all exams assigned to this class
POST   /classes/:id/exams    → Assign one or more exams to this class
DELETE /classes/:id/exams/:examId → Remove one exam from this class
```

Permission: `manageExams` (same as exam-level routes).

**File:** `server/src/controllers/class.controller.js`

```javascript
const getClassExams = catchAsync(async (req, res) => {
  const exams = await classService.getClassExams(req.params.id, req.user);
  res.send(exams);
});

const assignExamsToClass = catchAsync(async (req, res) => {
  const { examIds } = req.body;
  const result = await classService.assignExamsToClass(req.params.id, examIds, req.user);
  res.send(result);
});

const removeExamFromClass = catchAsync(async (req, res) => {
  await classService.removeExamFromClass(req.params.id, req.params.examId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});
```

**File:** `server/src/services/class.service.js`

```javascript
async getClassExams(classId, requestingUser) {
  await this._authorizeClassAccess(classId, requestingUser, 'view');
  return Exam.find({ classIds: classId, status: { $ne: 'archived' } })
    .populate('primaryClassId', 'name code')
    .sort({ examDate: -1 });
}

async assignExamsToClass(classId, examIds, requestingUser) {
  await this._authorizeClassAccess(classId, requestingUser, 'modify');
  const results = { assigned: [], failed: [] };
  for (const examId of examIds) {
    try {
      const exam = await Exam.findById(examId);
      if (!exam) {
        results.failed.push({ examId, error: 'Exam not found' });
        continue;
      }
      if (exam.status === 'in_progress') {
        results.failed.push({ examId, error: 'Cannot assign exam that is in progress' });
        continue;
      }
      if (!exam.classIds.includes(classId)) {
        exam.classIds.push(classId);
        await exam.save();
      }
      results.assigned.push(examId);
    } catch (err) {
      results.failed.push({ examId, error: err.message });
    }
  }
  return results;
}

async removeExamFromClass(classId, examId, requestingUser) {
  await this._authorizeClassAccess(classId, requestingUser, 'modify');
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError(404, 'Exam not found');
  if (exam.status === 'in_progress') {
    throw new ApiError(409, 'Cannot remove class from an exam that is in progress');
  }
  exam.classIds = exam.classIds.filter(id => id.toString() !== classId.toString());
  await exam.save();
}
```

**File:** `server/src/validations/class.validation.js`

Add validation schemas:

```javascript
const getClassExams = { params: id };
const assignExamsToClass = {
  params: id,
  body: Joi.object().keys({
    examIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  }),
};
const removeExamFromClass = {
  params: Joi.object().keys({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};
```

---

## 4. Frontend Changes

### 4.1 Fix examStore API paths

The existing `addClassesToExam` and `removeClassesFromExam` methods in `examStore.ts` use wrong paths (`/classes/add`, `/classes/remove`). Fix to:

```typescript
addClassesToExam: async (id, classIds) => {
  // ...
  await apiService.post(`/exams/${id}/classes`, { classIds });
  // ...
},
removeClassesFromExam: async (id, classIds) => {
  // ...
  await apiService.delete(`/exams/${id}/classes`, { data: { classIds } });
  // ...
},
```

### 4.2 Add classStore methods

**File:** `client/web/src/presentation/store/classStore.ts`

Add two new methods:

```typescript
fetchClassExams: (classId: string) => Promise<void>,
assignExamsToClass: (classId: string, examIds: string[]) => Promise<void>,
removeExamFromClass: (classId: string, examId: string) => Promise<void>,
```

Implementation calls:
- `GET /classes/:id/exams`
- `POST /classes/:id/exams`
- `DELETE /classes/:id/exams/:examId`

### 4.3 Create `ClassExamsSection` component

**File:** `client/web/src/pages/ClassExamsSection.tsx`
**CSS:** `client/web/src/pages/ClassExamsSection.module.css`

A new section component that:
1. Renders a card with "Bài thi của lớp" heading and an "+ Gán bài thi" button
2. Displays a table with columns: Tên bài thi, Ngày thi, Thời lượng, Số câu hỏi, Trạng thái, Thao tác
3. Status badges with color coding:
   - `draft` → gray
   - `published` → blue
   - `in_progress` → amber
   - `completed` → green
4. Action column: trash icon button with tooltip "Xóa khỏi lớp này"
   - Disabled (with tooltip explanation) when exam status is `in_progress`
5. Empty state when no exams assigned
6. Loading state with spinner
7. **AssignExamModal** embedded: triggered by "+ Gán bài thi" button
   - Modal header: "Gán bài thi cho [Tên lớp]"
   - Search input to filter exams by name
   - Filter dropdown for exam status
   - List of available exams with checkboxes
   - Already-assigned exams are pre-checked and disabled (cannot unassign)
   - Exams with `in_progress` status are shown but cannot be assigned (warning icon)
   - "Lưu" button: compares current selection vs original, calls add/remove APIs
   - Error handling: shows failed assignments from API response

### 4.4 Integrate into ClassDetailPage

**File:** `client/web/src/pages/ClassDetailPage.tsx`

Add the `ClassExamsSection` component between the stats cards and the student table:
- Import `ClassExamsSection`
- Pass `classId` prop
- Show for all users with `manageExams` permission (admin/teacher)

---

## 5. Component Props

```typescript
interface ClassExamsSectionProps {
  classId: string;
  className?: string;
}
```

## 6. API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET | `/classes/:id/exams` | List exams for a class | `auth()` |
| POST | `/classes/:id/exams` | Assign exams to a class | `manageExams` |
| DELETE | `/classes/:id/exams/:examId` | Remove exam from a class | `manageExams` |

## 7. Status Badge Colors

| Status | Color | Hex |
|--------|-------|-----|
| draft | Gray | `#6b7280` |
| published | Blue | `#3b82f6` |
| in_progress | Amber | `#f59e0b` |
| completed | Green | `#10b981` |
| archived | Red | `#ef4444` |
