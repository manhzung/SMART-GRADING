# Question Bank Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bảo mật và phân quyền cho question bank - phân tách theo trường, ownership check, ẩn đáp án với student, approval workflow.

**Architecture:** Backend service-layer access control + Frontend permission hook. Không thay đổi API routes.

**Tech Stack:** Node.js/Express/Jest (backend), React/TypeScript/Vitest (frontend)

---

## File Map

### Backend (Node.js)
```
server/src/
├── models/question.model.js          [MODIFY] Thêm schoolId + indexes
├── services/question.service.js       [MODIFY] Access control + role filter
├── controllers/question.controller.js [MODIFY] Truyền user vào service
├── routes/v1/question.route.js       [MODIFY] Cập nhật route GET để test được
└── tests/unit/services/
    └── question.service.test.js      [CREATE] Unit tests cho service
```

### Frontend (React)
```
client/web/src/
├── presentation/store/questionStore.ts   [MODIFY] Thêm isApproved filter + createdBy mapping
├── pages/QuestionBankPage.tsx            [MODIFY] Sử dụng permission hook + ẩn đáp án
├── hooks/useQuestionPermissions.ts         [CREATE] Permission hook
└── __tests__/hooks/
    └── useQuestionPermissions.test.ts     [CREATE] Frontend tests
```

---

## BACKEND TASKS

### Task 1: Update Question Model

**Files:**
- Modify: `server/src/models/question.model.js`

- [ ] **Step 1: Thêm schoolId field vào schema**

Đọc file hiện tại, tìm dòng `createdBy` (line 64-67), thêm `schoolId` field ngay sau `createdBy`:

```javascript
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: false,  // false để migration smooth, đổi true sau
      default: null,
    },
```

- [ ] **Step 2: Thêm indexes cho schoolId**

Tìm phần `questionSchema.index(...)` (line 114-117), thêm index mới:

```javascript
questionSchema.index({ schoolId: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ schoolId: 1, isApproved: 1 });
questionSchema.index({ topicId: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ content: 'text' });
```

- [ ] **Step 3: Verify file sau khi sửa**

Run: `node -e "require('./server/src/models/question.model.js'); console.log('OK')"` (nếu có node env setup)
Hoặc đọc lại file để verify.

---

### Task 2: Update Question Service - Access Control

**Files:**
- Modify: `server/src/services/question.service.js`

- [ ] **Step 1: Thêm method `buildRoleFilter` helper**

Thêm vào class `QuestionService` (sau line 5):

```javascript
  /**
   * Build MongoDB filter based on user role and schoolId.
   * @param {Object} user - Express req.user object
   * @returns {Object} MongoDB filter object
   */
  buildRoleFilter(user) {
    const filter = {};

    switch (user.role) {
      case 'admin':
        // Admin thấy tất cả câu hỏi
        break;
      case 'teacher':
        // Teacher chỉ thấy câu hỏi của trường mình
        if (user.schoolId) {
          filter.schoolId = user.schoolId;
        }
        break;
      case 'student':
        // Student chỉ thấy câu hỏi đã duyệt của trường mình
        if (user.schoolId) {
          filter.schoolId = user.schoolId;
        }
        filter.isApproved = true;
        break;
      default:
        filter.schoolId = user.schoolId;
        filter.isApproved = true;
    }

    return filter;
  }
```

- [ ] **Step 2: Update `getAll` method để nhận user param**

Thay signature cũ `async getAll(query = {})` bằng:

```javascript
  async getAll(query = {}, user = null) {
```

Thêm ngay sau dòng `const filter = { ...extraFilters };` (line 51):

```javascript
    // Apply role-based access control
    if (user) {
      const roleFilter = this.buildRoleFilter(user);
      Object.assign(filter, roleFilter);
    }
```

Giữ nguyên các filter khác (topicId, difficulty, etc.) để không conflict.

- [ ] **Step 3: Update `getById` để nhận user và filter đáp án**

Thay `async getById(id)` bằng:

```javascript
  async getById(id, user = null) {
    const question = await Question.findById(id)
      .populate('topicId', 'name code')
      .populate('createdBy', 'name schoolId')
      .lean();

    if (!question) return null;

    // Filter correct answer based on role
    if (user && user.role === 'student') {
      // Student không thấy đáp án đúng
      question.options = question.options.map((opt) => {
        const { isCorrect, ...rest } = opt;
        return rest;
      });
      question.correctAnswer = undefined;
      question.correctAnswers = undefined;
    }

    return question;
  }
```

- [ ] **Step 4: Update `create` method để nhận schoolId**

Thay `async create(data, userId = null)` bằng:

```javascript
  async create(data, userId = null, userSchoolId = null, userRole = 'teacher') {
    // Auto-set correctAnswer for single choice
    if (data.type === 'single_choice') {
      const correctOption = data.options.find(opt => opt.isCorrect);
      data.correctAnswer = correctOption?.id || null;
    }

    // Gán schoolId từ user
    data.schoolId = userSchoolId;

    // Teacher: cần duyệt. Admin: auto approve
    data.isApproved = userRole === 'admin';
    if (userId) {
      data.approvedBy = userId;
      data.approvedAt = userRole === 'admin' ? new Date() : null;
    }

    const question = new Question(data);
    await question.save();
    return question;
  }
```

- [ ] **Step 5: Update `update` method với ownership check**

Thay `async update(id, data)` bằng:

```javascript
  async update(id, data, user = null) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Ownership check: chỉ owner hoặc admin được sửa
    if (user) {
      const isOwner = question.createdBy?.toString() === user.id;
      const isAdmin = user.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new ApiError(403, 'Bạn không có quyền sửa câu hỏi này');
      }
    }

    // Auto-update correctAnswer if options changed
    if (data.options) {
      if (data.type === 'single_choice' || !data.type) {
        const correctOption = data.options.find(opt => opt.isCorrect);
        data.correctAnswer = correctOption?.id || null;
      }
    }

    // Không cho sửa schoolId và createdBy
    delete data.schoolId;
    delete data.createdBy;

    const updated = await Question.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return updated;
  }
```

- [ ] **Step 6: Update `delete` method với ownership + usage check**

Thay `async delete(id)` bằng:

```javascript
  async delete(id, user = null) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Ownership check: chỉ owner hoặc admin được xóa
    if (user) {
      const isOwner = question.createdBy?.toString() === user.id;
      const isAdmin = user.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new ApiError(403, 'Bạn không có quyền xóa câu hỏi này');
      }
      // Không cho xóa câu hỏi đã dùng trong exam
      if (question.usageCount > 0 && !isAdmin) {
        throw new ApiError(400, 'Không thể xóa câu hỏi đã được sử dụng trong đề thi');
      }
    }

    const updated = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return updated;
  }
```

- [ ] **Step 7: Update `approve` method với school check**

Thay `async approve(id, approvedBy)` bằng:

```javascript
  async approve(id, approverId, approverSchoolId, approverRole) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Chỉ admin hoặc teacher cùng trường được duyệt
    if (approverRole !== 'admin') {
      if (!approverSchoolId || question.schoolId?.toString() !== approverSchoolId.toString()) {
        throw new ApiError(403, 'Bạn không có quyền duyệt câu hỏi này');
      }
    }

    const updated = await Question.findByIdAndUpdate(
      id,
      { isApproved: true, approvedBy: approverId, approvedAt: new Date() },
      { new: true }
    );
    return updated;
  }
```

---

### Task 3: Update Question Controller

**Files:**
- Modify: `server/src/controllers/question.controller.js`

- [ ] **Step 1: Update `create` để truyền schoolId**

Thay:

```javascript
const create = catchAsync(async (req, res) => {
  const question = await questionService.create(req.body, req.user?.id);
  res.status(httpStatus.CREATED).send(question);
});
```

Bằng:

```javascript
const create = catchAsync(async (req, res) => {
  const question = await questionService.create(
    req.body,
    req.user?.id,
    req.user?.schoolId,
    req.user?.role
  );
  res.status(httpStatus.CREATED).send(question);
});
```

- [ ] **Step 2: Update `getAll` để truyền user**

Thay:

```javascript
const getAll = catchAsync(async (req, res) => {
  const result = await questionService.getAll(req.query);
  res.send(result);
});
```

Bằng:

```javascript
const getAll = catchAsync(async (req, res) => {
  const result = await questionService.getAll(req.query, req.user);
  res.send(result);
});
```

- [ ] **Step 3: Update `getById` để truyền user**

Thay:

```javascript
const getById = catchAsync(async (req, res) => {
  const question = await questionService.getById(req.params.id);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.send(question);
});
```

Bằng:

```javascript
const getById = catchAsync(async (req, res) => {
  const question = await questionService.getById(req.params.id, req.user);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.send(question);
});
```

- [ ] **Step 4: Update `update` để truyền user**

Thay:

```javascript
const update = catchAsync(async (req, res) => {
  const question = await questionService.update(req.params.id, req.body);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.send(question);
});
```

Bằng:

```javascript
const update = catchAsync(async (req, res) => {
  const question = await questionService.update(req.params.id, req.body, req.user);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.send(question);
});
```

- [ ] **Step 5: Update `remove` để truyền user**

Thay:

```javascript
const remove = catchAsync(async (req, res) => {
  const question = await questionService.delete(req.params.id);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.status(httpStatus.NO_CONTENT).send();
});
```

Bằng:

```javascript
const remove = catchAsync(async (req, res) => {
  const question = await questionService.delete(req.params.id, req.user);
  if (!question) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Question not found' });
  }
  res.status(httpStatus.NO_CONTENT).send();
});
```

- [ ] **Step 6: Update `approve` để truyền schoolId và role**

Thay:

```javascript
const approve = catchAsync(async (req, res) => {
  const question = await questionService.approve(req.params.id, req.user.id);
  res.send(question);
});
```

Bằng:

```javascript
const approve = catchAsync(async (req, res) => {
  const question = await questionService.approve(
    req.params.id,
    req.user.id,
    req.user.schoolId,
    req.user.role
  );
  res.send(question);
});
```

---

### Task 4: Write Backend Unit Tests

**Files:**
- Create: `server/tests/unit/services/question.service.test.js`
- Fixtures: Update `server/tests/fixtures/user.fixture.js` để thêm teacher và schoolId

- [ ] **Step 1: Tạo user fixture với schoolId**

Đọc `server/tests/fixtures/user.fixture.js`, thêm:

```javascript
const teacherOne = {
  _id: mongoose.Types.ObjectId(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'teacher',
  isEmailVerified: false,
  schoolId: mongoose.Types.ObjectId(),  // Trường A
};

const teacherTwo = {
  _id: mongoose.Types.ObjectId(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'teacher',
  isEmailVerified: false,
  schoolId: mongoose.Types.ObjectId(),  // Trường B
};

const studentOne = {
  _id: mongoose.Types.ObjectId(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'student',
  isEmailVerified: false,
  schoolId: mongoose.Types.ObjectId(),  // Trường A
};
```

Cập nhật export:

```javascript
module.exports = {
  userOne,
  userTwo,
  admin,
  teacherOne,
  teacherTwo,
  studentOne,
  insertUsers,
};
```

- [ ] **Step 2: Tạo question fixture**

Tạo file `server/tests/fixtures/question.fixture.js`:

```javascript
const mongoose = require('mongoose');
const faker = require('faker');

const questionOne = {
  _id: mongoose.Types.ObjectId(),
  content: 'What is 2 + 2?',
  type: 'single_choice',
  options: [
    { id: 'A', content: '3', isCorrect: false, order: 0 },
    { id: 'B', content: '4', isCorrect: true, order: 1 },
    { id: 'C', content: '5', isCorrect: false, order: 2 },
    { id: 'D', content: '6', isCorrect: false, order: 3 },
  ],
  correctAnswer: 'B',
  difficulty: 'easy',
  source: 'manual',
  tags: ['Math'],
  isApproved: true,
  isActive: true,
  usageCount: 0,
};

const questionTwo = {
  _id: mongoose.Types.ObjectId(),
  content: 'What is H2O?',
  type: 'single_choice',
  options: [
    { id: 'A', content: 'Hydrogen', isCorrect: false, order: 0 },
    { id: 'B', content: 'Oxygen', isCorrect: false, order: 1 },
    { id: 'C', content: 'Water', isCorrect: true, order: 2 },
    { id: 'D', content: 'Helium', isCorrect: false, order: 3 },
  ],
  correctAnswer: 'C',
  difficulty: 'medium',
  source: 'manual',
  tags: ['Chemistry'],
  isApproved: false,  // Chưa duyệt
  isActive: true,
  usageCount: 0,
};

const insertQuestions = async (questions) => {
  const Question = require('../../src/models/question.model');
  await Question.insertMany(questions);
};

module.exports = {
  questionOne,
  questionTwo,
  insertQuestions,
};
```

- [ ] **Step 3: Tạo test file cho question service**

Tạo `server/tests/unit/services/question.service.test.js`:

```javascript
const mongoose = require('mongoose');
const QuestionService = require('../../../src/services/question.service');
const ApiError = require('../../../src/utils/ApiError');
const { questionOne, questionTwo, insertQuestions } = require('../../fixtures/question.fixture');
const { admin, teacherOne, teacherTwo, studentOne, insertUsers } = require('../../fixtures/user.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Question Service', () => {
  let questionService;
  let dbQuestions;

  beforeEach(async () => {
    questionService = Object.create(QuestionService);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne]);

    // Gán schoolId cho questions từ fixtures
    const q1 = { ...questionOne, createdBy: teacherOne._id, schoolId: teacherOne.schoolId };
    const q2 = { ...questionTwo, createdBy: teacherOne._id, schoolId: teacherOne.schoolId };
    await insertQuestions([q1, q2]);
    dbQuestions = await mongoose.model('Question').find().lean();
  });

  describe('buildRoleFilter', () => {
    it('admin should see all questions (empty filter)', () => {
      const filter = questionService.buildRoleFilter(admin);
      expect(filter).toEqual({});
    });

    it('teacher should only see questions from their school', () => {
      const filter = questionService.buildRoleFilter(teacherOne);
      expect(filter).toEqual({ schoolId: teacherOne.schoolId });
    });

    it('student should only see approved questions from their school', () => {
      const filter = questionService.buildRoleFilter(studentOne);
      expect(filter).toEqual({ schoolId: studentOne.schoolId, isApproved: true });
    });
  });

  describe('getAll', () => {
    it('admin should see all questions regardless of school', async () => {
      const result = await questionService.getAll({}, admin);
      expect(result.total).toBe(2);
    });

    it('teacher should only see questions from their school', async () => {
      const result = await questionService.getAll({}, teacherOne);
      expect(result.total).toBe(2);
    });

    it('teacher from different school should see 0 questions', async () => {
      const result = await questionService.getAll({}, teacherTwo);
      expect(result.total).toBe(0);
    });

    it('student should only see approved questions', async () => {
      const result = await questionService.getAll({}, studentOne);
      expect(result.total).toBe(1); // Chỉ questionOne.isApproved=true
      expect(result.results[0].isApproved).toBe(true);
    });

    it('no user param should return all questions (backward compat)', async () => {
      const result = await questionService.getAll({});
      expect(result.total).toBe(2);
    });
  });

  describe('getById', () => {
    it('should return question with answers for teacher', async () => {
      const question = await questionService.getById(dbQuestions[0]._id.toString(), teacherOne);
      expect(question.options[0].isCorrect).toBe(false);
      expect(question.options[1].isCorrect).toBe(true);
    });

    it('should NOT return isCorrect for student', async () => {
      const question = await questionService.getById(dbQuestions[0]._id.toString(), studentOne);
      expect(question.options[0].isCorrect).toBeUndefined();
      expect(question.options[1].isCorrect).toBeUndefined();
      expect(question.correctAnswer).toBeUndefined();
    });

    it('should return full question for admin', async () => {
      const question = await questionService.getById(dbQuestions[0]._id.toString(), admin);
      expect(question.options[1].isCorrect).toBe(true);
      expect(question.correctAnswer).toBe('B');
    });

    it('should return null for non-existent question', async () => {
      const question = await questionService.getById(mongoose.Types.ObjectId().toString());
      expect(question).toBeNull();
    });
  });

  describe('create', () => {
    it('teacher should create question with isApproved=false', async () => {
      const data = {
        content: 'New question?',
        type: 'single_choice',
        options: [
          { id: 'A', content: 'Yes', isCorrect: true },
          { id: 'B', content: 'No', isCorrect: false },
        ],
        difficulty: 'easy',
      };
      const question = await questionService.create(data, teacherOne._id.toString(), teacherOne.schoolId.toString(), 'teacher');
      expect(question.isApproved).toBe(false);
      expect(question.schoolId?.toString()).toBe(teacherOne.schoolId.toString());
      expect(question.createdBy?.toString()).toBe(teacherOne._id.toString());
    });

    it('admin should create question with isApproved=true', async () => {
      const data = {
        content: 'Admin question?',
        type: 'single_choice',
        options: [
          { id: 'A', content: 'Yes', isCorrect: true },
          { id: 'B', content: 'No', isCorrect: false },
        ],
        difficulty: 'easy',
      };
      const question = await questionService.create(data, admin._id.toString(), admin.schoolId?.toString(), 'admin');
      expect(question.isApproved).toBe(true);
      expect(question.approvedAt).not.toBeNull();
    });
  });

  describe('update', () => {
    it('owner teacher should be able to update', async () => {
      const updated = await questionService.update(
        dbQuestions[0]._id.toString(),
        { content: 'Updated content' },
        teacherOne
      );
      expect(updated.content).toBe('Updated content');
    });

    it('admin should be able to update any question', async () => {
      const updated = await questionService.update(
        dbQuestions[0]._id.toString(),
        { content: 'Admin updated' },
        admin
      );
      expect(updated.content).toBe('Admin updated');
    });

    it('teacher from different school should NOT be able to update', async () => {
      await expect(
        questionService.update(
          dbQuestions[0]._id.toString(),
          { content: 'Hacked' },
          teacherTwo
        )
      ).rejects.toThrow('Bạn không có quyền sửa câu hỏi này');
    });

    it('student should NOT be able to update', async () => {
      await expect(
        questionService.update(
          dbQuestions[0]._id.toString(),
          { content: 'Hacked' },
          studentOne
        )
      ).rejects.toThrow('Bạn không có quyền sửa câu hỏi này');
    });

    it('should NOT allow changing schoolId', async () => {
      const updated = await questionService.update(
        dbQuestions[0]._id.toString(),
        { content: 'Updated', schoolId: teacherTwo.schoolId },
        admin
      );
      expect(updated.schoolId?.toString()).toBe(teacherOne.schoolId.toString());
    });
  });

  describe('delete', () => {
    it('owner teacher should be able to delete unused question', async () => {
      const deleted = await questionService.delete(dbQuestions[0]._id.toString(), teacherOne);
      expect(deleted.isActive).toBe(false);
    });

    it('admin should be able to delete any question', async () => {
      const deleted = await questionService.delete(dbQuestions[0]._id.toString(), admin);
      expect(deleted.isActive).toBe(false);
    });

    it('teacher from different school should NOT be able to delete', async () => {
      await expect(
        questionService.delete(dbQuestions[0]._id.toString(), teacherTwo)
      ).rejects.toThrow('Bạn không có quyền xóa câu hỏi này');
    });

    it('student should NOT be able to delete', async () => {
      await expect(
        questionService.delete(dbQuestions[0]._id.toString(), studentOne)
      ).rejects.toThrow('Bạn không có quyền xóa câu hỏi này');
    });

    it('teacher should NOT be able to delete used question', async () => {
      await mongoose.model('Question').findByIdAndUpdate(dbQuestions[0]._id, { usageCount: 5 });
      await expect(
        questionService.delete(dbQuestions[0]._id.toString(), teacherOne)
      ).rejects.toThrow('Không thể xóa câu hỏi đã được sử dụng trong đề thi');
    });
  });

  describe('approve', () => {
    beforeEach(async () => {
      // Tạo question chưa duyệt cho test
      await mongoose.model('Question').findByIdAndUpdate(dbQuestions[1]._id, { isApproved: false });
    });

    it('teacher should be able to approve question from their school', async () => {
      const approved = await questionService.approve(
        dbQuestions[1]._id.toString(),
        teacherOne._id.toString(),
        teacherOne.schoolId.toString(),
        'teacher'
      );
      expect(approved.isApproved).toBe(true);
      expect(approved.approvedBy?.toString()).toBe(teacherOne._id.toString());
    });

    it('admin should be able to approve any question', async () => {
      const approved = await questionService.approve(
        dbQuestions[1]._id.toString(),
        admin._id.toString(),
        admin.schoolId?.toString(),
        'admin'
      );
      expect(approved.isApproved).toBe(true);
    });

    it('teacher from different school should NOT be able to approve', async () => {
      await expect(
        questionService.approve(
          dbQuestions[1]._id.toString(),
          teacherTwo._id.toString(),
          teacherTwo.schoolId.toString(),
          'teacher'
        )
      ).rejects.toThrow('Bạn không có quyền duyệt câu hỏi này');
    });
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd server && npm test -- tests/unit/services/question.service.test.js`

