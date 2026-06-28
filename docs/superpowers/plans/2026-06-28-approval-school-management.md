# Approval & School Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chức năng School-Admin approve câu hỏi & giáo viên, và Admin quản lý trường học.

**Architecture:** Backend thêm các model fields mới, service methods, controller endpoints. Frontend thêm pages, stores, API services cho approval và school management.

**Tech Stack:** Node.js/Express backend, React/TypeScript frontend, MongoDB.

---

## Phase 1: Backend Models

### Task 1.1: Update User Model

**Files:**
- Modify: `server/src/models/user.model.js`

**Steps:**

- [ ] **Step 1: Read current user model**

```javascript
// Current fields (line ~80):
isActive: {
  type: Boolean,
  default: true,
},
```

- [ ] **Step 2: Add new fields after isActive**

```javascript
registrationStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved'
},
rejectedReason: {
  type: String,
  default: null
},
registeredSchoolId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  default: null
},
```

- [ ] **Step 3: Commit**

```bash
git add server/src/models/user.model.js
git commit -m "feat: add registrationStatus to User model for teacher approval"
```

---

### Task 1.2: Update School Model

**Files:**
- Modify: `server/src/models/school.model.js`

**Steps:**

- [ ] **Step 1: Read current school model**

```javascript
// Current fields (line ~150):
isActive: {
  type: Boolean,
  default: true,
},
```

- [ ] **Step 2: Add new fields after isActive**

```javascript
registrationStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved'
},
approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
rejectedReason: {
  type: String,
  default: null
},
```

- [ ] **Step 3: Commit**

```bash
git add server/src/models/school.model.js
git commit -m "feat: add registrationStatus to School model for school approval"
```

---

## Phase 2: Backend Services

### Task 2.1: Update Question Service - Add reject method

**Files:**
- Modify: `server/src/services/question.service.js`

**Steps:**

- [ ] **Step 1: Read current question service (around line 230)**

```javascript
async approve(id, approverId, approverSchoolId, approverRole) {
  // existing code
}
```

- [ ] **Step 2: Add reject method after approve method**

```javascript
async reject(id, rejecterId, rejecterSchoolId, rejecterRole, reason = null) {
  const question = await Question.findById(id);
  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  // Chỉ admin hoặc teacher cùng trường được từ chối
  if (rejecterRole !== 'admin') {
    if (!rejecterSchoolId || question.schoolId?.toString() !== rejecterSchoolId.toString()) {
      throw new ApiError(403, 'Bạn không có quyền từ chối câu hỏi này');
    }
  }

  const uid = rejecterId ? (rejecterId.toString ? rejecterId.toString() : String(rejecterId)) : null;
  const updated = await Question.findByIdAndUpdate(
    id,
    { isApproved: false, rejectedReason: reason, rejectedBy: uid, rejectedAt: new Date() },
    { new: true }
  );
  return updated;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/question.service.js
git commit -m "feat: add reject method to QuestionService"
```

---

### Task 2.2: Update User Service - Add teacher approval methods

**Files:**
- Modify: `server/src/services/user.service.js`

**Steps:**

- [ ] **Step 1: Read current user service**

```javascript
// Add after changePassword method (around line 100)
```

- [ ] **Step 2: Add new methods for teacher approval**

```javascript
/**
 * Get pending teachers for a school
 */
const getPendingTeachers = async (schoolId, options = {}) => {
  const filter = {
    role: 'teacher',
    registrationStatus: 'pending',
    registeredSchoolId: schoolId,
  };
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Approve a teacher (assign to school)
 */
const approveTeacher = async (userId, schoolId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }

  // Check if registeredSchoolId matches
  if (user.registeredSchoolId?.toString() !== schoolId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Giáo viên không đăng ký vào trường này');
  }

  user.registrationStatus = 'approved';
  user.schoolId = schoolId;
  user.isActive = true;
  await user.save();
  return user;
};

/**
 * Reject a teacher
 */
const rejectTeacher = async (userId, schoolId, reason = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }

  user.registrationStatus = 'rejected';
  user.rejectedReason = reason;
  await user.save();
  return user;
};

/**
 * Get school admins for a school
 */
const getSchoolAdmins = async (schoolId, options = {}) => {
  const filter = {
    role: 'school-admin',
    schoolId: schoolId,
    isActive: true,
  };
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Add a school admin to a school
 */
const addSchoolAdmin = async (schoolId, userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role !== 'school-admin') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Người dùng phải có role school-admin');
  }

  user.schoolId = schoolId;
  user.registrationStatus = 'approved';
  await user.save();
  return user;
};

/**
 * Remove a school admin from a school
 */
const removeSchoolAdmin = async (schoolId, userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if this is the last admin
  const adminCount = await User.countDocuments({ role: 'school-admin', schoolId: schoolId, isActive: true });
  if (adminCount <= 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Không thể xóa school-admin cuối cùng của trường');
  }

  user.schoolId = null;
  await user.save();
  return user;
};
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  changePassword,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  getSchoolAdmins,
  addSchoolAdmin,
  removeSchoolAdmin,
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/user.service.js
git commit -m "feat: add teacher approval methods to UserService"
```

