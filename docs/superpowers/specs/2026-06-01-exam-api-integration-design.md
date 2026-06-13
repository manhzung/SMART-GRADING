# Exam API Integration - Design Specification

> **Date:** 2026-06-01
> **Project:** SMART GRADING - React Web Client

---

## 1. Overview

Tich hop day du tat ca cac API cho he thong quan ly exam tren React web client. Tat ca 4 trang (ExamsPage, ExamDetailPage, CreateExamPage, EditExamPage) can duoc ket noi voi backend Node.js.

Backend base URL: `http://localhost:3000/api/v1`

---

## 2. Pages & Routes

| Page | Route | File |
|------|-------|------|
| ExamsPage (danh sach) | `/exams` | `client/web/src/pages/ExamsPage.tsx` |
| ExamDetailPage (chi tiet) | `/exams/:id` | `client/web/src/pages/ExamDetailPage.tsx` |
| CreateExamPage (tao moi) | `/exams/new` | `client/web/src/pages/CreateExamPage.tsx` |
| EditExamPage (chinh sua) | `/exams/:id/edit` | `client/web/src/pages/EditExamPage.tsx` |

---

## 3. Backend API Contract

### Exam Endpoints

| Method | Path | Auth | Body/Params | Response |
|--------|------|------|-------------|----------|
| GET | `/exams` | any | `?classId&status&fromDate&toDate&sortBy&order&limit&page` | `{ results: Exam[], page, limit, total, pages }` |
| POST | `/exams` | manageExams | ExamPayload | `Exam` |
| GET | `/exams/:id` | any | - | `Exam` (populated) |
| PATCH | `/exams/:id` | manageExams | PartialExamPayload | `Exam` |
| DELETE | `/exams/:id` | manageExams | - | `204` |
| POST | `/exams/:id/publish` | manageExams | - | `Exam` |
| POST | `/exams/:id/complete` | manageExams | - | `Exam` |
| POST | `/exams/:id/classes` | manageExams | `{ classIds: string[] }` | `Exam` |
| DELETE | `/exams/:id/classes` | manageExams | `{ classIds: string[] }` | `Exam` |
| GET | `/exams/:id/versions` | any | - | `ExamVersion[]` |
| POST | `/exams/:id/versions` | manageExams | `{ count: number }` | `{ examId, versions, examVersions }` |
| GET | `/exams/:id/versions/full` | any | - | `ExamVersion[]` (populated questions) |

### Submission Endpoints

| Method | Path | Auth | Body/Params | Response |
|--------|------|------|-------------|----------|
| GET | `/submissions/exam/:examId` | any | - | `Submission[]` |
| GET | `/submissions/exam/:examId/statistics` | any | - | `ExamStatistics` |

### Question Endpoints

| Method | Path | Auth | Body/Params | Response |
|--------|------|------|-------------|----------|
| GET | `/questions` | any | `?limit&page&search&difficulty` | `{ results, page, limit, total }` |
| GET | `/questions/:id` | any | - | `Question` |

### OMR Template Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/omr-templates` | any | `OMRTemplate[]` |

---

## 4. Data Models

### Exam (Backend)