Expected: All tests pass.

---

## FRONTEND TASKS

### Task 5: Create Permission Hook

**Files:**
- Create: `client/web/src/hooks/useQuestionPermissions.ts`

- [ ] **Step 1: Tạo permission hook**

```typescript
import { useAuthStore } from '../presentation/store/authStore';
import type { Question } from '../presentation/store/questionStore';

export interface QuestionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: (question: Question) => boolean;
  canDelete: (question: Question) => boolean;
  canApprove: boolean;
  canViewAnswers: boolean;
  canViewPending: boolean;
}

export function useQuestionPermissions(): QuestionPermissions {
  const user = useAuthStore((s) => s.user);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const canManage = isAdmin || isTeacher;

  return {
    canView: !!user,
    canCreate: canManage,
    canEdit: (question: Question) => {
      if (!user || !question) return false;
      // Admin có thể sửa mọi thứ
      if (isAdmin) return true;
      // Teacher chỉ sửa được câu hỏi do mình tạo
      // question.createdBy chứa user id từ backend
      if (isTeacher) {
        // So sánh với user id từ auth store
        // Frontend cần biết ai là owner - sẽ được map từ backend
        return question.createdBy === user.id || question.createdBy === user._id;
      }
      return false;
    },
    canDelete: (question: Question) => {
      if (!user || !question) return false;
      if (isAdmin) return true;
      if (isTeacher) {
        return question.createdBy === user.id || question.createdBy === user._id;
      }
      return false;
    },
    canApprove: canManage,
    canViewAnswers: canManage,
    canViewPending: canManage,
  };
}
```

---

### Task 6: Update Frontend Store

**Files:**
- Modify: `client/web/src/presentation/store/questionStore.ts`

- [ ] **Step 1: Cập nhật `BackendQuestion` interface để include `createdBy`**

Tìm `BackendQuestion` interface (line 13-39), thêm:

```typescript
  createdBy?: { _id: string; name: string; schoolId?: string };
```

