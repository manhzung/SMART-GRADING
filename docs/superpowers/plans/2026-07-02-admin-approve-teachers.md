# Admin Approve Teachers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow system admin to view and approve/reject pending teachers for any school from the SchoolDetailModal, with separate API endpoints and UI section.

**Architecture:** 3 new backend API endpoints under `/users/admin/teachers/*` for system admin only (separate from school-admin endpoints), with parallel 3 frontend service methods + store actions + `PendingTeachersSection` UI component embedded in `SchoolDetailModal`.

**Tech Stack:** Node.js/Express backend (Jest), React/TypeScript frontend (Vitest + React Testing Library)

---

## File Structure

```
server/src/services/user.service.js          MODIFY — add 3 admin methods
server/src/controllers/user.controller.js   MODIFY — add 3 controller methods + exports
server/src/routes/v1/user.route.js          MODIFY — add 3 routes BEFORE /:userId
server/tests/integration/user.adminApproval.test.js  CREATE
server/tests/unit/services/user.service.adminApproval.test.js  CREATE

client/web/src/services/approval.service.ts  MODIFY — add 3 admin service methods
client/web/src/presentation/store/approvalStore.ts  MODIFY — add admin state + actions
client/web/src/presentation/components/admin/SchoolDetailModal.tsx  MODIFY — add PendingTeachersSection
client/web/src/presentation/components/admin/SchoolDetailModal.module.css  MODIFY — add CSS
client/web/src/__tests__/services/approval.service.admin.test.ts  CREATE
client/web/src/__tests__/stores/approvalStore.admin.test.ts  CREATE
client/web/src/__tests__/components/PendingTeachersSection.test.tsx  CREATE
```

---

## Backend: Service Methods (TDD)

### Task 1: Write failing unit tests for `user.service.adminApproval.test.js`

**Files:**
- Create: `server/tests/unit/services/user.service.adminApproval.test.js`
- Reference: `server/tests/unit/services/notification.service.test.js` (pattern)

- [ ] **Step 1: Write the failing test — getPendingTeachersForSchool**

```javascript
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const { User } = require('../../../src/models');

setupTestDB();

const userService = require('../../../src/services/user.service');

describe('Admin Teacher Approval Service', () => {
  describe('getPendingTeachersForSchool', () => {
    it('returns paginated pending teachers for a specific school', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher A',
        email: 'ta@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      const result = await userService.getPendingTeachersForSchool(schoolId);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]._id.toString()).toBe(teacher._id.toString());
    });

    it('returns empty list when no pending teachers', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const result = await userService.getPendingTeachersForSchool(schoolId);
      expect(result.results).toHaveLength(0);
    });

    it('does not return teachers from other schools', async () => {
      const schoolA = new mongoose.Types.ObjectId();
      const schoolB = new mongoose.Types.ObjectId();
      await User.create({
        name: 'Teacher A',
        email: 'ta@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolA,
      });
      await User.create({
        name: 'Teacher B',
        email: 'tb@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolB,
      });
      const result = await userService.getPendingTeachersForSchool(schoolA);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Teacher A');
    });

    it('does not return approved or rejected teachers', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      await User.create({
        name: 'Teacher Pending',
        email: 'pending@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      await User.create({
        name: 'Teacher Approved',
        email: 'approved@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'approved',
        registeredSchoolId: schoolId,
      });
      await User.create({
        name: 'Teacher Rejected',
        email: 'rejected@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'rejected',
        registeredSchoolId: schoolId,
      });
      const result = await userService.getPendingTeachersForSchool(schoolId);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Teacher Pending');
    });

    it('supports pagination options', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      for (let i = 0; i < 5; i++) {
        await User.create({
          name: `Teacher ${i}`,
          email: `t${i}@example.com`,
          password: 'Password123',
          role: 'teacher',
          registrationStatus: 'pending',
          registeredSchoolId: schoolId,
        });
      }
      const result = await userService.getPendingTeachersForSchool(schoolId, { limit: 2, page: 1 });
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.pages).toBe(3);
    });
  });

  describe('adminApproveTeacher', () => {
    it('approves a pending teacher and assigns schoolId from registeredSchoolId', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
        isActive: false,
      });
      const result = await userService.adminApproveTeacher(teacher._id.toString());
      expect(result.registrationStatus).toBe('approved');
      expect(result.schoolId.toString()).toBe(schoolId.toString());
      expect(result.isActive).toBe(true);
    });

    it('throws 404 when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(userService.adminApproveTeacher(fakeId.toString()))
        .rejects.toThrow('User not found');
    });

    it('throws 400 when user is not a teacher', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'Password123',
        role: 'admin',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminApproveTeacher(admin._id.toString()))
        .rejects.toThrow('Chỉ có thể duyệt tài khoản giáo viên');
    });

    it('throws 400 when teacher is not pending', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'approved',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminApproveTeacher(teacher._id.toString()))
        .rejects.toThrow('Tài khoản không trong trạng thái chờ duyệt');
    });

    it('throws 400 when teacher has no registeredSchoolId', async () => {
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: null,
      });
      await expect(userService.adminApproveTeacher(teacher._id.toString()))
        .rejects.toThrow('Giáo viên chưa đăng ký vào trường nào');
    });
  });

  describe('adminRejectTeacher', () => {
    it('rejects a pending teacher with reason', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      const result = await userService.adminRejectTeacher(
        teacher._id.toString(),
        'Không đủ điều kiện'
      );
      expect(result.registrationStatus).toBe('rejected');
      expect(result.rejectedReason).toBe('Không đủ điều kiện');
    });

    it('rejects a pending teacher without reason', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      const result = await userService.adminRejectTeacher(teacher._id.toString());
      expect(result.registrationStatus).toBe('rejected');
      expect(result.rejectedReason).toBeNull();
    });

    it('throws 404 when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(userService.adminRejectTeacher(fakeId.toString()))
        .rejects.toThrow('User not found');
    });

    it('throws 400 when user is not a teacher', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const student = await User.create({
        name: 'Student',
        email: 'student@example.com',
        password: 'Password123',
        role: 'student',
        registrationStatus: 'pending',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminRejectTeacher(student._id.toString()))
        .rejects.toThrow('Chỉ có thể từ chối tài khoản giáo viên');
    });

    it('throws 400 when teacher is not pending', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacher = await User.create({
        name: 'Teacher',
        email: 'teacher@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'approved',
        registeredSchoolId: schoolId,
      });
      await expect(userService.adminRejectTeacher(teacher._id.toString()))
        .rejects.toThrow('Tài khoản không trong trạng thái chờ duyệt');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/unit/services/user.service.adminApproval.test.js --no-coverage 2>&1`