---

### Task 2.3: Update School Service - Add school approval methods

**Files:**
- Modify: `server/src/services/school.service.js`

**Steps:**

- [ ] **Step 1: Read current school service**

```javascript
// Add after getAvailableTeachers method (around line 121)
```

- [ ] **Step 2: Add new methods for school approval**

```javascript
/**
 * Get pending schools (for admin)
 */
async getPendingSchools(options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = options;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const filter = { registrationStatus: 'pending' };

  const [results, total] = await Promise.all([
    School.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum),
    School.countDocuments(filter),
  ]);

  return {
    results,
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
  };
}

/**
 * Approve a school
 */
async approveSchool(schoolId, adminId) {
  const school = await School.findById(schoolId);
  if (!school) {
    throw new ApiError(httpStatus.NOT_FOUND, 'School not found');
  }

  if (school.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Trường không trong trạng thái chờ duyệt');
  }

  school.registrationStatus = 'approved';
  school.approvedBy = adminId;
  school.isActive = true;
  await school.save();
  return school;
}

/**
 * Reject a school
 */
async rejectSchool(schoolId, reason = null, adminId = null) {
  const school = await School.findById(schoolId);
  if (!school) {
    throw new ApiError(httpStatus.NOT_FOUND, 'School not found');
  }

  if (school.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Trường không trong trạng thái chờ duyệt');
  }

  school.registrationStatus = 'rejected';
  school.rejectedReason = reason;
  await school.save();
  return school;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/school.service.js
git commit -m "feat: add school approval methods to SchoolService"
```

---

## Phase 3: Backend Controllers

### Task 3.1: Update Question Controller - Add reject endpoint

**Files:**
- Modify: `server/src/controllers/question.controller.js`

**Steps:**

- [ ] **Step 1: Read current controller**

```javascript
// Add after approve method (around line 45)
```

- [ ] **Step 2: Add reject method**

```javascript
const reject = catchAsync(async (req, res) => {
  const { reason } = req.body || {};
  const question = await questionService.reject(
    req.params.id,
    req.user.id,
    req.user.schoolId,
    req.user.role,
    reason
  );
  res.send(question);
});
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = {
  create,
  getAll,
  getById,
  update,
  approve,
  reject,
  remove,
  generate,
  generateSimilar,
  getTags,
  getBankStats,
  getByTags,
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/question.controller.js
git commit -m "feat: add reject endpoint to QuestionController"
```

---

### Task 3.2: Update User Controller - Add approval endpoints

**Files:**
- Modify: `server/src/controllers/user.controller.js`

**Steps:**

- [ ] **Step 1: Read current controller**

```javascript
// Add after changePassword method (around line 50)
```

- [ ] **Step 2: Add new controller methods**

```javascript
const getPendingTeachers = catchAsync(async (req, res) => {
  if (req.user.role !== 'school-admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getPendingTeachers(req.user.schoolId, options);
  res.send(result);
});

const approveTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'school-admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này');
  }
  const user = await userService.approveTeacher(req.params.userId, req.user.schoolId);
  res.send(user);
});

const rejectTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'school-admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này');
  }
  const { reason } = req.body || {};
  const user = await userService.rejectTeacher(req.params.userId, req.user.schoolId, reason);
  res.send(user);
});

const getSchoolAdmins = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền xem danh sách school-admin');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getSchoolAdmins(req.params.schoolId, options);
  res.send(result);
});

const addSchoolAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền thêm school-admin');
  }
  const { userId } = req.body;
  const user = await userService.addSchoolAdmin(req.params.schoolId, userId);
  res.send(user);
});

const removeSchoolAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền xóa school-admin');
  }
  await userService.removeSchoolAdmin(req.params.schoolId, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changePassword,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  getSchoolAdmins,
  addSchoolAdmin,
  removeSchoolAdmin,
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/user.controller.js
git commit -m "feat: add teacher approval endpoints to UserController"
```

---

### Task 3.3: Update School Controller - Add approval endpoints

**Files:**
- Modify: `server/src/controllers/school.controller.js`

**Steps:**

- [ ] **Step 1: Read current controller**

```javascript
// Check current structure
```

- [ ] **Step 2: Add new controller methods**

```javascript
const getPendingSchools = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền xem trường chờ duyệt');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await schoolService.getPendingSchools(options);
  res.send(result);
});

const approveSchool = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền duyệt trường');
  }
  const school = await schoolService.approveSchool(req.params.id, req.user.id);
  res.send(school);
});

const rejectSchool = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền từ chối trường');
  }
  const { reason } = req.body || {};
  const school = await schoolService.rejectSchool(req.params.id, reason, req.user.id);
  res.send(school);
});
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getGradeDistribution,
  getAvailableTeachers,
  getPendingSchools,
  approveSchool,
  rejectSchool,
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/school.controller.js
git commit -m "feat: add school approval endpoints to SchoolController"
```

---

