# Class & School-Scoped Listing Endpoints — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa lỗi 403 Forbidden khi teacher mở trang "Add Students" trong mobile bằng cách thay thế 2 lệnh gọi admin-only `/api/v1/users?role=...` bằng 2 endpoint mới theo lớp và theo trường.

**Architecture:** Thêm 2 REST endpoint mới:
1. `GET /api/v1/classes/:id/available-students` (class-scoped) — cho mobile "Add Students"
2. `GET /api/v1/schools/:schoolId/available-teachers` (school-scoped) — cho web teacher dropdown

Cả 2 đều dùng authorization helpers hiện có (`_authorizeClassAccess` cho endpoint 1, manual school check cho endpoint 2) và `parsePagination` helper. Mobile + web chỉ thay đổi call site, không refactor UI.

**Tech Stack:** Node.js/Express, Mongoose, Jest, Joi, Flutter, React/TypeScript

**Spec:** `docs/superpowers/specs/2026-06-14-class-available-students-design.md`

---

## File Structure

### Server (sẽ thay đổi)
- `server/src/routes/v1/class.route.js` — thêm 1 route
- `server/src/controllers/class.controller.js` — thêm 1 method
- `server/src/services/class.service.js` — thêm 1 method
- `server/src/validations/class.validation.js` — thêm 1 schema
- `server/src/routes/v1/school.route.js` — thêm 1 route
- `server/src/controllers/school.controller.js` — thêm 1 method
- `server/src/services/school.service.js` — thêm 1 method
- `server/src/validations/school.validation.js` — thêm 1 schema
- `server/tests/unit/validations/class.validation.test.js` — thêm test
- `server/tests/unit/validations/school.validation.test.js` — **MỚI**
- `server/tests/unit/services/class.service.test.js` — **MỚI**
- `server/tests/integration/classes/available-students.test.js` — **MỚI**
- `server/tests/integration/schools/available-teachers.test.js` — **MỚI**
- `server/tests/fixtures/class.fixture.js` — **MỚI**

### Mobile (sẽ thay đổi)
- `client/mobile/lib/core/network/user_service.dart` — đổi `getStudents()` thành `getAvailableStudents(...)`
- `client/mobile/lib/presentation/pages/add_students_page.dart` — cập nhật call site
- `client/mobile/test/core/network/user_service_test.dart` — **MỚI**

### Web (sẽ thay đổi)
- `client/web/src/presentation/store/classStore.ts` — đổi URL `fetchTeachers()`

---

## Task Order

Thực hiện theo thứ tự: **Server → Mobile → Web**. Server là nền tảng (test trước), sau đó mới wire client.

---

# PHẦN 1: SERVER

## Task 1: Thêm validation schema `getAvailableStudents`

**Files:**
- Modify: `server/src/validations/class.validation.js` (thêm schema ở cuối file, trước `module.exports`)
- Test: `server/tests/unit/validations/class.validation.test.js` (bổ sung describe block)

- [ ] **Step 1: Mở file `server/src/validations/class.validation.js` và xác nhận cấu trúc**

Chạy lệnh để xem:
```bash
cd server && cat src/validations/class.validation.js
```
Expected: thấy file 121 dòng, các schema `createClass`, `updateClass`, v.v. cuối cùng là `module.exports`.

- [ ] **Step 2: Thêm schema `getAvailableStudents`**

Mở file `server/src/validations/class.validation.js`, **CHÈN NGAY TRƯỚC** dòng `module.exports = {` (dòng cuối cùng trước block export):

```javascript
const getAvailableStudents = {
  params: id,
  query: Joi.object().keys({
    search: Joi.string().trim().max(100).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
```

- [ ] **Step 3: Thêm `getAvailableStudents` vào export**

Trong cùng file, sửa block `module.exports = {` thành:

```javascript
module.exports = {
  createClass,
  updateClass,
  addStudents,
  removeStudents,
  getClass,
  getClassesBySchool,
  importStudents,
  manageSubjectTeachers,
  transferHomeroomTeacher,
  getClassExams,
  assignExamsToClass,
  removeExamFromClass,
  getAvailableStudents,
};
```

- [ ] **Step 4: Mở file test `server/tests/unit/validations/class.validation.test.js` và bổ sung describe block mới**

Thêm NGAY SAU describe block `updateClass` hiện tại (trước dấu `});` cuối cùng của outer describe `Class validation schemas`):

```javascript
  describe('getAvailableStudents', () => {
    const { params, query } = getAvailableStudents;

    test('should accept valid id with all query params', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { search: 'Nguyen', page: 1, limit: 20 },
      });
      expect(error).toBeUndefined();
    });

    test('should accept request without any query params (use defaults)', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: {},
      });
      expect(error).toBeUndefined();
    });

    test('should reject invalid id', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: 'invalid-id' },
        query: {},
      });
      expect(error).toBeDefined();
    });

    test('should reject limit greater than 100', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { limit: 200 },
      });
      expect(error).toBeDefined();
    });

    test('should reject search longer than 100 chars', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { search: 'a'.repeat(101) },
      });
      expect(error).toBeDefined();
    });

    test('should reject negative page', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { page: -1 },
      });
      expect(error).toBeDefined();
    });
  });
```