Expected: FAIL with "userService.getPendingTeachersForSchool is not a function"

- [ ] **Step 3: Write minimal implementation — add service methods to user.service.js**

Read `server/src/services/user.service.js` first. Add 3 new methods AFTER the existing `rejectTeacher` method and BEFORE the `module.exports`:

```javascript
// ── Admin Teacher Approval Methods ──────────────────────────────────────────────

/**
 * Get pending teachers for a specific school (used by admin to view any school's pending list)
 * @param {ObjectId|string} schoolId
 * @param {Object} options - pagination options
 */
const getPendingTeachersForSchool = async (schoolId, options = {}) => {
  const filter = {
    role: 'teacher',
    registrationStatus: 'pending',
    registeredSchoolId: schoolId,
  };
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Admin approve a teacher — uses the teacher's own registeredSchoolId (admin can approve any school's teachers)
 */
const adminApproveTeacher = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role !== 'teacher') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chỉ có thể duyệt tài khoản giáo viên');
  }
  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }
  if (!user.registeredSchoolId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Giáo viên chưa đăng ký vào trường nào');
  }
  user.registrationStatus = 'approved';
  user.schoolId = user.registeredSchoolId;
  user.isActive = true;
  await user.save();
  return user;
};

/**
 * Admin reject a teacher
 */
const adminRejectTeacher = async (userId, reason = null) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role !== 'teacher') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chỉ có thể từ chối tài khoản giáo viên');
  }
  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }
  user.registrationStatus = 'rejected';
  user.rejectedReason = reason;
  await user.save();
  return user;
};
```