## Phase 4: Backend Routes

### Task 4.1: Update Question Routes - Add reject route

**Files:**
- Modify: `server/src/routes/v1/question.route.js`

**Steps:**

- [ ] **Step 1: Add reject route after approve route**

```javascript
router
  .route('/:id/reject')
  .post(auth('manageQuestions'), validate(questionValidation.getQuestion), questionController.reject);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/v1/question.route.js
git commit -m "feat: add reject route for questions"
```

---

### Task 4.2: Update User Routes - Add approval routes

**Files:**
- Modify: `server/src/routes/v1/user.route.js`

**Steps:**

- [ ] **Step 1: Add approval routes after change-password route**

```javascript
router
  .route('/teachers/pending')
  .get(auth('getUsers'), userController.getPendingTeachers);

router
  .route('/:userId/approve')
  .post(auth('manageUsers'), userController.approveTeacher);

router
  .route('/:userId/reject')
  .post(auth('manageUsers'), userController.rejectTeacher);

router
  .route('/school-admin/:schoolId')
  .get(auth('admin'), userController.getSchoolAdmins);

router
  .route('/school-admin/:schoolId')
  .post(auth('admin'), userController.addSchoolAdmin);

router
  .route('/school-admin/:schoolId/:userId')
  .delete(auth('admin'), userController.removeSchoolAdmin);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/v1/user.route.js
git commit -m "feat: add teacher approval routes"
```

---

### Task 4.3: Update School Routes - Add approval routes

**Files:**
- Modify: `server/src/routes/v1/school.route.js`

**Steps:**

- [ ] **Step 1: Add approval routes after available-teachers route**

```javascript
router
  .route('/pending')
  .get(auth('admin'), schoolController.getPendingSchools);

router
  .route('/:id/approve')
  .post(auth('admin'), schoolController.approveSchool);

router
  .route('/:id/reject')
  .post(auth('admin'), schoolController.rejectSchool);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/v1/school.route.js
git commit -m "feat: add school approval routes"
```

---

## Phase 5: Frontend API Services

### Task 5.1: Create Approval Service

**Files:**
- Create: `client/web/src/services/approval.service.ts`

**Steps:**

- [ ] **Step 1: Create approval service**

```typescript
import api from './api';
import type { User, Question } from '../types';

export interface PendingQuestion {
  id: string;
  content: string;
  type: 'single_choice' | 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: { _id: string; name: string };
  createdAt: string;
}

export interface PendingTeacher {
  id: string;
  name: string;
  email: string;
  registeredSchoolId: string;
  createdAt: string;
}

export interface ApprovalResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const approvalService = {
  // === Questions ===
  getPendingQuestions: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApprovalResponse<PendingQuestion>>('/questions', {
      params: { ...params, isApproved: false },
    });
    return response.data;
  },

  approveQuestion: async (questionId: string) => {
    const response = await api.post<Question>(`/questions/${questionId}/approve`);
    return response.data;
  },

  rejectQuestion: async (questionId: string, reason?: string) => {
    const response = await api.post<Question>(`/questions/${questionId}/reject`, { reason });
    return response.data;
  },

  // === Teachers ===
  getPendingTeachers: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApprovalResponse<PendingTeacher>>('/users/teachers/pending', { params });
    return response.data;
  },

  approveTeacher: async (userId: string) => {
    const response = await api.post<User>(`/users/${userId}/approve`);
    return response.data;
  },

  rejectTeacher: async (userId: string, reason?: string) => {
    const response = await api.post<User>(`/users/${userId}/reject`, { reason });
    return response.data;
  },
};

export default approvalService;
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/services/approval.service.ts
git commit -m "feat: create approval service for frontend"
```

---

### Task 5.2: Create School Management Service

**Files:**
- Create: `client/web/src/services/schoolManagement.service.ts`

**Steps:**

- [ ] **Step 1: Create school management service**

```typescript
import api from './api';
import type { School } from '../types';

export interface PendingSchool {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
  };
  createdAt: string;
}

export interface SchoolAdmin {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const schoolManagementService = {
  // === Schools ===
  getAllSchools: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get<PaginatedResponse<School>>('/schools', { params });
    return response.data;
  },

  getPendingSchools: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<PaginatedResponse<PendingSchool>>('/schools/pending', { params });
    return response.data;
  },

  getSchoolById: async (schoolId: string) => {
    const response = await api.get<School>(`/schools/${schoolId}`);
    return response.data;
  },

  createSchool: async (data: Partial<School>) => {
    const response = await api.post<School>('/schools', data);
    return response.data;
  },

  updateSchool: async (schoolId: string, data: Partial<School>) => {
    const response = await api.patch<School>(`/schools/${schoolId}`, data);
    return response.data;
  },

  deleteSchool: async (schoolId: string) => {
    await api.delete(`/schools/${schoolId}`);
  },

  approveSchool: async (schoolId: string) => {
    const response = await api.post<School>(`/schools/${schoolId}/approve`);
    return response.data;
  },

  rejectSchool: async (schoolId: string, reason?: string) => {
    const response = await api.post<School>(`/schools/${schoolId}/reject`, { reason });
    return response.data;
  },

  // === School Admins ===
  getSchoolAdmins: async (schoolId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get<PaginatedResponse<SchoolAdmin>>(`/users/school-admin/${schoolId}`, { params });
    return response.data;
  },

  addSchoolAdmin: async (schoolId: string, userId: string) => {
    const response = await api.post<SchoolAdmin>(`/users/school-admin/${schoolId}`, { userId });
    return response.data;
  },

  removeSchoolAdmin: async (schoolId: string, userId: string) => {
    await api.delete(`/users/school-admin/${schoolId}/${userId}`);
  },
};

export default schoolManagementService;
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/services/schoolManagement.service.ts
git commit -m "feat: create school management service for frontend"
```