- [ ] **Step 5: Cập nhật import ở đầu file test**

Sửa dòng đầu của file test (dòng 2):
```javascript
const { updateClass, getAvailableStudents } = require('../../../src/validations/class.validation');
```

- [ ] **Step 6: Chạy test để verify PASS**

```bash
cd server && npm test -- --testPathPattern=class.validation.test.js
```
Expected: tất cả test pass, bao gồm cả test mới (PASS vì schema đã được export đúng).

- [ ] **Step 7: Commit**

```bash
cd server && git add src/validations/class.validation.js tests/unit/validations/class.validation.test.js
git commit -m "feat(server): add getAvailableStudents validation schema"
```

---

## Task 2: Tạo `class.fixture.js` cho tests

**Files:**
- Create: `server/tests/fixtures/class.fixture.js`

- [ ] **Step 1: Tạo file `server/tests/fixtures/class.fixture.js`**

```javascript
const mongoose = require('mongoose');
const { Class } = require('../../src/models');

const classIdA = mongoose.Types.ObjectId();
const classIdB = mongoose.Types.ObjectId();
const schoolIdA = mongoose.Types.ObjectId();
const homeroomTeacherIdA = mongoose.Types.ObjectId();
const subjectTeacherIdA = mongoose.Types.ObjectId();
const studentIdInA = mongoose.Types.ObjectId();
const studentIdOutside = mongoose.Types.ObjectId();
const studentIdInB = mongoose.Types.ObjectId();

const classA = {
  _id: classIdA,
  name: '10A1',
  code: '10A1-2026',
  gradeLevel: 10,
  academicYear: '2026-2027',
  schoolId: schoolIdA,
  homeroomTeacherId: homeroomTeacherIdA,
  subjectTeachers: [{ teacherId: subjectTeacherIdA, subjectId: null, addedAt: new Date() }],
  studentIds: [studentIdInA],
  isActive: true,
};

const classB = {
  _id: classIdB,
  name: '11B2',
  code: '11B2-2026',
  gradeLevel: 11,
  academicYear: '2026-2027',
  schoolId: schoolIdA,
  homeroomTeacherId: mongoose.Types.ObjectId(),
  subjectTeachers: [],
  studentIds: [studentIdInB],
  isActive: true,
};

const insertClasses = async (classes) => {
  await Class.insertMany(classes);
};

module.exports = {
  classA,
  classB,
  classIdA,
  classIdB,
  schoolIdA,
  homeroomTeacherIdA,
  subjectTeacherIdA,
  studentIdInA,
  studentIdOutside,
  studentIdInB,
  insertClasses,
};
```

- [ ] **Step 2: Verify file tồn tại**

```bash
ls server/tests/fixtures/class.fixture.js
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
cd server && git add tests/fixtures/class.fixture.js
git commit -m "test(server): add class.fixture for available-students tests"
```

---

## Task 3: Implement `classService.getAvailableStudents`

**Files:**
- Modify: `server/src/services/class.service.js` (thêm method mới, chèn NGAY TRƯỚC `module.exports = new ClassService();` ở cuối file)

- [ ] **Step 1: Mở `server/src/services/class.service.js`**

- [ ] **Step 2: Đảm bảo import `User` đã có sẵn**

Dòng đầu file là `const mongoose = require('mongoose'); const { Class, User, School, Subject, Exam } = require('../models');`. Đã import `User`. OK.

- [ ] **Step 3: Thêm method `getAvailableStudents` vào class `ClassService`**

Chèn method này NGAY TRƯỚC dòng `module.exports = new ClassService();` (dòng 424):

```javascript
  // ── Available Students (for "Add Students" flow) ──────────────────────────
  async getAvailableStudents(classId, query = {}, requestingUser = null) {
    // 1. Authorize access to class (admin OK; teacher must be homeroom/subject teacher)
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'view');

    // 2. Parse pagination
    const { page, limit, skip } = parsePagination(query);

    // 3. Build filter: students in same school, NOT already in this class
    const filter = {
      role: 'student',
      schoolId: classData.schoolId,
      _id: { $nin: classData.studentIds },
    };

    // 4. Add search filter (case-insensitive, partial match on name/studentCode/email)
    if (query.search && String(query.search).trim().length > 0) {
      const escaped = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { studentCode: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 5. Query with select to limit fields
    const [results, total] = await Promise.all([
      User.find(filter)
        .select('name email studentCode avatarUrl isActive')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }
```