Then update `module.exports` to include the 3 new methods:

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
  getPendingTeachersForSchool,    // NEW
  adminApproveTeacher,            // NEW
  adminRejectTeacher,             // NEW
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/unit/services/user.service.adminApproval.test.js --no-coverage 2>&1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd server
git add tests/unit/services/user.service.adminApproval.test.js src/services/user.service.js
git commit -m "feat(backend): add admin teacher approval service methods"
```

---

### Task 2: Write failing integration tests for `user.adminApproval.test.js`

**Files:**
- Create: `server/tests/integration/user.adminApproval.test.js`
- Reference: `server/tests/integration/user.test.js` (pattern)

- [ ] **Step 1: Write the failing test**

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const {
  admin,
  teacherOne,
  teacherTwo,
  schoolIdA,
  schoolIdB,
  insertUsers,
} = require('../fixtures/user.fixture');
const {
  adminAccessToken,
  teacherOneAccessToken,
} = require('../fixtures/token.fixture');

setupTestDB();

describe('User Admin Approval routes', () => {
  beforeEach(async () => {
    // Seed the admin into DB (not inserted by default)
    await insertUsers([admin]);
  });

  describe('GET /api/v1/users/admin/teachers/pending', () => {
    beforeEach(async () => {
      // Create pending teachers for schoolA
      const pendingTeacherA = {
        name: 'Pending Teacher A',
        email: 'pendingta@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdA,
      };
      const pendingTeacherB = {
        name: 'Pending Teacher B',
        email: 'pendingtb@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdB,
      };
      await insertUsers([pendingTeacherA, pendingTeacherB]);
    });

    it('should return 200 and pending teachers for the specified school', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ schoolId: schoolIdA.toString() })
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('Pending Teacher A');
    });

    it('should return 401 when no token provided', async () => {
      await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .query({ schoolId: schoolIdA.toString() })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 403 when user is not admin', async () => {
      // Insert teacher into DB and get token
      await insertUsers([teacherOne]);
      const res = await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .query({ schoolId: schoolIdA.toString() })
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe('Chỉ admin mới có quyền truy cập');
    });

    it('should return 400 when schoolId is missing', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin/teachers/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toBe('schoolId is required');
    });
  });

  describe('POST /api/v1/users/admin/teachers/:userId/approve', () => {
    let pendingTeacherId;

    beforeEach(async () => {
      const pendingTeacher = await User.create({
        name: 'Pending Teacher',
        email: 'pending@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdA,
        isActive: false,
      });
      pendingTeacherId = pendingTeacher._id.toString();
    });

    it('should return 200 and approve the teacher', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.registrationStatus).toBe('approved');
      expect(res.body.isActive).toBe(true);
      expect(res.body.schoolId).toBe(schoolIdA.toString());

      // Verify DB state
      const dbUser = await User.findById(pendingTeacherId);
      expect(dbUser.registrationStatus).toBe('approved');
    });

    it('should return 401 when no token provided', async () => {
      await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 403 when user is not admin', async () => {
      await insertUsers([teacherOne]);
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe('Chỉ admin mới có quyền duyệt giáo viên');
    });

    it('should return 404 when userId does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toBe('User not found');
    });

    it('should return 400 when teacher is already approved', async () => {
      await User.findByIdAndUpdate(pendingTeacherId, { registrationStatus: 'approved' });
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toBe('Tài khoản không trong trạng thái chờ duyệt');
    });
  });

  describe('POST /api/v1/users/admin/teachers/:userId/reject', () => {
    let pendingTeacherId;

    beforeEach(async () => {
      const pendingTeacher = await User.create({
        name: 'Pending Teacher',
        email: 'pending@example.com',
        password: 'Password123',
        role: 'teacher',
        registrationStatus: 'pending',
        registeredSchoolId: schoolIdA,
      });
      pendingTeacherId = pendingTeacher._id.toString();
    });

    it('should return 200 and reject the teacher with reason', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ reason: 'Không đủ điều kiện' })
        .expect(httpStatus.OK);

      expect(res.body.registrationStatus).toBe('rejected');
      expect(res.body.rejectedReason).toBe('Không đủ điều kiện');

      // Verify DB state
      const dbUser = await User.findById(pendingTeacherId);
      expect(dbUser.registrationStatus).toBe('rejected');
      expect(dbUser.rejectedReason).toBe('Không đủ điều kiện');
    });

    it('should return 200 and reject the teacher without reason', async () => {
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.registrationStatus).toBe('rejected');
      expect(res.body.rejectedReason).toBeNull();
    });

    it('should return 403 when user is not admin', async () => {
      await insertUsers([teacherOne]);
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${pendingTeacherId}/reject`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ reason: 'Test' })
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe('Chỉ admin mới có quyền từ chối giáo viên');
    });

    it('should return 404 when userId does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/users/admin/teachers/${fakeId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toBe('User not found');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/integration/user.adminApproval.test.js --no-coverage 2>&1`
Expected: FAIL with "connect ECONNREFUSED" or route not found

- [ ] **Step 3: Write minimal implementation — add controller methods to user.controller.js**

Read `server/src/controllers/user.controller.js` first. Add 3 new controller methods AFTER the existing `removeSchoolAdmin` method and BEFORE `module.exports`:

```javascript
// ── Admin Teacher Approval Controllers ──────────────────────────────────────────

const adminGetPendingTeachers = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền truy cập');
  }
  const { schoolId } = req.query;
  if (!schoolId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'schoolId is required');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getPendingTeachersForSchool(schoolId, options);
  res.send(result);
});

const adminApproveTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền duyệt giáo viên');
  }
  const user = await userService.adminApproveTeacher(req.params.userId);
  res.send(user);
});

const adminRejectTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền từ chối giáo viên');
  }
  const { reason } = req.body || {};
  const user = await userService.adminRejectTeacher(req.params.userId, reason);
  res.send(user);
});
```

Then update `module.exports` to include the 3 new controller methods:

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
  adminGetPendingTeachers,    // NEW
  adminApproveTeacher,        // NEW
  adminRejectTeacher,         // NEW
};
```

- [ ] **Step 4: Add routes to user.route.js**

Read `server/src/routes/v1/user.route.js` first. Add the 3 new routes **BEFORE** the existing `/:userId/approve` route (so they don't get matched as a generic userId):

```javascript
// ── Admin Teacher Approval routes (must be defined BEFORE /:userId to avoid being matched as userId) ──

router
  .route('/admin/teachers/pending')
  .get(auth('manageUsers'), userController.adminGetPendingTeachers);

router
  .route('/admin/teachers/:userId/approve')
  .post(auth('manageUsers'), userController.adminApproveTeacher);

router
  .route('/admin/teachers/:userId/reject')
  .post(auth('manageUsers'), userController.adminRejectTeacher);
```

Place these lines immediately after the existing `removeSchoolAdmin` route and BEFORE the generic CRUD routes. The routes file should look like:

```javascript
// ... existing school-admin routes ...

router
  .route('/school-admin/:schoolId/:userId')
  .delete(auth('manageUsers'), userController.removeSchoolAdmin);

// ── Admin Teacher Approval routes (NEW — must be BEFORE /:userId) ──
router
  .route('/admin/teachers/pending')
  .get(auth('manageUsers'), userController.adminGetPendingTeachers);