---

## Phase 6: Frontend Stores

### Task 6.1: Create Approval Store

**Files:**
- Create: `client/web/src/presentation/store/approvalStore.ts`

**Steps:**

- [ ] **Step 1: Create approval store**

```typescript
import { create } from 'zustand';
import approvalService, { PendingQuestion, PendingTeacher } from '../../services/approval.service';

interface ApprovalState {
  pendingQuestions: PendingQuestion[];
  pendingTeachers: PendingTeacher[];
  isLoadingQuestions: boolean;
  isLoadingTeachers: boolean;
  error: string | null;
  
  // Actions
  fetchPendingQuestions: () => Promise<void>;
  fetchPendingTeachers: () => Promise<void>;
  approveQuestion: (questionId: string) => Promise<void>;
  rejectQuestion: (questionId: string, reason?: string) => Promise<void>;
  approveTeacher: (userId: string) => Promise<void>;
  rejectTeacher: (userId: string, reason?: string) => Promise<void>;
  clearError: () => void;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  pendingQuestions: [],
  pendingTeachers: [],
  isLoadingQuestions: false,
  isLoadingTeachers: false,
  error: null,

  fetchPendingQuestions: async () => {
    set({ isLoadingQuestions: true, error: null });
    try {
      const data = await approvalService.getPendingQuestions();
      set({ pendingQuestions: data.results, isLoadingQuestions: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch pending questions', isLoadingQuestions: false });
    }
  },

  fetchPendingTeachers: async () => {
    set({ isLoadingTeachers: true, error: null });
    try {
      const data = await approvalService.getPendingTeachers();
      set({ pendingTeachers: data.results, isLoadingTeachers: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch pending teachers', isLoadingTeachers: false });
    }
  },

  approveQuestion: async (questionId: string) => {
    try {
      await approvalService.approveQuestion(questionId);
      set({
        pendingQuestions: get().pendingQuestions.filter(q => q.id !== questionId)
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve question' });
      throw err;
    }
  },

  rejectQuestion: async (questionId: string, reason?: string) => {
    try {
      await approvalService.rejectQuestion(questionId, reason);
      set({
        pendingQuestions: get().pendingQuestions.filter(q => q.id !== questionId)
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject question' });
      throw err;
    }
  },

  approveTeacher: async (userId: string) => {
    try {
      await approvalService.approveTeacher(userId);
      set({
        pendingTeachers: get().pendingTeachers.filter(t => t.id !== userId)
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve teacher' });
      throw err;
    }
  },

  rejectTeacher: async (userId: string, reason?: string) => {
    try {
      await approvalService.rejectTeacher(userId, reason);
      set({
        pendingTeachers: get().pendingTeachers.filter(t => t.id !== userId)
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject teacher' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/presentation/store/approvalStore.ts
git commit -m "feat: create approval store for state management"
```

---

### Task 6.2: Create School Management Store

**Files:**
- Create: `client/web/src/presentation/store/schoolManagementStore.ts`

**Steps:**

- [ ] **Step 1: Create school management store**