**Lưu ý:** Inline regex escape (`replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) thay vì tạo helper mới — codebase chưa có `escapeRegex`, tránh thêm file mới cho một chỗ dùng.

- [ ] **Step 4: Verify file vẫn hợp lệ (node parse)**

```bash
cd server && node -e "require('./src/services/class.service')" && echo "OK"
```
Expected: `OK` (no error).

- [ ] **Step 5: Commit**

```bash
cd server && git add src/services/class.service.js
git commit -m "feat(server): add classService.getAvailableStudents"
```

---

## Task 4: Implement controller `getAvailableStudents` + route

**Files:**
- Modify: `server/src/controllers/class.controller.js` (thêm method)
- Modify: `server/src/routes/v1/class.route.js` (thêm route)

- [ ] **Step 1: Mở `server/src/controllers/class.controller.js`**

- [ ] **Step 2: Thêm controller method**

Chèn NGAY TRƯỚC dòng `module.exports = {` (dòng 81):

```javascript
const getAvailableStudents = catchAsync(async (req, res) => {
  const result = await classService.getAvailableStudents(req.params.id, req.query, req.user);
  res.send(result);
});
```

- [ ] **Step 3: Export method mới**

Sửa block `module.exports = {` (dòng 81) thành:

```javascript
module.exports = {
  create,
  getAll,
  getById,
  update,
  addStudents,
  removeStudents,
  importStudents,
  remove,
  manageSubjectTeachers,
  transferHomeroomTeacher,
  getClassExams,
  assignExamsToClass,
  removeExamFromClass,
  getClassStatistics,
  getAvailableStudents,
};
```

- [ ] **Step 4: Mở `server/src/routes/v1/class.route.js`**

- [ ] **Step 5: Thêm route**

Chèn NGAY TRƯỚC dòng `module.exports = router;` (dòng 55):

```javascript
router
  .route('/:id/available-students')
  .get(auth('manageClasses'), validate(classValidation.getAvailableStudents), classController.getAvailableStudents);
```

- [ ] **Step 6: Verify Express app boot không lỗi**

```bash
cd server && node -e "require('./src/app')" && echo "OK"
```
Expected: `OK` (no error). Nếu lỗi "Cannot find module", kiểm tra import paths.

- [ ] **Step 7: Commit**

```bash
cd server && git add src/controllers/class.controller.js src/routes/v1/class.route.js
git commit -m "feat(server): add GET /classes/:id/available-students endpoint"
```

---

## Task 5: Unit test cho `classService.getAvailableStudents`

**Files:**
- Create: `server/tests/unit/services/class.service.test.js`

- [ ] **Step 1: Tạo file `server/tests/unit/services/class.service.test.js`**

```javascript
const mongoose = require('mongoose');
const ClassService = require('../../../src/services/class.service');
const { classA, classB, classIdA, classIdB, schoolIdA, homeroomTeacherIdA, studentIdInA, studentIdInB, insertClasses } = require('../../fixtures/class.fixture');
const { admin, teacherOne, teacherTwo, studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Class Service - getAvailableStudents', () => {
  let classService;

  beforeEach(async () => {
    classService = Object.create(ClassService);
    // Ensure schoolIdA matches class fixtures
    classA.schoolId = schoolA._id;
    classB.schoolId = schoolA._id;
    // Ensure teacherOne is the homeroom teacher of classA
    classA.homeroomTeacherId = teacherOne._id;
    // Sync teacher/admin schoolId
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolA._id;
    admin.schoolId = schoolA._id;
    studentOne.schoolId = schoolA._id;
    // Make sure studentIdInA matches studentOne
    classA.studentIds = [studentOne._id];
    // Create another student in same school, not in classA
    const otherStudent = {
      _id: mongoose.Types.ObjectId(),
      name: 'Other Student In School',
      email: 'other.student@schoolA.vn',
      password: 'password1',
      role: 'student',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    await insertSchools([schoolA]);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne, otherStudent]);
    await insertClasses([classA, classB]);
  });

  it('should return students in same school excluding those already in class (admin caller)', async () => {
    const result = await classService.getAvailableStudents(classA._id.toString(), {}, admin);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].email).toBe('other.student@schoolA.vn');
    expect(result.total).toBe(1);
  });

  it('should return students in same school excluding those already in class (homeroom teacher caller)', async () => {
    const result = await classService.getAvailableStudents(classA._id.toString(), {}, teacherOne);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].email).toBe('other.student@schoolA.vn');
  });

  it('should throw 403 when teacher is not homeroom or subject teacher of class', async () => {
    // teacherTwo is not assigned to classA
    await expect(
      classService.getAvailableStudents(classA._id.toString(), {}, teacherTwo)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should throw 404 when class does not exist', async () => {
    const nonExistentId = mongoose.Types.ObjectId().toString();
    await expect(
      classService.getAvailableStudents(nonExistentId, {}, admin)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should filter by search keyword (case-insensitive, partial match)', async () => {
    const result = await classService.getAvailableStudents(classA._id.toString(), { search: 'OTHER' }, admin);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toContain('Other');
  });

  it('should respect limit and page query params (limit=5, page=1)', async () => {
    // Insert one more student to test pagination boundary
    const extraStudent = {
      _id: mongoose.Types.ObjectId(),
      name: 'Extra Student',
      email: 'extra@schoolA.vn',
      password: 'password1',
      role: 'student',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    await mongoose.model('User').insertMany([extraStudent]);

    const result = await classService.getAvailableStudents(
      classA._id.toString(),
      { page: 1, limit: 1 },
      admin
    );
    expect(result.results).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.total).toBe(2);
    expect(result.pages).toBe(2);
  });
});
```

**Lưu ý:** Test này dùng DB thật (`setupTestDB` connect tới MongoDB). Cần đảm bảo file `jest.config.js` setup đúng (xem `server/package.json` script test).

- [ ] **Step 2: Chạy test**

```bash
cd server && npm test -- --testPathPattern=class.service.test.js
```
Expected: tất cả test pass.

Nếu fail vì `schoolIdA` từ `class.fixture.js` không khớp với `schoolA._id` từ `school.fixture.js`, fix bằng cách thay đổi fixture hoặc test setup. Tham khảo `question.service.test.js` (cùng project) để xem pattern.

- [ ] **Step 3: Commit**

```bash
cd server && git add tests/unit/services/class.service.test.js
git commit -m "test(server): unit tests for classService.getAvailableStudents"
```

---

## Task 6: Integration test cho `GET /api/v1/classes/:id/available-students`

**Files:**
- Create: `server/tests/integration/classes/available-students.test.js`

- [ ] **Step 1: Tạo thư mục và file**

Tạo file `server/tests/integration/classes/available-students.test.js`:

```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { classA, classB, classIdA, insertClasses } = require('../../fixtures/class.fixture');
const { admin, teacherOne, teacherTwo, studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const { userOneAccessToken, adminAccessToken, teacherOneAccessToken, teacherTwoAccessToken } = require('../../fixtures/token.fixture');

setupTestDB();

describe('GET /api/v1/classes/:id/available-students', () => {
  let otherStudent;

  beforeEach(async () => {
    otherStudent = {
      _id: mongoose.Types.ObjectId(),
      name: 'Other Student',
      email: 'other.student@test.com',
      password: 'password1',
      role: 'student',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    classA.schoolId = schoolA._id;
    classB.schoolId = schoolA._id;
    classA.homeroomTeacherId = teacherOne._id;
    classA.studentIds = [studentOne._id];
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolA._id;
    admin.schoolId = schoolA._id;
    studentOne.schoolId = schoolA._id;

    await insertSchools([schoolA]);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne, otherStudent]);
    await insertClasses([classA, classB]);
  });

  test('should return 401 if no access token', async () => {
    await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 403 if teacher is not homeroom/subject teacher of class', async () => {
    await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .set('Authorization', `Bearer ${teacherTwoAccessToken}`)
      .expect(httpStatus.FORBIDDEN);
  });

  test('should return 200 with available students for homeroom teacher', async () => {
    const res = await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].email).toBe('other.student@test.com');
    expect(res.body.total).toBe(1);
  });

  test('should return 200 with available students for admin', async () => {
    const res = await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
  });

  test('should respect search query', async () => {
    const res = await request(app)
      .get(`/api/v1/classes/${classIdA.toString()}/available-students?search=other`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
  });

  test('should return 400 for invalid class id', async () => {
    await request(app)
      .get('/api/v1/classes/invalid-id/available-students')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.BAD_REQUEST);
  });

  test('should return 404 for non-existent class', async () => {
    const nonExistentId = mongoose.Types.ObjectId().toString();
    await request(app)
      .get(`/api/v1/classes/${nonExistentId}/available-students`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.NOT_FOUND);
  });
});
```

- [ ] **Step 2: Đảm bảo các token fixture tồn tại**

Mở `server/tests/fixtures/token.fixture.js`, kiểm tra có `teacherOneAccessToken` và `teacherTwoAccessToken`. Nếu KHÔNG có, cần thêm vào:

```javascript
// In server/tests/fixtures/token.fixture.js
const { teacherOne, teacherTwo, admin } = require('./user.fixture');