- [ ] **Step 2: Cập nhật `Question` interface**

Tìm `Question` interface (line 51-71), thêm:

```typescript
  createdBy?: string;  // user id của người tạo
  schoolId?: string;   // school id
  createdByName?: string;  // tên người tạo (optional display)
```

- [ ] **Step 3: Cập nhật `toFrontendQuestion` mapping**

Tìm `toFrontendQuestion` function (line 97-124), thêm mapping:

```typescript
  const qId = bq.id || bq._id || '';
  return {
    _id: qId,
    id: qId,
    // ... existing fields ...
    createdBy: typeof bq.createdBy === 'object' ? bq.createdBy._id : bq.createdBy,
    schoolId: bq.schoolId,
    createdByName: typeof bq.createdBy === 'object' ? bq.createdBy.name : undefined,
    // ... rest unchanged ...
  };
```

---

### Task 7: Update QuestionBankPage

**Files:**
- Modify: `client/web/src/pages/QuestionBankPage.tsx`

- [ ] **Step 1: Import permission hook**

Tìm phần import (line 1-24), thêm:

```typescript
import { useQuestionPermissions } from '../hooks/useQuestionPermissions';
```

- [ ] **Step 2: Sử dụng permission hook**

Tìm dòng `const canManage = user?.role === 'admin' || user?.role === 'teacher';` (line 108), thay bằng:

```typescript
  const permissions = useQuestionPermissions();
  const canManage = permissions.canCreate;
```

- [ ] **Step 3: Ẩn badge "Correct Answer" với student**

Tìm phần render options trong card (line 592-606), sửa:

```typescript
                  {/* Options */}
                  <div className={styles.optionsGrid}>
                    {q.options.map((opt) => (
                      <div
                        key={opt.letter}
                        className={`${styles.optionCard} ${opt.isCorrect && permissions.canViewAnswers ? styles.optionCardCorrect : ''}`}
                      >
                        <div className={styles.optionLetter}>{opt.letter}</div>
                        <span className={styles.optionText}>{parseMathText(opt.text)}</span>
                        {opt.isCorrect && permissions.canViewAnswers && (
                          <span className={styles.correctLabelBadge}>Correct Answer</span>
                        )}
                      </div>
                    ))}
                  </div>
```

- [ ] **Step 4: Thêm filter "Pending" cho teacher/admin**

Tìm phần filter group trong aside (line 309-364), thêm sau phần Difficulty:

```typescript
            {/* Approval Status - chỉ hiện với teacher/admin */}
            {canManage && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Status</label>
                <div className={styles.checkboxContainer}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.isApproved === false}
                      onChange={() => {
                        setFilters({
                          isApproved: filters.isApproved === false ? null : false
                        });
                      }}
                      className={styles.checkbox}
                    />
                    <span>Pending Approval</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.isApproved === true}
                      onChange={() => {
                        setFilters({
                          isApproved: filters.isApproved === true ? null : true
                        });
                      }}
                      className={styles.checkbox}
                    />
                    <span>Approved</span>
                  </label>
                </div>
              </div>
            )}
```

- [ ] **Step 5: Update fetchQuestions để truyền isApproved filter**

Tìm `fetchQuestions` trong store (line 224-264), đảm bảo `isApproved` filter được truyền:

Trong `mergedParams`, kiểm tra `filters.isApproved !== null` và truyền lên backend.

---

### Task 8: Write Frontend Permission Hook Tests

**Files:**
- Create: `client/web/src/__tests__/hooks/useQuestionPermissions.test.ts`

- [ ] **Step 1: Tạo test file**