```typescript
import { create } from 'zustand';
import schoolManagementService, { PendingSchool, SchoolAdmin, School } from '../../services/schoolManagement.service';

interface SchoolManagementState {
  schools: School[];
  pendingSchools: PendingSchool[];
  schoolAdmins: SchoolAdmin[];
  selectedSchool: School | null;
  isLoading: boolean;
  error: string | null;
  totalPending: number;
  totalSchools: number;

  // Actions
  fetchSchools: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
  fetchPendingSchools: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchSchoolAdmins: (schoolId: string) => Promise<void>;
  createSchool: (data: Partial<School>) => Promise<void>;
  updateSchool: (schoolId: string, data: Partial<School>) => Promise<void>;
  deleteSchool: (schoolId: string) => Promise<void>;
  approveSchool: (schoolId: string) => Promise<void>;
  rejectSchool: (schoolId: string, reason?: string) => Promise<void>;
  addSchoolAdmin: (schoolId: string, userId: string) => Promise<void>;
  removeSchoolAdmin: (schoolId: string, userId: string) => Promise<void>;
  selectSchool: (school: School | null) => void;
  clearError: () => void;
}

export const useSchoolManagementStore = create<SchoolManagementState>((set, get) => ({
  schools: [],
  pendingSchools: [],
  schoolAdmins: [],
  selectedSchool: null,
  isLoading: false,
  error: null,
  totalPending: 0,
  totalSchools: 0,

  fetchSchools: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await schoolManagementService.getAllSchools(params);
      set({ schools: data.results, totalSchools: data.total, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch schools', isLoading: false });
    }
  },

  fetchPendingSchools: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await schoolManagementService.getPendingSchools(params);
      set({ pendingSchools: data.results, totalPending: data.total, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch pending schools', isLoading: false });
    }
  },

  fetchSchoolAdmins: async (schoolId: string) => {
    try {
      const data = await schoolManagementService.getSchoolAdmins(schoolId);
      set({ schoolAdmins: data.results });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch school admins' });
    }
  },

  createSchool: async (data: Partial<School>) => {
    try {
      await schoolManagementService.createSchool(data);
      await get().fetchSchools();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create school' });
      throw err;
    }
  },

  updateSchool: async (schoolId: string, data: Partial<School>) => {
    try {
      await schoolManagementService.updateSchool(schoolId, data);
      await get().fetchSchools();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update school' });
      throw err;
    }
  },

  deleteSchool: async (schoolId: string) => {
    try {
      await schoolManagementService.deleteSchool(schoolId);
      set({ schools: get().schools.filter(s => s.id !== schoolId) });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete school' });
      throw err;
    }
  },

  approveSchool: async (schoolId: string) => {
    try {
      await schoolManagementService.approveSchool(schoolId);
      set({
        pendingSchools: get().pendingSchools.filter(s => s.id !== schoolId),
        totalPending: get().totalPending - 1
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve school' });
      throw err;
    }
  },

  rejectSchool: async (schoolId: string, reason?: string) => {
    try {
      await schoolManagementService.rejectSchool(schoolId, reason);
      set({
        pendingSchools: get().pendingSchools.filter(s => s.id !== schoolId),
        totalPending: get().totalPending - 1
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject school' });
      throw err;
    }
  },

  addSchoolAdmin: async (schoolId: string, userId: string) => {
    try {
      await schoolManagementService.addSchoolAdmin(schoolId, userId);
      await get().fetchSchoolAdmins(schoolId);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to add school admin' });
      throw err;
    }
  },

  removeSchoolAdmin: async (schoolId: string, userId: string) => {
    try {
      await schoolManagementService.removeSchoolAdmin(schoolId, userId);
      set({ schoolAdmins: get().schoolAdmins.filter(a => a.id !== userId) });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to remove school admin' });
      throw err;
    }
  },

  selectSchool: (school: School | null) => set({ selectedSchool: school }),

  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add client/web/src/presentation/store/schoolManagementStore.ts
git commit -m "feat: create school management store"
```

---

## Phase 7: Frontend Pages

### Task 7.1: Create School-Admin Approval Page

**Files:**
- Create: `client/web/src/pages/ApprovalPage.tsx`
- Create: `client/web/src/pages/approval/QuestionApprovalSection.tsx`
- Create: `client/web/src/pages/approval/TeacherApprovalSection.tsx`
- Create: `client/web/src/pages/approval/ApprovalPage.module.css`

**Steps:**

- [ ] **Step 1: Create QuestionApprovalSection component**

```typescript
import { useEffect, useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { useApprovalStore } from '../../presentation/store/approvalStore';
import ConfirmDialog from '../../presentation/components/shared/ConfirmDialog';
import styles from './ApprovalSection.module.css';

export default function QuestionApprovalSection() {
  const {
    pendingQuestions,
    isLoadingQuestions,
    fetchPendingQuestions,
    approveQuestion,
    rejectQuestion
  } = useApprovalStore();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingQuestions();
  }, [fetchPendingQuestions]);

  const handleApprove = async (questionId: string) => {
    setProcessing(true);
    try {
      await approveQuestion(questionId);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (questionId: string) => {
    setSelectedQuestionId(questionId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedQuestionId) return;
    setProcessing(true);
    try {
      await rejectQuestion(selectedQuestionId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedQuestionId(null);
    } finally {
      setProcessing(false);
    }
  };

  if (isLoadingQuestions) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  if (pendingQuestions.length === 0) {
    return (
      <div className={styles.empty}>
        <Clock size={48} />
        <p>Không có câu hỏi nào đang chờ duyệt</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.list}>
        {pendingQuestions.map((question) => (
          <div key={question.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.badge} ${styles[question.difficulty]}`}>
                {question.difficulty}
              </span>
              <span className={styles.type}>
                {question.type === 'single_choice' ? 'Một đáp án' : 'Nhiều đáp án'}
              </span>
            </div>
            <div className={styles.cardContent}>
              <p>{question.content}</p>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.author}>
                Người tạo: {question.createdBy?.name || 'N/A'}
              </span>
              <div className={styles.actions}>
                <button
                  className={styles.btnApprove}
                  onClick={() => handleApprove(question.id)}
                  disabled={processing}
                >
                  <Check size={16} />
                  Duyệt
                </button>
                <button
                  className={styles.btnReject}
                  onClick={() => handleRejectClick(question.id)}
                  disabled={processing}
                >
                  <X size={16} />
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="Từ chối câu hỏi"
        message="Bạn có chắc chắn muốn từ chối câu hỏi này?"
        confirmText="Từ chối"
        cancelText="Hủy"
      >
        <div className={styles.rejectForm}>
          <label>Lý do từ chối (tùy chọn):</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối..."
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
```

- [ ] **Step 2: Create TeacherApprovalSection component**

```typescript
import { useEffect, useState } from 'react';
import { Check, X, Clock, Mail, User } from 'lucide-react';
import { useApprovalStore } from '../../presentation/store/approvalStore';
import ConfirmDialog from '../../presentation/components/shared/ConfirmDialog';
import styles from './ApprovalSection.module.css';