const teacherOneAccessToken = tokenService.generateToken(teacherOne._id, tokenTypes.ACCESS, '7d');
const teacherTwoAccessToken = tokenService.generateToken(teacherTwo._id, tokenTypes.ACCESS, '7d');

// Thêm vào module.exports
```

- [ ] **Step 3: Chạy integration test**

```bash
cd server && npm test -- --testPathPattern=available-students.test.js
```
Expected: tất cả test pass.

- [ ] **Step 4: Commit**

```bash
cd server && git add tests/integration/classes/available-students.test.js tests/fixtures/token.fixture.js
git commit -m "test(server): integration tests for available-students endpoint"
```

---

## Task 7: Thêm validation schema `getAvailableTeachers` (school-scoped)

**Files:**
- Modify: `server/src/validations/school.validation.js` (thêm schema)
- Create: `server/tests/unit/validations/school.validation.test.js`

- [ ] **Step 1: Mở `server/src/validations/school.validation.js`**

- [ ] **Step 2: Thêm schema `getAvailableTeachers`**

Chèn NGAY TRƯỚC dòng `module.exports = {` (dòng 73):

```javascript
const getAvailableTeachers = {
  params: id,
  query: Joi.object().keys({
    search: Joi.string().trim().max(100).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
```

- [ ] **Step 3: Export schema mới**

Sửa block `module.exports = {`:

```javascript
module.exports = {
  createSchool,
  updateSchool,
  getSchool,
  deleteSchool,
  getAvailableTeachers,
};
```

- [ ] **Step 4: Tạo file test `server/tests/unit/validations/school.validation.test.js`**

```javascript
const Joi = require('joi');
const { getAvailableTeachers } = require('../../../src/validations/school.validation');

describe('School validation schemas', () => {
  describe('getAvailableTeachers', () => {
    const { params, query } = getAvailableTeachers;

    test('should accept valid id with all query params', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { search: 'Tran', page: 1, limit: 20 },
      });
      expect(error).toBeUndefined();
    });

    test('should accept request without any query params', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: {},
      });
      expect(error).toBeUndefined();
    });

    test('should reject invalid id', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: 'not-an-objectid' },
        query: {},
      });
      expect(error).toBeDefined();
    });

    test('should reject limit greater than 100', () => {
      const { error } = Joi.compile({ params, query }).validate({
        params: { id: '507f1f77bcf86cd799439011' },
        query: { limit: 500 },
      });
      expect(error).toBeDefined();
    });
  });
});
```

- [ ] **Step 5: Chạy test**

```bash
cd server && npm test -- --testPathPattern=school.validation.test.js
```
Expected: tất cả test pass.

- [ ] **Step 6: Commit**

```bash
cd server && git add src/validations/school.validation.js tests/unit/validations/school.validation.test.js
git commit -m "feat(server): add getAvailableTeachers validation schema"
```

---

## Task 8: Implement `schoolService.getAvailableTeachers` + controller + route

**Files:**
- Modify: `server/src/services/school.service.js`
- Modify: `server/src/controllers/school.controller.js`
- Modify: `server/src/routes/v1/school.route.js`

- [ ] **Step 1: Mở `server/src/services/school.service.js`**

- [ ] **Step 2: Thêm method `getAvailableTeachers`**

Chèn NGAY TRƯỚC dòng `module.exports = new SchoolService();` (dòng 65):

```javascript
  // ── Available Teachers (for class create/edit dropdown) ────────────────────
  async getAvailableTeachers(schoolId, query = {}, requestingUser = null) {
    // 1. Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      throw new ApiError(httpStatus.NOT_FOUND, 'School not found');
    }

    // 2. Authorization: admin bypass; otherwise schoolId must match
    if (requestingUser && requestingUser.role !== 'admin') {
      if (!requestingUser.schoolId || requestingUser.schoolId.toString() !== schoolId.toString()) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only view teachers in your own school');
      }
    }

    // 3. Parse pagination
    const { page, limit, skip } = parsePagination(query);

    // 4. Build filter
    const filter = {
      schoolId,
      role: { $in: ['teacher', 'admin'] },
    };

    if (query.search && String(query.search).trim().length > 0) {
      const escaped = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 5. Query
    const [results, total] = await Promise.all([
      User.find(filter)
        .select('name email role avatarUrl isActive')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }
```

- [ ] **Step 3: Thêm import `httpStatus` và `User`**

Sửa dòng đầu của `server/src/services/school.service.js`:

```javascript
const httpStatus = require('http-status');
const { School, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination } = require('../utils/parsePagination');
```

- [ ] **Step 4: Mở `server/src/controllers/school.controller.js`**

- [ ] **Step 5: Thêm controller method**

Chèn NGAY TRƯỚC dòng `module.exports = {` (dòng 49):

```javascript
const getAvailableTeachers = catchAsync(async (req, res) => {
  const result = await schoolService.getAvailableTeachers(req.params.id, req.query, req.user);
  res.send(result);
});
```

- [ ] **Step 6: Export method mới**

Sửa block `module.exports = {`:

```javascript
module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getGradeDistribution,
  getAvailableTeachers,
};
```

- [ ] **Step 7: Mở `server/src/routes/v1/school.route.js`**

- [ ] **Step 8: Thêm route**

Chèn NGAY TRƯỚC dòng `module.exports = router;` (dòng 24):

```javascript
router
  .route('/:id/available-teachers')
  .get(auth(), validate(schoolValidation.getAvailableTeachers), schoolController.getAvailableTeachers);
```

- [ ] **Step 9: Verify boot OK**

```bash
cd server && node -e "require('./src/app')" && echo "OK"
```
Expected: `OK`.

- [ ] **Step 10: Commit**

```bash
cd server && git add src/services/school.service.js src/controllers/school.controller.js src/routes/v1/school.route.js
git commit -m "feat(server): add GET /schools/:id/available-teachers endpoint"
```

---

## Task 9: Integration test cho `GET /api/v1/schools/:id/available-teachers`

**Files:**
- Create: `server/tests/integration/schools/available-teachers.test.js`

- [ ] **Step 1: Tạo file**

```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { schoolA, schoolB, insertSchools } = require('../../fixtures/school.fixture');
const { admin, teacherOne, teacherTwo, studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken, teacherOneAccessToken, teacherTwoAccessToken } = require('../../fixtures/token.fixture');

setupTestDB();

describe('GET /api/v1/schools/:id/available-teachers', () => {
  let otherTeacher;
  let otherAdmin;

  beforeEach(async () => {
    otherTeacher = {
      _id: mongoose.Types.ObjectId(),
      name: 'Teacher In School A',
      email: 'teacher.a@test.com',
      password: 'password1',
      role: 'teacher',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    otherAdmin = {
      _id: mongoose.Types.ObjectId(),
      name: 'Admin In School A',
      email: 'admin.a@test.com',
      password: 'password1',
      role: 'admin',
      isEmailVerified: false,
      schoolId: schoolA._id,
    };
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolB._id;
    admin.schoolId = schoolA._id;
    studentOne.schoolId = schoolA._id;

    await insertSchools([schoolA, schoolB]);
    await insertUsers([admin, teacherOne, teacherTwo, studentOne, otherTeacher, otherAdmin]);
  });

  test('should return 401 if no access token', async () => {
    await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 200 with teachers in same school for teacher caller', async () => {
    const res = await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    // teacherOne + admin (from fixture) + otherTeacher + otherAdmin
    const emails = res.body.results.map((u) => u.email).sort();
    expect(emails).toContain(teacherOne.email);
    expect(emails).toContain('teacher.a@test.com');
    expect(emails).toContain('admin.a@test.com');
    // teacherTwo is in schoolB, should not appear
    expect(emails).not.toContain(teacherTwo.email);
  });

  test('should return 403 for teacher from a different school', async () => {
    await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers`)
      .set('Authorization', `Bearer ${teacherTwoAccessToken}`)
      .expect(httpStatus.FORBIDDEN);
  });

  test('should return 200 for admin (bypass school check)', async () => {
    const res = await request(app)
      .get(`/api/v1/schools/${schoolB._id.toString()}/available-teachers`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
  });

  test('should filter by search keyword', async () => {
    const res = await request(app)
      .get(`/api/v1/schools/${schoolA._id.toString()}/available-teachers?search=teacher.a`)
      .set('Authorization', `Bearer ${teacherOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].email).toBe('teacher.a@test.com');
  });

  test('should return 404 for non-existent school', async () => {
    const nonExistentId = mongoose.Types.ObjectId().toString();
    await request(app)
      .get(`/api/v1/schools/${nonExistentId}/available-teachers`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.NOT_FOUND);
  });
});
```

- [ ] **Step 2: Chạy test**

```bash
cd server && npm test -- --testPathPattern=available-teachers.test.js
```
Expected: tất cả test pass.

- [ ] **Step 3: Chạy TOÀN BỘ server test để đảm bảo không regress**

```bash
cd server && npm test
```
Expected: tất cả test pass (cũ + mới).

- [ ] **Step 4: Commit**

```bash
cd server && git add tests/integration/schools/available-teachers.test.js
git commit -m "test(server): integration tests for available-teachers endpoint"
```

---

# PHẦN 2: MOBILE

## Task 10: Thay thế `getStudents()` bằng `getAvailableStudents()` trong service

**Files:**
- Modify: `client/mobile/lib/core/network/user_service.dart`
- Create: `client/mobile/test/core/network/user_service_test.dart`

- [ ] **Step 1: Mở `client/mobile/lib/core/network/user_service.dart`**

- [ ] **Step 2: Xóa method `getStudents` cũ**

Xóa toàn bộ block method `getStudents` (từ `Future<PaginatedUsers> getStudents({` đến `});` kết thúc của nó, gồm cả phần body bên trong). Method này nằm ngay sau `final ApiClient _apiClient;`.

- [ ] **Step 3: Thêm method `getAvailableStudents` mới**

Chèn NGAY SAU dòng `final ApiClient _apiClient;` (và trước `Future<PaginatedUsers> getTeachers(`):

```dart
  Future<PaginatedUsers> getAvailableStudents({
    required String classId,
    int page = 1,
    int limit = 20,
    String? search,
  }) {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return _apiClient.get<PaginatedUsers>(
      '${ApiConstants.classes}/$classId/available-students',
      queryParameters: queryParams,
      parser: (data) => PaginatedUsers.fromJson(data as Map<String, dynamic>),
    );
  }
```

- [ ] **Step 4: Thêm `classes` constant vào `ApiConstants`**

Mở `client/mobile/lib/core/constants/app_constants.dart`, thêm dòng này cùng chỗ với `static const String users = '/users';`:

```dart
  static const String classes = '/classes';
```

- [ ] **Step 5: Tạo file test `client/mobile/test/core/network/user_service_test.dart`**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/core/network/user_service.dart';
import 'package:smart_grading/core/network/api_client.dart';
import 'package:smart_grading/domain/entities/user.entity.dart';

class _FakeApiClient extends ApiClient {
  _FakeApiClient() : super();
  final List<Map<String, dynamic>> calls = [];

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic data)? parser,
  }) async {
    calls.add({'path': path, 'query': queryParameters ?? {}});
    return parser!({
      'results': [
        {
          'id': '65f0a1b2c3d4e5f6a7b8c9d0',
          'name': 'Nguyễn Văn An',
          'email': 'an.nv@school.edu.vn',
          'role': 'student',
          'studentCode': 'HS10003',
          'isActive': true,
        }
      ],
      'page': 1,
      'limit': 20,
      'total': 1,
      'pages': 1,
    });
  }
}

void main() {
  group('UserService.getAvailableStudents', () {
    test('builds correct URL with classId and pagination params', () async {
      final fake = _FakeApiClient();
      final service = UserService(apiClient: fake);

      await service.getAvailableStudents(
        classId: '507f1f77bcf86cd799439011',
        page: 1,
        limit: 20,
      );

      expect(fake.calls, hasLength(1));
      expect(fake.calls.first['path'], '/classes/507f1f77bcf86cd799439011/available-students');
      expect(fake.calls.first['query'], {'page': 1, 'limit': 20});
    });

    test('includes search param when provided', () async {
      final fake = _FakeApiClient();
      final service = UserService(apiClient: fake);

      await service.getAvailableStudents(
        classId: '507f1f77bcf86cd799439011',
        search: 'Nguyen',
      );

      expect(fake.calls.first['query']['search'], 'Nguyen');
    });

    test('parses PaginatedUsers correctly', () async {
      final fake = _FakeApiClient();
      final service = UserService(apiClient: fake);

      final result = await service.getAvailableStudents(
        classId: '507f1f77bcf86cd799439011',
      );

      expect(result.results, hasLength(1));
      expect(result.results.first.name, 'Nguyễn Văn An');
      expect(result.results.first.studentCode, 'HS10003');
      expect(result.total, 1);
      expect(result.page, 1);
      expect(result.limit, 20);
    });
  });
}
```

- [ ] **Step 6: Verify imports đúng**

Nếu `ApiClient` cần `baseUrl` trong constructor, xem file gốc để handle. Nếu `_FakeApiClient()` không work, điều chỉnh theo pattern có sẵn trong project.

- [ ] **Step 7: Chạy test**

```bash
cd client/mobile && flutter test test/core/network/user_service_test.dart
```
Expected: tất cả test pass.

- [ ] **Step 8: Commit**

```bash
cd client/mobile && git add lib/core/network/user_service.dart lib/core/constants/app_constants.dart test/core/network/user_service_test.dart
git commit -m "feat(mobile): replace getStudents with getAvailableStudents"
```

---

## Task 11: Cập nhật call site trong `add_students_page.dart`

**Files:**
- Modify: `client/mobile/lib/presentation/pages/add_students_page.dart`

- [ ] **Step 1: Mở file `add_students_page.dart`**

- [ ] **Step 2: Tìm dòng 60 (call site)**

Dòng này nằm trong method `_loadExistingStudents()`. Tìm:
```dart
final students = await _userService.getStudents();
```

- [ ] **Step 3: Thay bằng call mới**

```dart
final students = await _userService.getAvailableStudents(
  classId: widget.cls.id,
  limit: 50,
);
```

- [ ] **Step 4: Verify không còn reference nào đến `getStudents` cũ**

```bash
cd client/mobile && grep -rn "getStudents" lib/
```
Expected: không có kết quả (ngoại trừ comment nếu có).

- [ ] **Step 5: Run flutter analyze**

```bash
cd client/mobile && flutter analyze lib/presentation/pages/add_students_page.dart lib/core/network/user_service.dart
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd client/mobile && git add lib/presentation/pages/add_students_page.dart
git commit -m "fix(mobile): call getAvailableStudents in AddStudentsPage"
```

---

# PHẦN 3: WEB

## Task 12: Cập nhật `classStore.fetchTeachers` URL

**Files:**
- Modify: `client/web/src/presentation/store/classStore.ts`

- [ ] **Step 1: Mở file `client/web/src/presentation/store/classStore.ts`**

- [ ] **Step 2: Tìm method `fetchTeachers` (line 210-221)**

- [ ] **Step 3: Sửa URL endpoint**

Tìm:
```typescript
const response = await apiService.get<PaginatedTeachers>('/users', { params });
```

Thay bằng:
```typescript
const response = await apiService.get<PaginatedTeachers>(
  `/schools/${schoolId}/available-teachers`,
  { params }
);
```

- [ ] **Step 4: Sửa params (bỏ `role`, giữ `schoolId` vì đã có trong URL)**

Tìm:
```typescript
const params: Record<string, string | number> = { role: 'teacher', limit: 100 };
if (schoolId) params.schoolId = schoolId;
```

Thay bằng:
```typescript
const params: Record<string, string | number> = { limit: 100 };
```

- [ ] **Step 5: Add defensive check nếu schoolId null (admin không thuộc trường nào)**

Ngay sau dòng `const schoolId = user?.schoolId;`, thêm:

```typescript
if (!schoolId) {
  console.error('Cannot fetch teachers: user has no schoolId');
  set({ teachers: [] });
  return;
}
```

- [ ] **Step 6: Run web lint/check**

```bash
cd client/web && npx tsc --noEmit src/presentation/store/classStore.ts
```
Expected: no type errors.

Nếu project có `npm run lint`:
```bash
cd client/web && npm run lint -- src/presentation/store/classStore.ts
```

- [ ] **Step 7: Commit**

```bash
cd client/web && git add src/presentation/store/classStore.ts
git commit -m "fix(web): use /schools/:id/available-teachers instead of /users"
```

---

# PHẦN 4: VERIFICATION CUỐI

## Task 13: End-to-end verification

**Files:** None (chỉ verify)

- [ ] **Step 1: Run tất cả server tests**

```bash
cd server && npm test
```
Expected: ALL tests pass (cũ + mới). Nếu fail, debug và fix trước khi tiếp.

- [ ] **Step 2: Run tất cả mobile tests**

```bash
cd client/mobile && flutter test
```
Expected: ALL tests pass.

- [ ] **Step 3: Build server (smoke check)**

```bash
cd server && npm run build 2>&1 || npm run lint
```
Expected: no errors. (Nếu không có build script, bỏ qua bước này.)

- [ ] **Step 4: Start server + manual test API**

Start server:
```bash
cd server && npm start
```

Trong terminal khác, test bằng curl (cần token thật từ app):
```bash
# Replace TOKEN and CLASS_ID
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/v1/classes/CLASS_ID/available-students?search=Nguyen"
```
Expected: 200 với JSON `{ results: [...], page, limit, total, pages }`.

Test endpoint teachers:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/v1/schools/SCHOOL_ID/available-teachers"
```
Expected: 200 với list teachers.

Test 403 (teacher khác trường):
```bash
# Login as teacher from different school, try to access school A's teachers
curl -H "Authorization: Bearer TOKEN_FROM_SCHOOL_B" \
  "http://localhost:5000/api/v1/schools/SCHOOL_A_ID/available-teachers"
```
Expected: 403.

- [ ] **Step 5: Start mobile app, test thủ công**

```bash
cd client/mobile && flutter run
```

Flow test:
1. Login as teacher
2. Navigate: Classes → chọn 1 lớp → tab Học sinh → "Thêm học sinh"
3. **Verify:** list học sinh load được (không còn snackbar "Lỗi tải danh sách học sinh: Forbidden")
4. Type vào search box → verify filter hoạt động
5. Chọn 1-2 học sinh → "Confirm Addition" → verify thành công

- [ ] **Step 6: Start web app, test thủ công**

```bash
cd client/web && npm start
```

Flow test:
1. Login as teacher
2. Navigate: Classes → "Tạo lớp mới"
3. **Verify:** dropdown "Giáo viên chủ nhiệm" load được teachers (không còn lỗi)

- [ ] **Step 7: Final commit nếu có fixes**

Nếu bước 4-6 cần fix, commit:
```bash
git add .
git commit -m "fix: post-verification fixes for available-* endpoints"
```

---

# Acceptance Criteria Checklist

- [ ] Server: tất cả test pass (Task 1-9)
- [ ] Mobile: tất cả test pass (Task 10)
- [ ] Web: type check pass (Task 12)
- [ ] Manual: teacher mở "Add Students" ở mobile không còn 403
- [ ] Manual: web teacher dropdown load được
- [ ] Manual: API trả 403 cho teacher không có quyền
- [ ] Manual: API trả 404 cho classId không tồn tại

---

# Out of Scope (đã quyết trong spec)

- Endpoint `GET /classes/:id/available-teachers` (class-scoped teachers) — YAGNI
- Endpoint cho "available parents" — không có use case
- Cache layer — không cần
- Sửa mobile `create_edit_class_page.dart` (cũng gọi `getTeachers()` admin endpoint) — đợt riêng

---

# Notes cho người thực thi

1. **Test phụ thuộc DB thật:** Unit test cho service (Task 5) và integration test (Task 6, 9) cần MongoDB. File `server/tests/utils/setupTestDB.js` handle việc này. Đảm bảo `server/jest.config.js` (nếu có) hoặc `package.json` setup `globalSetup/globalTeardown` đúng.

2. **Fixture IDs:** Mỗi test `beforeEach` reset DB. Khi thêm test mới, ĐẢM BẢO gán `schoolId` cho users và `homeroomTeacherId` cho class trong `beforeEach` — các fixture không tự link với nhau.

3. **PowerShell + git commit:** Trên Windows PowerShell, không dùng HEREDOC `$(cat <<'EOF')` cho commit message. Dùng `git commit -F path/to/message.txt` thay thế.

4. **Parallel agent:** Repo có nhiều agent chạy song song (xem git log có OMR commits). Trước khi commit, chạy `git status --short` để xem có file nào ngoài ý muốn không.

5. **Backward compatibility:** KHÔNG xóa endpoint `/api/v1/users` cũ. Admin vẫn dùng được. Chỉ thay đổi call site ở mobile + web.