```typescript
interface Exam {
  _id: string;
  title: string;
  description?: string;
  classIds: { _id: string; name: string; code: string }[];
  primaryClassId?: { _id: string; name: string; code: string };
  subjectId?: string;
  createdBy?: { _id: string; name: string; email: string };
  omrTemplateId?: { _id: string; name: string; code: string };
  examDate: string;
  startTime: string;
  duration: number;
  totalScore: number;
  passingScore: number;
  numberOfQuestions: number;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';
  numberOfVersions: number;
  questionIds: string[];
  versions: string[];
  shuffleConfig?: { shuffleQuestions: boolean; shuffleOptions: boolean };
  printConfig?: { paperSize?: string; questionsPerPage?: number };
  totalStudents?: number;
  totalSubmissions?: number;
  publishedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### ExamVersion

```typescript
interface ExamVersion {
  _id: string;
  examId: string;
  versionCode: string;
  numberOfQuestions: number;
  questions: {
    position: number;
    questionId: string;
    originalPosition: number;
    shuffledOptions: { id: string; content: string }[];
  }[];
  answerKey: Record<string, 'A'|'B'|'C'|'D'>;
  submissionCount: number;
  isActive: boolean;
  createdAt: string;
}
```

### ExamStatistics

```typescript
interface ExamStatistics {
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  totalSubmissions: number;
  totalStudents: number;
  submissionRate: number;
  scoreDistribution: { range: string; count: number }[];
}
```

### OMRTemplate

```typescript
interface OMRTemplate {
  _id: string;
  name: string;
  code: string;
  zones?: any;
  description?: string;
  isDefault?: boolean;
}
```

---

## 5. Store Architecture

### examStore - Extend

State to add: `currentExam`, `examVersions`, `examSubmissions`, `examStatistics`, `isPublishing`, `isCompleting`, `isGeneratingVersions`, `isLoadingDetail`

Actions to add:
- `fetchExamById(id)` - GET /exams/:id
- `publishExam(id)` - POST /exams/:id/publish
- `completeExam(id)` - POST /exams/:id/complete
- `fetchExamVersions(id)` - GET /exams/:id/versions
- `fetchExamVersionsFull(id)` - GET /exams/:id/versions/full
- `generateExamVersions(id, count)` - POST /exams/:id/versions
- `addClassesToExam(id, classIds)` - POST /exams/:id/classes
- `removeClassesFromExam(id, classIds)` - DELETE /exams/:id/classes
- `fetchExamSubmissions(id)` - GET /submissions/exam/:id
- `fetchExamStatistics(id)` - GET /submissions/exam/:id/statistics
- `fetchExamList(filters)` - GET /exams with filter params (status, classId, dateRange)

### submissionStore - Create

State: `submissions`, `statistics`, `isLoading`

### omrTemplateStore - Create

State: `templates`, `isLoading`

---

## 6. Integration Per Page

### 6.1 ExamsPage

- Chuyen filter tu client-side sang server-side (them params vao GET /exams)
- Thay stat cards mock bang du lieu tu API (tinh tu exam list)
- Ket noi publish/complete bang examStore
- Bulk delete bang vong lap DELETE

### 6.2 ExamDetailPage

- GET /exams/:id cho full exam data
- GET /exams/:id/versions/full cho question list
- GET /submissions/exam/:id cho submission list
- GET /submissions/exam/:id/statistics cho statistics
- POST /exams/:id/publish cho nut "Xuat ban"
- POST /exams/:id/complete cho nut "Hoan thanh"
- POST /exams/:id/versions cho nut "Sinh phien ban"
- POST /exams/:id/classes cho them lop
- DELETE /exams/:id/classes cho xoa lop
- Xoa mock data, thay bang API data

### 6.3 CreateExamPage

- Tao OMRTemplateStore (hoac dung useState)
- Xu ly error tu API (hien thi message thay vi chi alert)
- Su dung examStore.createExam() hoac goi apiService truc tiep nhung dung ro rang

### 6.4 EditExamPage

- GET /exams/:id/versions/full de lay actual questions
- Thay mock question list bang API data
- PATCH /exams/:id cho tat ca thay doi

---

## 7. Error Handling

| HTTP Status | Message |
|-------------|---------|
| 400 | Validation error - hien thi message tu backend |
| 401 | Chuyen ve trang login |
| 403 | "Ban khong co quyen thuc hien hanh dong nay" |
| 404 | "Khong tim thay bai thi" |
| 409 | "Bai thi da ton tai" |
| 500 | "Loi may chu, vui long thu lai sau" |

---

## 8. Scope

**Trong pham vi:**
- Tao moi/extend stores (examStore, submissionStore, omrTemplateStore)
- Cap nhat 4 trang de su dung API
- Error handling & loading states
- Type definitions

**Ngoai pham vi:**
- Backend API endpoints
- OMR scanning
- PDF export
- AI question generation

---

## 9. File Changes Summary

| File | Action |
|------|--------|
| `presentation/store/examStore.ts` | Extend - them methods |
| `presentation/store/submissionStore.ts` | Create moi |
| `presentation/store/omrTemplateStore.ts` | Create moi |
| `pages/ExamsPage.tsx` | Integrate server-side filter, stat cards, status actions |
| `pages/ExamDetailPage.tsx` | Integrate full detail, versions, submissions |
| `pages/CreateExamPage.tsx` | Improve error handling, OMR store |
| `pages/EditExamPage.tsx` | Integrate questions, versions, PATCH |