export default function TeacherApprovalSection() {
  const {
    pendingTeachers,
    isLoadingTeachers,
    fetchPendingTeachers,
    approveTeacher,
    rejectTeacher
  } = useApprovalStore();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingTeachers();
  }, [fetchPendingTeachers]);

  const handleApprove = async (teacherId: string) => {
    setProcessing(true);
    try {
      await approveTeacher(teacherId);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedTeacherId) return;
    setProcessing(true);
    try {
      await rejectTeacher(selectedTeacherId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedTeacherId(null);
    } finally {
      setProcessing(false);
    }
  };

  if (isLoadingTeachers) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  if (pendingTeachers.length === 0) {
    return (
      <div className={styles.empty}>
        <Clock size={48} />
        <p>Không có giáo viên nào đang chờ duyệt</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.list}>
        {pendingTeachers.map((teacher) => (
          <div key={teacher.id} className={styles.teacherCard}>
            <div className={styles.teacherAvatar}>
              <User size={32} />
            </div>
            <div className={styles.teacherInfo}>
              <h4>{teacher.name}</h4>
              <p><Mail size={14} /> {teacher.email}</p>
            </div>
            <div className={styles.teacherActions}>
              <button
                className={styles.btnApprove}
                onClick={() => handleApprove(teacher.id)}
                disabled={processing}
              >
                <Check size={16} />
                Duyệt
              </button>
              <button
                className={styles.btnReject}
                onClick={() => handleRejectClick(teacher.id)}
                disabled={processing}
              >
                <X size={16} />
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="Từ chối giáo viên"
        message="Bạn có chắc chắn muốn từ chối giáo viên này?"
        confirmText="Từ chối"
        cancelText="Hủy"
      >
        <div className={styles.rejectForm}>
          <label>Lý do từ chối (tùy chọn):</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối..."
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
```

- [ ] **Step 3: Create main ApprovalPage**

```typescript
import { useState, useEffect } from 'react';
import { useAuthStore } from '../presentation/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useApprovalStore } from '../presentation/store/approvalStore';
import QuestionApprovalSection from './approval/QuestionApprovalSection';
import TeacherApprovalSection from './approval/TeacherApprovalSection';
import styles from './approval/ApprovalPage.module.css';

export default function ApprovalPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { pendingQuestions, pendingTeachers, fetchPendingQuestions, fetchPendingTeachers } = useApprovalStore();
  const [activeTab, setActiveTab] = useState<'questions' | 'teachers'>('questions');

  useEffect(() => {
    if (!user || user.role !== 'school-admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchPendingQuestions();
    fetchPendingTeachers();
  }, [user, navigate, fetchPendingQuestions, fetchPendingTeachers]);

  const totalPending = pendingQuestions.length + pendingTeachers.length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Phê duyệt</h1>
        {totalPending > 0 && (
          <span className={styles.badge}>{totalPending} chờ xử lý</span>
        )}
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'questions' ? styles.active : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Câu hỏi
          {pendingQuestions.length > 0 && (
            <span className={styles.tabBadge}>{pendingQuestions.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'teachers' ? styles.active : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          Giáo viên
          {pendingTeachers.length > 0 && (
            <span className={styles.tabBadge}>{pendingTeachers.length}</span>
          )}
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'questions' ? (
          <QuestionApprovalSection />
        ) : (
          <TeacherApprovalSection />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CSS files (simplified)**

```css
/* ApprovalPage.module.css */
.page {
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #1a1a1a;
}

.badge {
  background: #ef4444;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
}

.tab:hover {
  background: #f3f4f6;
}

.tab.active {
  color: #4f46e5;
  font-weight: 500;
}

.tabBadge {
  background: #4f46e5;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* ApprovalSection.module.css */
.section {
  min-height: 300px;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #6b7280;
  gap: 12px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card, .teacherCard {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.badge.easy { background: #22c55e; color: white; }
.badge.medium { background: #f59e0b; color: white; }
.badge.hard { background: #ef4444; color: white; }

.type {
  color: #6b7280;
  font-size: 13px;
}

.cardContent {
  margin-bottom: 12px;
}

.cardContent p {
  margin: 0;
  color: #1a1a1a;
}

.cardFooter, .teacherCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author {
  color: #6b7280;
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btnApprove, .btnReject {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.btnApprove {
  background: #22c55e;
  color: white;
}

.btnApprove:hover { background: #16a34a; }

.btnReject {
  background: #ef4444;
  color: white;
}

.btnReject:hover { background: #dc2626; }

.teacherCard {
  display: flex;
  align-items: center;
  gap: 16px;
}

.teacherAvatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.teacherInfo {
  flex: 1;
}

.teacherInfo h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
}

.teacherInfo p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.rejectForm {
  padding: 16px 0;
}

.rejectForm label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #374151;
}

.rejectForm textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: vertical;
  font-size: 14px;
}
```

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/ApprovalPage.tsx client/web/src/pages/approval/
git commit -m "feat: create school-admin approval page"
```

---

### Task 7.2: Create Admin Schools Management Page

**Files:**
- Create: `client/web/src/pages/admin/SchoolsPage.tsx`
- Create: `client/web/src/pages/admin/SchoolsPage.module.css`

**Steps:**

- [ ] **Step 1: Create SchoolsPage component**

```typescript
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../presentation/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useSchoolManagementStore } from '../../presentation/store/schoolManagementStore';
import { Building2, Check, X, Plus, Edit, Trash2, Users, Clock } from 'lucide-react';
import ConfirmDialog from '../../presentation/components/shared/ConfirmDialog';
import DataTable from '../../presentation/components/shared/DataTable';
import styles from './SchoolsPage.module.css';

export default function SchoolsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const {
    schools,
    pendingSchools,
    isLoading,
    fetchSchools,
    fetchPendingSchools,
    approveSchool,
    rejectSchool,
    deleteSchool,
    totalPending
  } = useSchoolManagementStore();

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchSchools();
    fetchPendingSchools();
  }, [user, navigate, fetchSchools, fetchPendingSchools]);

  const handleDeleteClick = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchoolId) return;
    setProcessing(true);
    try {
      await deleteSchool(selectedSchoolId);
      setDeleteDialogOpen(false);
      setSelectedSchoolId(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedSchoolId) return;
    setProcessing(true);
    try {
      await rejectSchool(selectedSchoolId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedSchoolId(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveSchool = async (schoolId: string) => {
    setProcessing(true);
    try {
      await approveSchool(schoolId);
      await fetchSchools();
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Tên trường',
      render: (school: any) => (
        <div className={styles.schoolCell}>
          <Building2 size={18} />
          <div>
            <strong>{school.name}</strong>
            <span>{school.code}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Địa chỉ',
      render: (school: any) => {
        const addr = school.address;
        return addr ? `${addr.street || ''}, ${addr.ward || ''}, ${addr.district || ''}` : '-';
      },
    },
    {
      key: 'contact',
      label: 'Liên hệ',
      render: (school: any) => (
        <div className={styles.contactCell}>
          {school.email && <span>{school.email}</span>}
          {school.phone && <span>{school.phone}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (school: any) => (
        <span className={`${styles.status} ${school.isActive ? styles.active : styles.inactive}`}>
          {school.isActive ? 'Hoạt động' : 'Không hoạt động'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (school: any) => (
        <div className={styles.actions}>
          <button className={styles.btnEdit} title="Sửa">
            <Edit size={16} />
          </button>
          <button
            className={styles.btnDelete}
            title="Xóa"
            onClick={() => handleDeleteClick(school.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Quản lý Trường học</h1>
        <button className={styles.btnPrimary}>
          <Plus size={18} />
          Thêm trường
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Building2 size={16} />
          Tất cả trường ({schools.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} />
          Chờ duyệt
          {totalPending > 0 && <span className={styles.tabBadge}>{totalPending}</span>}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Đang tải...</div>
        ) : activeTab === 'all' ? (
          <DataTable columns={columns} data={schools} />
        ) : (
          <div className={styles.pendingList}>
            {pendingSchools.length === 0 ? (
              <div className={styles.empty}>
                <Clock size={48} />
                <p>Không có trường nào đang chờ duyệt</p>
              </div>
            ) : (
              pendingSchools.map((school) => (
                <div key={school.id} className={styles.pendingCard}>
                  <div className={styles.pendingInfo}>
                    <h3>{school.name}</h3>
                    <p>Mã: {school.code}</p>
                    <p>{school.email}</p>
                    <p>{school.phone}</p>
                  </div>
                  <div className={styles.pendingActions}>
                    <button
                      className={styles.btnApprove}
                      onClick={() => handleApproveSchool(school.id)}
                      disabled={processing}
                    >
                      <Check size={16} />
                      Duyệt
                    </button>
                    <button
                      className={styles.btnReject}
                      onClick={() => handleRejectClick(school.id)}
                      disabled={processing}
                    >
                      <X size={16} />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xóa trường học"
        message="Bạn có chắc chắn muốn xóa trường học này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
      />

      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="Từ chối trường học"
        message="Bạn có chắc chắn muốn từ chối trường học này?"
        confirmText="Từ chối"
        cancelText="Hủy"
      >
        <div className={styles.rejectForm}>
          <label>Lý do từ chối (tùy chọn):</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối..."
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
```

- [ ] **Step 2: Create CSS file**

```css
/* SchoolsPage.module.css - Simplified */
.page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #1a1a1a;
}

.btnPrimary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btnPrimary:hover { background: #4338ca; }

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  border-radius: 8px;
}

.tab:hover { background: #f3f4f6; }
.tab.active { background: #eef2ff; color: #4f46e5; font-weight: 500; }

.tabBadge {
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #6b7280;
  gap: 12px;
}

.schoolCell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schoolCell div {
  display: flex;
  flex-direction: column;
}

.schoolCell strong {
  font-size: 14px;
  color: #1a1a1a;
}

.schoolCell span {
  font-size: 12px;
  color: #6b7280;
}

.contactCell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: #6b7280;
}

.status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status.active {
  background: #dcfce7;
  color: #166534;
}

.status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  gap: 8px;
}

.btnEdit, .btnDelete {
  padding: 6px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #f3f4f6;
  color: #6b7280;
}

.btnEdit:hover { background: #e5e7eb; color: #4f46e5; }
.btnDelete:hover { background: #fee2e2; color: #ef4444; }

.pendingList {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pendingCard {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.pendingInfo h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.pendingInfo p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.pendingActions {
  display: flex;
  gap: 8px;
}

.btnApprove {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btnApprove:hover { background: #16a34a; }

.btnReject {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btnReject:hover { background: #dc2626; }

.rejectForm {
  padding: 16px 0;
}

.rejectForm label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #374151;
}

.rejectForm textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: vertical;
  font-size: 14px;
}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/admin/SchoolsPage.tsx client/web/src/pages/admin/SchoolsPage.module.css
git commit -m "feat: create admin schools management page"
```

---

## Phase 8: Routing

### Task 8.1: Update App Routes

**Files:**
- Modify: `client/web/src/presentation/routes/AppRoutes.tsx`

**Steps:**

- [ ] **Step 1: Read current routes**

```typescript
// Check current route structure
```

- [ ] **Step 2: Add new routes**

```typescript
// Import new pages
import ApprovalPage from '../../pages/ApprovalPage';
import SchoolsPage from '../../pages/admin/SchoolsPage';

// Add routes in appropriate places
{
  path: '/approval',
  element: <ApprovalPage />,
  roles: ['school-admin'],
},
{
  path: '/admin/schools',
  element: <SchoolsPage />,
  roles: ['admin'],
},
```

- [ ] **Step 3: Update sidebar navigation**

```typescript
// Add to sidebar items for school-admin
{
  path: '/approval',
  label: 'Phê duyệt',
  icon: CheckCircle,
}

// Add to sidebar items for admin
{
  path: '/admin/schools',
  label: 'Trường học',
  icon: Building2,
}
```

- [ ] **Step 4: Commit**

```bash
git add client/web/src/presentation/routes/AppRoutes.tsx
git commit -m "feat: add routes for approval and school management pages"
```

---

## Phase 9: Integration & Testing

### Task 9.1: Update RoleDashboard for approval badges

**Files:**
- Modify: `client/web/src/presentation/components/RoleDashboard.tsx`

**Steps:**

- [ ] **Step 1: Read current RoleDashboard**

- [ ] **Step 2: Add approval KPIs for school-admin**

```typescript
// In the KPI grid section, after checking isSchoolAdmin:
{isSchoolAdmin && (
  <>
    <Kpi
      label="Câu hỏi chờ duyệt"
      value={pendingQuestionsCount}
      hint={pendingQuestionsCount > 0 ? 'Cần xử lý' : undefined}
    />
    <Kpi
      label="GV chờ duyệt"
      value={pendingTeachersCount}
      hint={pendingTeachersCount > 0 ? 'Cần xử lý' : undefined}
    />
  </>
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/presentation/components/RoleDashboard.tsx
git commit -m "feat: add approval KPIs to school-admin dashboard"
```

---

## Self-Review Checklist

After completing all tasks:

- [ ] **Spec coverage:** Check each section of the spec has corresponding implementation
  - User model: registrationStatus fields ✅
  - School model: registrationStatus fields ✅
  - Question approval: approve/reject ✅
  - Teacher approval: approve/reject ✅
  - School approval: approve/reject ✅
  - School CRUD: create/read/update/delete ✅
  - School admin management: add/remove ✅
  - Frontend pages: ApprovalPage, SchoolsPage ✅
  - Routing: new routes added ✅

- [ ] **Placeholder scan:** No "TBD", "TODO", incomplete sections

- [ ] **Type consistency:** Method names match across frontend and backend
  - `approveQuestion` → backend `/questions/:id/approve` ✅
  - `approveTeacher` → backend `/users/:userId/approve` ✅
  - `approveSchool` → backend `/schools/:id/approve` ✅

- [ ] **Error handling:** All async functions have try/catch

- [ ] **Permissions:** Routes check for correct roles (school-admin, admin)