router
  .route('/admin/teachers/:userId/approve')
  .post(auth('manageUsers'), userController.adminApproveTeacher);

router
  .route('/admin/teachers/:userId/reject')
  .post(auth('manageUsers'), userController.adminRejectTeacher);

// ── Generic CRUD routes ────────────────────────
router
  .route('/')
  // ...
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx jest tests/integration/user.adminApproval.test.js --no-coverage 2>&1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd server
git add src/controllers/user.controller.js src/routes/v1/user.route.js tests/integration/user.adminApproval.test.js
git commit -m "feat(backend): add admin teacher approval routes and controllers"
```

---

### Task 3: Backend regression test

**Files:**
- Reference: existing `server/tests/integration/user.test.js`

- [ ] **Step 1: Run all existing user tests to verify no regression**

Run: `cd server && npx jest tests/integration/user.test.js --no-coverage 2>&1`
Expected: All existing tests PASS

- [ ] **Step 2: Run all existing user service tests to verify no regression**

Run: `cd server && npx jest tests/unit/services/ --testPathIgnorePatterns=adminApproval --no-coverage 2>&1`
Expected: All existing service tests PASS

---

## Frontend: Service Layer (TDD)

### Task 4: Write failing unit tests for `approval.service.admin.test.ts`

**Files:**
- Create: `client/web/src/__tests__/services/approval.service.admin.test.ts`
- Reference: `client/web/src/__tests__/services/bankService.test.ts` (pattern)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import approvalService from '../../services/approval.service';
import { apiService } from '../../core/api';

describe('approvalService — admin teacher approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminPendingTeachers', () => {
    it('calls GET /users/admin/teachers/pending with schoolId param', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        results: [],
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      });
      await approvalService.getAdminPendingTeachers({ schoolId: 'school123' });
      expect(apiService.get).toHaveBeenCalledWith('/users/admin/teachers/pending', {
        params: { schoolId: 'school123' },
      });
    });

    it('passes pagination params when provided', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        results: [],
        page: 2,
        limit: 20,
        total: 0,
        pages: 0,
      });
      await approvalService.getAdminPendingTeachers({ schoolId: 'school123', page: 2, limit: 20 });
      expect(apiService.get).toHaveBeenCalledWith('/users/admin/teachers/pending', {
        params: { schoolId: 'school123', page: 2, limit: 20 },
      });
    });

    it('returns the response data with correct shape', async () => {
      const mockResponse = {
        results: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', registeredSchoolId: 'school123', createdAt: '2026-01-01' },
        ],
        page: 1,
        limit: 100,
        total: 1,
        pages: 1,
      };
      (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);
      const result = await approvalService.getAdminPendingTeachers({ schoolId: 'school123' });
      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('throws error when API call fails', async () => {
      (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
      await expect(approvalService.getAdminPendingTeachers({ schoolId: 'school123' }))
        .rejects.toThrow('Network error');
    });
  });

  describe('adminApproveTeacher', () => {
    it('calls POST /users/admin/teachers/:userId/approve', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 't1', registrationStatus: 'approved' });
      await approvalService.adminApproveTeacher('teacher123');
      expect(apiService.post).toHaveBeenCalledWith('/users/admin/teachers/teacher123/approve');
    });

    it('returns the updated user object', async () => {
      const mockUser = { _id: 't1', name: 'Teacher A', registrationStatus: 'approved' };
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);
      const result = await approvalService.adminApproveTeacher('teacher123');
      expect(result.registrationStatus).toBe('approved');
    });

    it('throws error when API call fails', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));
      await expect(approvalService.adminApproveTeacher('teacher123'))
        .rejects.toThrow('Server error');
    });
  });

  describe('adminRejectTeacher', () => {
    it('calls POST /users/admin/teachers/:userId/reject with reason', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 't1', registrationStatus: 'rejected' });
      await approvalService.adminRejectTeacher('teacher123', 'Không đủ điều kiện');
      expect(apiService.post).toHaveBeenCalledWith('/users/admin/teachers/teacher123/reject', {
        reason: 'Không đủ điều kiện',
      });
    });

    it('calls POST without reason when not provided', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ _id: 't1', registrationStatus: 'rejected' });
      await approvalService.adminRejectTeacher('teacher123');
      expect(apiService.post).toHaveBeenCalledWith('/users/admin/teachers/teacher123/reject', {
        reason: undefined,
      });
    });

    it('throws error when API call fails', async () => {
      (apiService.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));
      await expect(approvalService.adminRejectTeacher('teacher123', 'reason'))
        .rejects.toThrow('Server error');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/web && npx vitest run src/__tests__/services/approval.service.admin.test.ts 2>&1`
Expected: FAIL with "approvalService.getAdminPendingTeachers is not a function"

- [ ] **Step 3: Write minimal implementation — add methods to approval.service.ts**

Read `client/web/src/services/approval.service.ts` first. Add the 3 new methods AFTER the existing `rejectTeacher` method:

```typescript
  // ── Admin Teachers (for system admin in SchoolDetailModal) ─────────────────────

  getAdminPendingTeachers: async (params: {
    schoolId: string;
    page?: number;
    limit?: number;
  }): Promise<ApprovalResponse<PendingTeacher>> => {
    const response = await apiService.get<ApprovalResponse<PendingTeacher>>(
      '/users/admin/teachers/pending',
      { params }
    );
    return response;
  },

  adminApproveTeacher: async (userId: string): Promise<User> => {
    const response = await apiService.post<User>(`/users/admin/teachers/${userId}/approve`);
    return response;
  },

  adminRejectTeacher: async (userId: string, reason?: string): Promise<User> => {
    const response = await apiService.post<User>(
      `/users/admin/teachers/${userId}/reject`,
      { reason }
    );
    return response;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/web && npx vitest run src/__tests__/services/approval.service.admin.test.ts 2>&1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd client/web
git add src/services/approval.service.ts src/__tests__/services/approval.service.admin.test.ts
git commit -m "feat(frontend): add admin teacher approval service methods"
```

---

## Frontend: Store (TDD)

### Task 5: Write failing unit tests for `approvalStore.admin.test.ts`

**Files:**
- Create: `client/web/src/__tests__/stores/approvalStore.admin.test.ts`
- Reference: `client/web/src/__tests__/stores/bankStore.test.ts` (pattern)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetAdminPendingTeachers: vi.fn(),
  mockAdminApproveTeacher: vi.fn(),
  mockAdminRejectTeacher: vi.fn(),
}));

vi.mock('../../services/approval.service', () => ({
  default: {
    getPendingQuestions: vi.fn(),
    approveQuestion: vi.fn(),
    rejectQuestion: vi.fn(),
    getPendingTeachers: vi.fn(),
    approveTeacher: vi.fn(),
    rejectTeacher: vi.fn(),
    getAdminPendingTeachers: mocks.mockGetAdminPendingTeachers,
    adminApproveTeacher: mocks.mockAdminApproveTeacher,
    adminRejectTeacher: mocks.mockAdminRejectTeacher,
  },
}));

import { useApprovalStore } from '../../presentation/store/approvalStore';