```typescript
import { renderHook } from '@testing-library/react';
import { useQuestionPermissions } from '../hooks/useQuestionPermissions';
import { useAuthStore } from '../presentation/store/authStore';

// Helper để set user trong auth store
const setupAuth = (user: any) => {
  useAuthStore.setState({ user });
};

describe('useQuestionPermissions', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('no user should have no permissions', () => {
    setupAuth(null);
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(false);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canViewAnswers).toBe(false);
  });

  it('student should have view but not create permissions', () => {
    setupAuth({ id: 's1', role: 'student' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canViewAnswers).toBe(false);
    expect(result.current.canApprove).toBe(false);
  });

  it('teacher should have create and approve permissions', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canViewAnswers).toBe(true);
    expect(result.current.canApprove).toBe(true);
    expect(result.current.canEdit({ _id: 'q1', id: 'q1', createdBy: 't1' } as any)).toBe(true);
  });

  it('teacher should NOT edit question from other teacher', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canEdit({ _id: 'q1', id: 'q1', createdBy: 't2' } as any)).toBe(false);
  });

  it('admin should have all permissions', () => {
    setupAuth({ id: 'a1', role: 'admin' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canViewAnswers).toBe(true);
    expect(result.current.canApprove).toBe(true);
    expect(result.current.canEdit({ _id: 'q1', id: 'q1', createdBy: 't2' } as any)).toBe(true);
    expect(result.current.canDelete({ _id: 'q1', id: 'q1', createdBy: 't2' } as any)).toBe(true);
  });
});
```

---

## VERIFICATION TASKS

### Task 9: Backend Integration Verification

- [ ] **Step 1: Start backend server**

Run: `cd server && npm run dev`

- [ ] **Step 2: Test GET /questions với different roles**

Sử dụng Postman hoặc curl:

```bash
# Teacher A login → should see questions from School A
# Teacher B login → should see 0 questions (hoặc questions từ school B)
# Student login → should only see approved questions

# Test ownership: Teacher A sửa question của mình → OK
# Test ownership: Teacher B sửa question của Teacher A → 403
# Test delete: Teacher A xóa question chưa dùng → OK
# Test delete: Teacher A xóa question đã dùng → 400
```

- [ ] **Step 3: Test answer visibility**

```bash
# Teacher get question → should see isCorrect=true
# Student get question → should NOT see isCorrect
```

### Task 10: Frontend Verification

- [ ] **Step 1: Start frontend dev server**

Run: `cd client/web && npm run dev`

- [ ] **Step 2: Verify UI changes**

1. Login as **Student**:
   - Không thấy button "Add Question"
   - Không thấy badge "Correct Answer"
   - Không thấy filter "Pending Approval"

2. Login as **Teacher**:
   - Thấy button "Add Question"
   - Thấy badge "Correct Answer"
   - Thấy filter "Pending Approval"
   - Không thể sửa câu hỏi của teacher khác (nếu có nút edit)

3. Login as **Admin**:
   - Thấy button "Add Question"
   - Thấy badge "Correct Answer"
   - Có thể sửa mọi câu hỏi

---

## SELF-REVIEW CHECKLIST

Sau khi implement xong, verify:

- [ ] `schoolId` field đã được thêm vào Question model
- [ ] Service `buildRoleFilter` đúng cho tất cả 3 roles
- [ ] `getAll` filter đúng theo role
- [ ] `getById` ẩn `isCorrect` với student
- [ ] `create` gán `schoolId` và `isApproved=false` cho teacher
- [ ] `update` có ownership check
- [ ] `delete` có ownership + usage check
- [ ] `approve` có school check
- [ ] Controller truyền đủ `user`, `schoolId`, `role`
- [ ] Frontend permission hook đúng
- [ ] Frontend ẩn correct answer badge với student
- [ ] Frontend ẩn Add Question button với student
- [ ] Tất cả tests pass
- [ ] Backend chạy không lỗi
- [ ] Frontend chạy không lỗi

---

## Migration Note

Sau khi deploy, chạy script migration để gán schoolId cho questions hiện có:

```javascript
// migration script
db.questions.find({ schoolId: { $exists: false } }).forEach(q => {
  db.questions.updateOne(
    { _id: q._id },
    { $set: { schoolId: null } }
  );
});
```

Hoặc gán schoolId mặc định cho tất cả.