describe('approvalStore — admin teacher approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApprovalStore.setState({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty adminPendingTeachers array', () => {
      expect(useApprovalStore.getState().adminPendingTeachers).toEqual([]);
    });

    it('has adminPendingTeachersCount of 0', () => {
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(0);
    });

    it('has isLoadingAdminTeachers as false', () => {
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });
  });

  describe('fetchAdminPendingTeachers', () => {
    it('populates adminPendingTeachers on success', async () => {
      const teachers = [
        { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
        { _id: 't2', id: 't2', name: 'Teacher B', email: 'b@b.com', createdAt: '2026-01-02' },
      ];
      mocks.mockGetAdminPendingTeachers.mockResolvedValueOnce({
        results: teachers,
        page: 1,
        limit: 100,
        total: 2,
        pages: 1,
      });

      await useApprovalStore.getState().fetchAdminPendingTeachers('school123');

      expect(useApprovalStore.getState().adminPendingTeachers).toEqual(teachers);
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(2);
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });

    it('sets isLoadingAdminTeachers to true while fetching', async () => {
      let resolve: (val: unknown) => void;
      mocks.mockGetAdminPendingTeachers.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));

      const fetchPromise = useApprovalStore.getState().fetchAdminPendingTeachers('school123');
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(true);

      resolve!({ results: [], page: 1, limit: 100, total: 0, pages: 0 });
      await fetchPromise;
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });

    it('sets error on failure', async () => {
      mocks.mockGetAdminPendingTeachers.mockRejectedValueOnce(new Error('Fetch failed'));

      await useApprovalStore.getState().fetchAdminPendingTeachers('school123');

      expect(useApprovalStore.getState().error).toBe('Fetch failed');
      expect(useApprovalStore.getState().isLoadingAdminTeachers).toBe(false);
    });
  });

  describe('adminApproveTeacher', () => {
    it('removes approved teacher from adminPendingTeachers list', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
          { _id: 't2', id: 't2', name: 'Teacher B', email: 'b@b.com', createdAt: '2026-01-02' },
        ],
        adminPendingTeachersCount: 2,
      });
      mocks.mockAdminApproveTeacher.mockResolvedValueOnce({ _id: 't1', registrationStatus: 'approved' });

      await useApprovalStore.getState().adminApproveTeacher('t1');

      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachers[0]._id).toBe('t2');
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });

    it('throws error on failure without changing state', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
        ],
        adminPendingTeachersCount: 1,
      });
      mocks.mockAdminApproveTeacher.mockRejectedValueOnce(new Error('Approve failed'));

      await expect(useApprovalStore.getState().adminApproveTeacher('t1')).rejects.toThrow('Approve failed');
      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });
  });

  describe('adminRejectTeacher', () => {
    it('removes rejected teacher from adminPendingTeachers list', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
          { _id: 't2', id: 't2', name: 'Teacher B', email: 'b@b.com', createdAt: '2026-01-02' },
        ],
        adminPendingTeachersCount: 2,
      });
      mocks.mockAdminRejectTeacher.mockResolvedValueOnce({ _id: 't1', registrationStatus: 'rejected' });

      await useApprovalStore.getState().adminRejectTeacher('t1', 'Không đủ điều kiện');

      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachers[0]._id).toBe('t2');
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });

    it('throws error on failure without changing state', async () => {
      useApprovalStore.setState({
        adminPendingTeachers: [
          { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@b.com', createdAt: '2026-01-01' },
        ],
        adminPendingTeachersCount: 1,
      });
      mocks.mockAdminRejectTeacher.mockRejectedValueOnce(new Error('Reject failed'));

      await expect(useApprovalStore.getState().adminRejectTeacher('t1')).rejects.toThrow('Reject failed');
      expect(useApprovalStore.getState().adminPendingTeachers).toHaveLength(1);
      expect(useApprovalStore.getState().adminPendingTeachersCount).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/web && npx vitest run src/__tests__/stores/approvalStore.admin.test.ts 2>&1`
Expected: FAIL — store doesn't have the new actions yet

- [ ] **Step 3: Write minimal implementation — add state and actions to approvalStore.ts**

Read `client/web/src/presentation/store/approvalStore.ts` first. Add the 3 new state properties and 3 new actions:

**Add to the `ApprovalState` interface:**

```typescript
interface ApprovalState {
  // ... existing properties ...

  // Admin teacher approval state (NEW)
  adminPendingTeachers: PendingTeacher[];
  adminPendingTeachersCount: number;
  isLoadingAdminTeachers: boolean;

  // ... existing actions ...

  // Admin teacher approval actions (NEW)
  fetchAdminPendingTeachers: (schoolId: string) => Promise<void>;
  adminApproveTeacher: (userId: string) => Promise<void>;
  adminRejectTeacher: (userId: string, reason?: string) => Promise<void>;
}
```

**Add initial state values in `create<ApprovalState>()`:**

```typescript
export const useApprovalStore = create<ApprovalState>((set, get) => ({
  // ... existing initial state ...

  // Admin teacher approval state (NEW)
  adminPendingTeachers: [],
  adminPendingTeachersCount: 0,
  isLoadingAdminTeachers: false,

  // ... existing actions ...
```

**Add the 3 new actions BEFORE the `clearError` action:**

```typescript
  // Admin teacher approval actions (NEW) ─────────────────────────────────────────

  fetchAdminPendingTeachers: async (schoolId: string) => {
    set({ isLoadingAdminTeachers: true, error: null });
    try {
      const data = await approvalService.getAdminPendingTeachers({ schoolId, limit: 100 });
      set({
        adminPendingTeachers: data.results,
        adminPendingTeachersCount: data.total,
        isLoadingAdminTeachers: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch pending teachers for school',
        isLoadingAdminTeachers: false,
      });
    }
  },

  adminApproveTeacher: async (userId: string) => {
    try {
      await approvalService.adminApproveTeacher(userId);
      const filtered = get().adminPendingTeachers.filter(
        (t) => t.id !== userId && t._id !== userId
      );
      set({
        adminPendingTeachers: filtered,
        adminPendingTeachersCount: get().adminPendingTeachersCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve teacher' });
      throw err;
    }
  },

  adminRejectTeacher: async (userId: string, reason?: string) => {
    try {
      await approvalService.adminRejectTeacher(userId, reason);
      const filtered = get().adminPendingTeachers.filter(
        (t) => t.id !== userId && t._id !== userId
      );
      set({
        adminPendingTeachers: filtered,
        adminPendingTeachersCount: get().adminPendingTeachersCount - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject teacher' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/web && npx vitest run src/__tests__/stores/approvalStore.admin.test.ts 2>&1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd client/web
git add src/presentation/store/approvalStore.ts src/__tests__/stores/approvalStore.admin.test.ts
git commit -m "feat(frontend): add admin teacher approval store state and actions"
```

---

## Frontend: UI Component (TDD)

### Task 6: Write failing component test for `PendingTeachersSection.test.tsx`

**Files:**
- Create: `client/web/src/__tests__/components/PendingTeachersSection.test.tsx`
- Reference: `client/web/src/__tests__/components/ConfirmDialog.test.tsx` (pattern)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingTeachersSection } from '../../../presentation/components/admin/SchoolDetailModal';
import { useApprovalStore } from '../../../presentation/store/approvalStore';

// Mock the store
const mockFetchAdminPendingTeachers = vi.fn();
const mockAdminApproveTeacher = vi.fn();
const mockAdminRejectTeacher = vi.fn();

vi.mock('../../../presentation/store/approvalStore', () => ({
  useApprovalStore: vi.fn(),
}));

describe('PendingTeachersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });
  });

  it('renders loading state when isLoadingAdminTeachers is true', () => {
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: true,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('renders empty state when no pending teachers', () => {
    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('Không có giáo viên nào đang chờ duyệt.')).toBeInTheDocument();
  });

  it('renders teacher cards when teachers are present', () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Nguyễn Văn A', email: 'a@example.com', createdAt: '2026-01-01' },
      { _id: 't2', id: 't2', name: 'Trần Thị B', email: 'b@example.com', createdAt: '2026-01-02' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 2,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getByText('b@example.com')).toBeInTheDocument();
  });

  it('displays badge with count when teachers exist', () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@example.com', createdAt: '2026-01-01' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 3,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('does not display badge when count is zero', () => {
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: [],
      adminPendingTeachersCount: 0,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
  });

  it('calls fetchAdminPendingTeachers on mount', () => {
    render(<PendingTeachersSection schoolId="school123" />);

    expect(mockFetchAdminPendingTeachers).toHaveBeenCalledWith('school123');
  });

  it('refetches when schoolId prop changes', () => {
    const { rerender } = render(<PendingTeachersSection schoolId="school123" />);

    expect(mockFetchAdminPendingTeachers).toHaveBeenCalledTimes(1);

    rerender(<PendingTeachersSection schoolId="school456" />);

    expect(mockFetchAdminPendingTeachers).toHaveBeenCalledWith('school456');
  });

  it('calls adminApproveTeacher with correct userId on approve click', async () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@example.com', createdAt: '2026-01-01' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 1,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher.mockResolvedValue(undefined),
      adminRejectTeacher: mockAdminRejectTeacher,
    });

    render(<PendingTeachersSection schoolId="school123" />);

    const approveButton = screen.getByRole('button', { name: /duyệt/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockAdminApproveTeacher).toHaveBeenCalledWith('t1');
    });
  });

  it('calls adminRejectTeacher with correct userId on reject click', async () => {
    const teachers = [
      { _id: 't1', id: 't1', name: 'Teacher A', email: 'a@example.com', createdAt: '2026-01-01' },
    ];
    (useApprovalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      adminPendingTeachers: teachers,
      adminPendingTeachersCount: 1,
      isLoadingAdminTeachers: false,
      fetchAdminPendingTeachers: mockFetchAdminPendingTeachers,
      adminApproveTeacher: mockAdminApproveTeacher,
      adminRejectTeacher: mockAdminRejectTeacher.mockResolvedValue(undefined),
    });

    // Mock window.prompt
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('Không đủ điều kiện');

    render(<PendingTeachersSection schoolId="school123" />);

    const rejectButton = screen.getByRole('button', { name: /từ chối/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockAdminRejectTeacher).toHaveBeenCalledWith('t1', 'Không đủ điều kiện');
    });

    window.prompt = originalPrompt;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/web && npx vitest run src/__tests__/components/PendingTeachersSection.test.tsx 2>&1`
Expected: FAIL with "PendingTeachersSection is not a named export from SchoolDetailModal.tsx"

- [ ] **Step 3: Write minimal implementation — add PendingTeachersSection to SchoolDetailModal.tsx**

Read `client/web/src/presentation/components/admin/SchoolDetailModal.tsx` first.

**Step 3a: Add imports** (near the top of the file):

```tsx
import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin, User, Users, Trash2, Plus } from 'lucide-react';
import Modal from '../shared/Modal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useSchoolManagementStore } from '../../store/schoolManagementStore';
import { useApprovalStore } from '../../store/approvalStore';   // NEW
import AddSchoolAdminModal from './AddSchoolAdminModal';
import type { School } from '../../../types';
import styles from './SchoolDetailModal.module.css';
import { toast } from 'sonner';                                  // NEW
import LoadingSpinner from '../shared/LoadingSpinner';            // NEW
```

**Step 3b: Add the `PendingTeachersSection` component** (before the `export default SchoolDetailModal` line):

```tsx
// ── Sub-component: PendingTeachersSection ──────────────────────────────────────

interface PendingTeachersSectionProps {
  schoolId: string;
}

const PendingTeachersSection: React.FC<PendingTeachersSectionProps> = ({ schoolId }) => {
  const {
    adminPendingTeachers,
    adminPendingTeachersCount,
    isLoadingAdminTeachers,
    fetchAdminPendingTeachers,
    adminApproveTeacher: storeApprove,
    adminRejectTeacher: storeReject,
  } = useApprovalStore();

  useEffect(() => {
    if (schoolId) {
      fetchAdminPendingTeachers(schoolId);
    }
  }, [schoolId, fetchAdminPendingTeachers]);

  const handleApprove = async (userId: string) => {
    try {
      await storeApprove(userId);
      toast.success('Đã duyệt giáo viên thành công');
    } catch {
      toast.error('Duyệt giáo viên thất bại');
    }
  };

  const handleReject = async (userId: string) => {
    const reason = window.prompt('Lý do từ chối (tuỳ chọn):') || undefined;
    try {
      await storeReject(userId, reason);
      toast.success('Đã từ chối giáo viên');
    } catch {
      toast.error('Từ chối giáo viên thất bại');
    }
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h3><Users size={18} /> Giáo viên chờ duyệt</h3>
        {adminPendingTeachersCount > 0 && (
          <span className={styles.badge}>{adminPendingTeachersCount} pending</span>
        )}
      </header>

      {isLoadingAdminTeachers ? (
        <div className={styles.loadingState}>
          <LoadingSpinner size="sm" />
          <span>Đang tải...</span>
        </div>
      ) : adminPendingTeachers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không có giáo viên nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className={styles.teacherList}>
          {adminPendingTeachers.map((teacher) => (
            <div key={teacher._id || teacher.id} className={styles.teacherCard}>
              <div className={styles.teacherAvatar}>
                {teacher.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className={styles.teacherInfo}>
                <div className={styles.teacherName}>{teacher.name}</div>
                <div className={styles.teacherEmail}>
                  <Mail size={12} /> {teacher.email}
                </div>
                {teacher.createdAt && (
                  <div className={styles.teacherDate}>
                    Đăng ký: {new Date(teacher.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
              <div className={styles.teacherActions}>
                <button
                  type="button"
                  className={styles.btnApprove}
                  onClick={() => handleApprove(teacher._id || teacher.id)}
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  className={styles.btnReject}
                  onClick={() => handleReject(teacher._id || teacher.id)}
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export { PendingTeachersSection };  // Named export for testing
```

**Step 3c: Add the section to the modal** — Find the existing `<section className={styles.section}>` that contains the "School Admin" heading and **insert the new section BEFORE it**:

Look for this code in `SchoolDetailModal`:

```tsx
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3><Users size={18} /> School Admin ({schoolAdmins.length})</h3>
```

**Insert BEFORE this section:**

```tsx
          {school?._id && (
            <PendingTeachersSection schoolId={school._id} />
          )}

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3><Users size={18} /> School Admin ({schoolAdmins.length})</h3>
```

- [ ] **Step 4: Add CSS to SchoolDetailModal.module.css**

Read `client/web/src/presentation/components/admin/SchoolDetailModal.module.css` first. Append these styles to the end of the file:

```css
/* Admin Pending Teachers Section ─────────────────────────────────────────────── */

.loadingState {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #6b7280;
  font-size: 14px;
}

.emptyState {
  padding: 24px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.emptyState p {
  margin: 0;
  font-size: 14px;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.teacherList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.teacherCard {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.teacherCard:hover {
  border-color: #d1d5db;
}

.teacherAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
  font-weight: 600;
  font-size: 16px;
}

.teacherInfo {
  flex: 1;
  min-width: 0;
}

.teacherName {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.teacherEmail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacherDate {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.teacherActions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btnApprove {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btnApprove:hover {
  background: #15803d;
}

.btnReject {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btnReject:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client/web && npx vitest run src/__tests__/components/PendingTeachersSection.test.tsx 2>&1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd client/web
git add src/presentation/components/admin/SchoolDetailModal.tsx
git add src/presentation/components/admin/SchoolDetailModal.module.css
git add src/__tests__/components/PendingTeachersSection.test.tsx
git commit -m "feat(frontend): add PendingTeachersSection to SchoolDetailModal"
```

---

## Verification

### Task 7: Run full backend test suite

- [ ] **Step 1: Run all backend tests**

Run: `cd server && npx jest --no-coverage 2>&1`
Expected: All tests PASS including the 3 new test files

- [ ] **Step 2: Run frontend tests**

Run: `cd client/web && npx vitest run 2>&1`
Expected: All tests PASS including the 3 new test files

### Task 8: ESLint check

- [ ] **Step 1: Run ESLint on changed files**

Run (backend): `cd server && npx eslint src/services/user.service.js src/controllers/user.controller.js src/routes/v1/user.route.js 2>&1`
Run (frontend): `cd client/web && npx eslint src/services/approval.service.ts src/presentation/store/approvalStore.ts src/presentation/components/admin/SchoolDetailModal.tsx 2>&1`
Expected: No errors (warnings acceptable)

### Task 9: TypeScript check

- [ ] **Step 1: Run TypeScript compiler**

Run: `cd client/web && npx tsc --noEmit 2>&1`
Expected: No type errors

### Task 10: Manual E2E verification

- [ ] **Scenario 1: Admin approves teacher**
  1. Start backend + frontend dev servers
  2. Login as admin user
  3. Navigate to `/admin/schools` (or wherever SchoolsPage is)
  4. Click "View Details" on a school with pending teachers
  5. Verify "Pending Teachers" section appears with teacher cards
  6. Click "Duyệt" on a teacher
  7. Verify: toast success, teacher removed from list, count decreases

- [ ] **Scenario 2: Admin rejects teacher**
  1. Continue from Scenario 1
  2. Click "Từ chối" on another teacher
  3. Enter reason in prompt
  4. Verify: toast success, teacher removed from list

- [ ] **Scenario 3: Permission check**
  1. Login as teacher user
  2. Try to call API directly: `GET /users/admin/teachers/pending?schoolId=...`
  3. Verify: 403 Forbidden response

- [ ] **Scenario 4: Empty state**
  1. Open SchoolDetailModal for a school with no pending teachers
  2. Verify: "Không có giáo viên nào đang chờ duyệt." message

---

## Definition of Done Checklist

- [ ] All 3 new backend service method unit tests pass
- [ ] All 3 new backend integration endpoint tests pass
- [ ] All existing backend tests still pass (no regression)
- [ ] All 3 new frontend service unit tests pass
- [ ] All 3 new frontend store unit tests pass
- [ ] All 1 new frontend component test passes
- [ ] All existing frontend tests still pass (no regression)
- [ ] ESLint passes on all changed files
- [ ] TypeScript passes on frontend
- [ ] Manual E2E Scenarios 1-4 all pass
- [ ] All changes committed with descriptive messages
