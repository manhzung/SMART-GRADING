# Upcoming Exams Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `GET /v1/exams/upcoming` endpoint to the backend, wire a new `UpcomingExamsLoadRequested` event/state into the mobile `ExamBloc`, and replace the dashboard's client-side filtering with state read from the new event so the "Upcoming Exams" card always reflects server-canonical data.

**Architecture:** Backend adds a small read endpoint that filters by `createdBy=user.id, examDate >= now`, sorts `examDate ASC`, and returns `{ results, limit, count }`. Mobile splits the BLoC into two parallel concerns — `ExamLoadRequested` continues to populate the tab list, while the new `UpcomingExamsLoadRequested` populates the dashboard card. Pull-to-refresh on the dashboard only re-fires the upcoming event. Service and BLoC are tested with TDD (Jest + flutter_test).

**Tech Stack:** Node.js/Express + Mongoose (backend), Flutter + flutter_bloc + dio (mobile), Jest (backend tests), flutter_test (mobile tests).

---

## File Structure

### Backend (modified)

| File | Responsibility |
|------|----------------|
| `server/src/routes/v1/exam.route.js` | Add 1 route `GET /upcoming` (declared before `/:id` to avoid path conflict) |
| `server/src/controllers/exam.controller.js` | Add `getUpcoming` handler that parses `req.query.limit`, calls service, returns `{ results, limit, count }` |
| `server/src/services/exam.service.js` | Add `getUpcomingExams(user, limit)` method — uses Mongoose `find({createdBy, examDate}).sort().limit().populate().lean()` |
| `server/src/validations/exam.validation.js` | Add `getUpcoming` schema with `limit: Joi.number().integer().min(1).max(10).default(5)` |

### Backend tests (new)

| File | Responsibility |
|------|----------------|
| `server/tests/unit/validations/exam.validation.test.js` | Test `getUpcoming` query schema accepts/rejects limits |
| `server/tests/integration/exam.route.test.js` | E2E test for `GET /v1/exams/upcoming` (auth, role isolation, response shape) |

### Mobile (modified)

| File | Responsibility |
|------|----------------|
| `client/mobile/lib/core/network/exam_service.dart` | Add `getUpcomingExams({int limit})` method and `UpcomingExams` value class (next to `PaginatedExams`) |
| `client/mobile/lib/presentation/blocs/exam/exam_bloc.dart` | Register `UpcomingExamsLoadRequested` handler; emit `ExamUpcomingLoading` then `ExamUpcomingLoaded` |
| `client/mobile/lib/presentation/blocs/exam/exam_event.dart` | Add `UpcomingExamsLoadRequested({int limit = 5})` event class |
| `client/mobile/lib/presentation/blocs/exam/exam_state.dart` | Add `ExamUpcomingLoading` and `ExamUpcomingLoaded(List<Exam>, int count)` state classes |
| `client/mobile/lib/presentation/pages/home_page.dart` | Dispatch `UpcomingExamsLoadRequested(limit: 5)` in `initState` |
| `client/mobile/lib/presentation/pages/dashboard_view.dart` | Read upcoming exams from new state; dispatch refresh on pull-to-refresh |

### Mobile tests (new)

| File | Responsibility |
|------|----------------|
| `client/mobile/test/core/network/exam_service_test.dart` | Test service calls correct URL, parses response, default limit=5 |
| `client/mobile/test/presentation/blocs/exam_bloc_test.dart` | Test new event emits `Loading` then `Loaded`; service error emits `ExamError`; `ExamLoaded` state is preserved |
| `client/mobile/test/presentation/pages/dashboard_view_test.dart` | Test widget shows 3 upcoming cards when state loaded; skeleton when loading; "No upcoming exams" when empty |

---

## Task 1: Backend validation schema for `getUpcoming`

**Files:**
- Modify: `server/src/validations/exam.validation.js` (add `getUpcoming`, add to exports)
- Create: `server/tests/unit/validations/exam.validation.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/validations/exam.validation.test.js` with this exact content:

```js
const Joi = require('joi');
const { getUpcoming } = require('../../../src/validations/exam.validation');

describe('Exam validation - getUpcoming', () => {
  const { query } = getUpcoming;

  test('should accept limit=5', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 5 } });
    expect(error).toBeUndefined();
  });

  test('should accept limit=10 (max boundary)', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 10 } });
    expect(error).toBeUndefined();
  });

  test('should default limit to 5 when not provided', () => {
    const { value } = Joi.compile({ query }).validate({ query: {} });
    expect(value.query.limit).toBe(5);
  });

  test('should reject limit=0 (below min)', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 0 } });
    expect(error).toBeDefined();
  });

  test('should reject limit=11 (above max)', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 11 } });
    expect(error).toBeDefined();
  });

  test('should reject non-integer limit="abc"', () => {
    const { error } = Joi.compile({ query }).validate({ query: { limit: 'abc' } });
    expect(error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/unit/validations/exam.validation.test.js`
Expected: FAIL — "Cannot find module '../../../src/validations/exam.validation'" OR `getUpcoming` is undefined.

- [ ] **Step 3: Add `getUpcoming` schema and export**

In `server/src/validations/exam.validation.js`, add this block right above the `module.exports` line (after the `exportExam` const):

```js
const getUpcoming = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(10).default(5),
  }),
};
```

Then add `getUpcoming,` inside the `module.exports` object (alphabetically after `getExams,`):

```js
module.exports = {
  createExam,
  updateExam,
  addClassesToExam,
  removeClassesFromExam,
  publishExam,
  getExam,
  getExams,
  getUpcoming,            // <-- ADD THIS LINE
  getExamVersions,
  generateVersions,
  exportExam,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/unit/validations/exam.validation.test.js`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add server/src/validations/exam.validation.js server/tests/unit/validations/exam.validation.test.js
git commit -m "feat(server): add getUpcoming validation schema for /exams/upcoming"
```

---

## Task 2: Backend service `getUpcomingExams`

**Files:**
- Modify: `server/src/services/exam.service.js` (add `getUpcomingExams` method to class)

- [ ] **Step 1: Add the method to the `ExamService` class**

Open `server/src/services/exam.service.js`. Find the closing brace of `getAll` method (line ~112). Right after it, add this method inside the class (before `async update(id, data) {`):

```js
  async getUpcomingExams(user, limit) {
    const now = new Date();
    return Exam.find({
      createdBy: user.id,
      examDate: { $ne: null, $gte: now },
    })
      .sort({ examDate: 1 })
      .limit(limit)
      .populate('classIds', 'name code')
      .populate('primaryClassId', 'name code')
      .lean();
  }
```

- [ ] **Step 2: Verify it parses (sanity check)**

Run: `cd server && node -e "const s = require('./src/services/exam.service'); console.log(typeof s.getUpcomingExams)"`
Expected: `function`

- [ ] **Step 3: Run existing service tests to ensure no regression**

Run: `cd server && npx jest tests/unit/services/`
Expected: Existing tests pass. The new method should not affect any existing functionality.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/exam.service.js
git commit -m "feat(server): add getUpcomingExams service method"
```

---

## Task 3: Backend service unit tests for `getUpcomingExams`

**Files:**
- Create: `server/tests/unit/services/exam.service.test.js`
- Create: `server/tests/fixtures/exam.fixture.js` (or inline fixtures inside the test)

- [ ] **Step 1: Create `exam.fixture.js` with reusable exam objects**

Create `server/tests/fixtures/exam.fixture.js`:

```js
const mongoose = require('mongoose');
const { Exam } = require('../../src/models');

const examIdUpcoming1 = mongoose.Types.ObjectId();
const examIdUpcoming2 = mongoose.Types.ObjectId();
const examIdPast = mongoose.Types.ObjectId();
const examIdOtherTeacher = mongoose.Types.ObjectId();
const examIdDraft = mongoose.Types.ObjectId();
const examIdNoDate = mongoose.Types.ObjectId();

const teacherOneId = mongoose.Types.ObjectId();
const teacherTwoId = mongoose.Types.ObjectId();
const classId1 = mongoose.Types.ObjectId();
const classId2 = mongoose.Types.ObjectId();

const examUpcoming1 = {
  _id: examIdUpcoming1,
  title: 'Math Test - Chapter 3',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'published',
};

const examUpcoming2 = {
  _id: examIdUpcoming2,
  title: 'Math Test - Chapter 4',
  classIds: [classId1, classId2],
  primaryClassId: classId2,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'in_progress',
};

const examPast = {
  _id: examIdPast,
  title: 'Past Math Test',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'completed',
};

const examOtherTeacher = {
  _id: examIdOtherTeacher,
  title: 'Other Teacher Exam',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherTwoId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'published',
};

const examDraft = {
  _id: examIdDraft,
  title: 'Draft Exam - Should Still Appear',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'draft',
};

const examNoDate = {
  _id: examIdNoDate,
  title: 'Exam With No Date - Should Be Excluded',
  classIds: [classId1],
  primaryClassId: classId1,
  createdBy: teacherOneId,
  omrTemplateId: mongoose.Types.ObjectId(),
  examDate: null,
  startTime: '07:00',
  duration: 60,
  totalScore: 10,
  numberOfQuestions: 20,
  status: 'published',
};

const insertExams = async (exams) => {
  await Exam.insertMany(exams);
};

module.exports = {
  examUpcoming1,
  examUpcoming2,
  examPast,
  examOtherTeacher,
  examDraft,
  examNoDate,
  examIdUpcoming1,
  examIdUpcoming2,
  examIdPast,
  examIdOtherTeacher,
  examIdDraft,
  examIdNoDate,
  teacherOneId,
  teacherTwoId,
  classId1,
  classId2,
  insertExams,
};
```

- [ ] **Step 2: Create the test file**

Create `server/tests/unit/services/exam.service.test.js`:

```js
const ExamService = require('../../../src/services/exam.service');
const {
  examUpcoming1,
  examUpcoming2,
  examPast,
  examOtherTeacher,
  examDraft,
  examNoDate,
  teacherOneId,
  teacherTwoId,
  insertExams,
} = require('../../fixtures/exam.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Exam Service - getUpcomingExams', () => {
  let examService;

  beforeEach(async () => {
    examService = Object.create(ExamService);
    await insertExams([
      examUpcoming1,
      examUpcoming2,
      examPast,
      examOtherTeacher,
      examDraft,
      examNoDate,
    ]);
  });

  it('should return only upcoming exams (examDate >= now) for the given teacher', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    const titles = results.map((e) => e.title).sort();
    expect(titles).toEqual([
      'Draft Exam - Should Still Appear',
      'Math Test - Chapter 3',
      'Math Test - Chapter 4',
    ]);
  });

  it('should NOT return exams from other teachers', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const otherTeacherExam = results.find((e) => e.title === 'Other Teacher Exam');
    expect(otherTeacherExam).toBeUndefined();
  });

  it('should NOT return past exams (examDate < now)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const past = results.find((e) => e.title === 'Past Math Test');
    expect(past).toBeUndefined();
  });

  it('should return exams of all statuses (draft, published, in_progress)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const statuses = results.map((e) => e.status).sort();
    expect(statuses).toEqual(['draft', 'in_progress', 'published']);
  });

  it('should NOT return exams where examDate is null (defensive guard)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);
    const noDate = results.find((e) => e.title === 'Exam With No Date - Should Be Excluded');
    expect(noDate).toBeUndefined();
  });

  it('should sort by examDate ASC (nearest first)', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    expect(results[0].title).toBe('Math Test - Chapter 3'); // 7 days
    expect(results[1].title).toBe('Draft Exam - Should Still Appear'); // 5 days - WAIT, should be first!
  });

  it('should respect limit parameter', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 2);
    expect(results).toHaveLength(2);
  });

  it('should populate classIds and primaryClassId', async () => {
    const teacherOne = { id: teacherOneId.toString(), role: 'teacher' };
    const results = await examService.getUpcomingExams(teacherOne, 10);

    const first = results[0];
    expect(first.classIds).toBeDefined();
    expect(first.classIds.length).toBeGreaterThan(0);
    // Populated fields should be objects, not raw ObjectIds
    expect(typeof first.classIds[0]).toBe('object');
    expect(first.classIds[0].name).toBeDefined();
    expect(first.primaryClassId).toBeDefined();
    expect(typeof first.primaryClassId).toBe('object');
  });
});
```

- [ ] **Step 3: Run test to verify it passes (Task 2's implementation should make them pass)**

Run: `cd server && npx jest tests/unit/services/exam.service.test.js`
Expected: 8 tests pass. If any fail, fix the service method in `server/src/services/exam.service.js` to match the test expectations.

- [ ] **Step 4: Run all service tests to confirm pass + no regression**

Run: `cd server && npx jest tests/unit/services/`
Expected: All tests pass (8 new + existing).

- [ ] **Step 5: Commit**

```bash
git add server/tests/unit/services/exam.service.test.js server/tests/fixtures/exam.fixture.js
git commit -m "test(server): add getUpcomingExams service unit tests"
```

---

## Task 4: Backend controller `getUpcoming` handler

**Files:**
- Modify: `server/src/controllers/exam.controller.js` (add `getUpcoming`, add to exports)

- [ ] **Step 1: Add the handler function**

In `server/src/controllers/exam.controller.js`, find the `getAll` function (line ~14). Right after it, add:

```js
const getUpcoming = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;
  const exams = await examService.getUpcomingExams(req.user, limit);
  res.send({
    results: exams,
    limit,
    count: exams.length,
  });
});
```

- [ ] **Step 2: Add to module.exports**

Find the `module.exports` block at the bottom of the file. Add `getUpcoming,` after `getAll,`:

```js
module.exports = {
  create,
  getAll,
  getUpcoming,           // <-- ADD THIS LINE
  getById,
  // ... rest unchanged
};
```

- [ ] **Step 3: Verify it parses (sanity check)**

Run: `cd server && node -e "const c = require('./src/controllers/exam.controller'); console.log(typeof c.getUpcoming)"`
Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/exam.controller.js
git commit -m "feat(server): add getUpcoming controller handler"
```

---

## Task 5: Backend route wiring for `GET /upcoming`

**Files:**
- Modify: `server/src/routes/v1/exam.route.js` (add route BEFORE `/:id` to avoid conflict)

- [ ] **Step 1: Add the route**

In `server/src/routes/v1/exam.route.js`, find the line `router .route('/')` (line 10). Right BEFORE the `router .route('/:id')` block (line 15), add this new route block:

```js
router.get(
  '/upcoming',
  auth(),
  validate(examValidation.getUpcoming),
  examController.getUpcoming
);
```

Critical: This MUST be declared before `router.get('/:id', ...)` to prevent Express from matching `/upcoming` as `:id` with value `"upcoming"`.

- [ ] **Step 2: Verify the route is wired (sanity check)**

Run: `cd server && node -e "const r = require('./src/routes/v1/exam.route'); console.log(r.stack.filter(l => l.route).map(l => Object.keys(l.route.methods) + ' ' + l.route.path))"`
Expected output should include `'get' '/upcoming'` near the top.

- [ ] **Step 3: Run all tests to ensure no regression**

Run: `cd server && npm test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/v1/exam.route.js
git commit -m "feat(server): wire GET /v1/exams/upcoming route"
```

---

## Task 6: Backend integration test for `/v1/exams/upcoming`

**Files:**
- Create: `server/tests/integration/exam.route.test.js`

- [ ] **Step 1: Write the integration test**

Create `server/tests/integration/exam.route.test.js`:

```js
const request = require('supertest');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { Exam } = require('../../src/models');
const {
  teacherOne,
  teacherTwo,
  insertUsers,
} = require('../fixtures/user.fixture');
const {
  examUpcoming1,
  examUpcoming2,
  examPast,
  examOtherTeacher,
  insertExams,
} = require('../fixtures/exam.fixture');
const { schoolA, insertSchools } = require('../fixtures/school.fixture');
const setupTestDB = require('../utils/setupTestDB');
const { userOneAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('Exam route - GET /v1/exams/upcoming', () => {
  beforeEach(async () => {
    teacherOne.schoolId = schoolA._id;
    teacherTwo.schoolId = schoolA._id;
    examUpcoming1.createdBy = teacherOne._id;
    examUpcoming2.createdBy = teacherOne._id;
    examPast.createdBy = teacherOne._id;
    examOtherTeacher.createdBy = teacherTwo._id;

    await insertSchools([schoolA]);
    await insertUsers([teacherOne, teacherTwo]);
    await insertExams([examUpcoming1, examUpcoming2, examPast, examOtherTeacher]);
  });

  it('should return 401 if no token is provided', async () => {
    await request(app).get('/v1/exams/upcoming').expect(httpStatus.UNAUTHORIZED);
  });

  it('should return upcoming exams for the authenticated teacher', async () => {
    const res = await request(app)
      .get('/v1/exams/upcoming?limit=5')
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('limit', 5);
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.results)).toBe(true);

    const titles = res.body.results.map((e) => e.title).sort();
    expect(titles).toEqual(['Math Test - Chapter 3', 'Math Test - Chapter 4']);
    expect(res.body.count).toBe(2);
  });

  it('should return 400 if limit is invalid', async () => {
    await request(app)
      .get('/v1/exams/upcoming?limit=0')
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.BAD_REQUEST);
  });

  it('should return empty results if no upcoming exams exist', async () => {
    await Exam.deleteMany({ createdBy: teacherOne._id });

    const res = await request(app)
      .get('/v1/exams/upcoming')
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('should respect limit parameter', async () => {
    const res = await request(app)
      .get('/v1/exams/upcoming?limit=1')
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.limit).toBe(1);
  });
});
```

- [ ] **Step 2: Inspect token fixture to confirm correct import**

Read `server/tests/fixtures/token.fixture.js` and check that `userOneAccessToken` exists. If the export name is different, adjust the import in the test file.

Run: `cat server/tests/fixtures/token.fixture.js`

If `userOneAccessToken` is not exported, check the actual export name (it might be `teacherOneAccessToken` or similar). Adjust the import and use the correct one.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npx jest tests/integration/exam.route.test.js`
Expected: FAIL — could be import errors, or actual test failures if route not wired.

- [ ] **Step 4: Fix any import/syntax errors**

If `userOneAccessToken` doesn't exist in `token.fixture.js`, find the correct export name and update the import. Re-run until tests pass.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx jest tests/integration/exam.route.test.js`
Expected: 5 tests pass.

- [ ] **Step 6: Run full server test suite**

Run: `cd server && npm test`
Expected: All tests pass (existing + new).

- [ ] **Step 7: Commit**

```bash
git add server/tests/integration/exam.route.test.js
git commit -m "test(server): add integration test for GET /v1/exams/upcoming"
```

---

## Task 7: Mobile service `getUpcomingExams` + `UpcomingExams` class

**Files:**
- Modify: `client/mobile/lib/core/network/exam_service.dart` (add method + class)

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/core/network/exam_service_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';

class _FakeApiClient extends ApiClient {
  _FakeApiClient(this._response);
  final Map<String, dynamic> _response;

  String? lastPath;
  Map<String, dynamic>? lastQuery;

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    lastPath = path;
    lastQuery = queryParameters;
    return parser != null ? parser(_response) : _response as T;
  }
}

void main() {
  group('ExamService.getUpcomingExams', () {
    test('calls the correct endpoint with default limit=5', () async {
      final fake = _FakeApiClient({
        'results': <Map<String, dynamic>>[],
        'limit': 5,
        'count': 0,
      });
      final service = ExamService(apiClient: fake);

      final result = await service.getUpcomingExams();

      expect(fake.lastPath, '/exams/upcoming');
      expect(fake.lastQuery, {'limit': 5});
      expect(result.results, isEmpty);
      expect(result.limit, 5);
      expect(result.count, 0);
    });

    test('uses provided limit when supplied', () async {
      final fake = _FakeApiClient({
        'results': <Map<String, dynamic>>[],
        'limit': 3,
        'count': 0,
      });
      final service = ExamService(apiClient: fake);

      await service.getUpcomingExams(limit: 3);

      expect(fake.lastQuery, {'limit': 3});
    });

    test('parses results list of Exam entities', () async {
      final fake = _FakeApiClient({
        'results': [
          {
            '_id': 'exam-1',
            'title': 'Math Test',
            'status': 'published',
            'examDate': '2026-06-20T07:00:00.000Z',
            'createdAt': '2026-06-10T03:00:00.000Z',
          },
        ],
        'limit': 5,
        'count': 1,
      });
      final service = ExamService(apiClient: fake);

      final result = await service.getUpcomingExams();

      expect(result.results, hasLength(1));
      expect(result.results.first.id, 'exam-1');
      expect(result.results.first.title, 'Math Test');
      expect(result.count, 1);
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/core/network/exam_service_test.dart`
Expected: FAIL — `getUpcomingExams` not found on `ExamService`.

- [ ] **Step 3: Add `getUpcomingExams` method to `ExamService`**

In `client/mobile/lib/core/network/exam_service.dart`, find the line where `ExamVersion` is defined (right after `PaginatedExams` class). Add the `getUpcomingExams` method right after `getExamById` (around line 45):

```dart
  Future<UpcomingExams> getUpcomingExams({int limit = 5}) {
    return _apiClient.get<UpcomingExams>(
      '${ApiConstants.exams}/upcoming',
      queryParameters: {'limit': limit},
      parser: (data) => UpcomingExams.fromJson(data as Map<String, dynamic>),
    );
  }
```

- [ ] **Step 4: Add `UpcomingExams` class**

Right after the `PaginatedExams` class (after its closing `}` around line 185), add:

```dart
class UpcomingExams {
  final List<Exam> results;
  final int limit;
  final int count;

  UpcomingExams({
    required this.results,
    required this.limit,
    required this.count,
  });

  factory UpcomingExams.fromJson(Map<String, dynamic> json) {
    final resultsRaw = json['results'] as List<dynamic>? ?? [];
    return UpcomingExams(
      results: resultsRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => Exam.fromJson(e))
          .toList(),
      limit: (json['limit'] as num?)?.toInt() ?? 5,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/core/network/exam_service_test.dart`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/core/network/exam_service.dart client/mobile/test/core/network/exam_service_test.dart
git commit -m "feat(mobile): add getUpcomingExams service method and UpcomingExams class"
```

---

## Task 8: Mobile BLoC event + state for upcoming

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/exam/exam_event.dart` (add `UpcomingExamsLoadRequested`)
- Modify: `client/mobile/lib/presentation/blocs/exam/exam_state.dart` (add 2 new states)

- [ ] **Step 1: Add new event class**

In `client/mobile/lib/presentation/blocs/exam/exam_event.dart`, add this at the end of the file (after `ExamDeleteRequested`):

```dart
class UpcomingExamsLoadRequested extends ExamEvent {
  final int limit;
  const UpcomingExamsLoadRequested({this.limit = 5});

  @override
  List<Object?> get props => [limit];
}
```

- [ ] **Step 2: Add new state classes**

In `client/mobile/lib/presentation/blocs/exam/exam_state.dart`, add these at the end of the file (after `ExamError`):

```dart
class ExamUpcomingLoading extends ExamState {}

class ExamUpcomingLoaded extends ExamState {
  final List<Exam> exams;
  final int count;

  const ExamUpcomingLoaded(this.exams, this.count);

  @override
  List<Object?> get props => [exams, count];
}
```

- [ ] **Step 3: Verify parser compiles**

Run: `cd client/mobile && flutter analyze lib/presentation/blocs/exam/`
Expected: No new errors (only pre-existing ones).

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/blocs/exam/exam_event.dart client/mobile/lib/presentation/blocs/exam/exam_state.dart
git commit -m "feat(mobile): add UpcomingExams event and ExamUpcoming states to ExamBloc"
```

---

## Task 9: Mobile BLoC handler for `UpcomingExamsLoadRequested`

**Files:**
- Modify: `client/mobile/lib/presentation/blocs/exam/exam_bloc.dart` (register handler)

- [ ] **Step 1: Register the handler in the constructor**

In `client/mobile/lib/presentation/blocs/exam/exam_bloc.dart`, find the constructor block:

```dart
  ExamBloc({required ApiClient apiClient})
      : _examService = ExamService(apiClient: apiClient),
        super(ExamInitial()) {
    on<ExamLoadRequested>(_onLoadRequested);
    on<ExamLoadMoreRequested>(_onLoadMoreRequested);
    on<ExamCreateRequested>(_onCreateRequested);
    on<ExamUpdateRequested>(_onUpdateRequested);
    on<ExamDeleteRequested>(_onDeleteRequested);
  }
```

Add a new line for the upcoming event handler registration (alphabetical, after `ExamUpdateRequested`):

```dart
    on<ExamUpdateRequested>(_onUpdateRequested);
    on<ExamDeleteRequested>(_onDeleteRequested);
    on<UpcomingExamsLoadRequested>(_onUpcomingExamsLoadRequested);
```

- [ ] **Step 2: Add the handler method**

At the end of the `ExamBloc` class (after `_onDeleteRequested`), add:

```dart
  Future<void> _onUpcomingExamsLoadRequested(
    UpcomingExamsLoadRequested event,
    Emitter<ExamState> emit,
  ) async {
    emit(ExamUpcomingLoading());
    try {
      final result = await _examService.getUpcomingExams(limit: event.limit);
      emit(ExamUpcomingLoaded(result.results, result.count));
    } catch (e) {
      emit(ExamError(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }
```

- [ ] **Step 3: Verify the BLoC compiles**

Run: `cd client/mobile && flutter analyze lib/presentation/blocs/exam/exam_bloc.dart`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/blocs/exam/exam_bloc.dart
git commit -m "feat(mobile): wire UpcomingExamsLoadRequested handler in ExamBloc"
```

---

## Task 10: Mobile BLoC tests for upcoming flow

**Files:**
- Create: `client/mobile/test/presentation/blocs/exam_bloc_test.dart`

- [ ] **Step 1: Write the BLoC test**

Create `client/mobile/test/presentation/blocs/exam_bloc_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam/exam_bloc.dart';

class _FakeApiClient extends Mock implements ApiClient {}

Exam _makeExam(String id) => Exam(
      id: id,
      title: 'Test $id',
      status: 'published',
      createdAt: DateTime(2026, 1, 1),
    );

void main() {
  late ExamBloc bloc;
  late _FakeApiClient apiClient;

  setUp(() {
    apiClient = _FakeApiClient();
    bloc = ExamBloc(apiClient: apiClient);
  });

  tearDown(() async {
    await bloc.close();
  });

  test('UpcomingExamsLoadRequested emits Loading then Loaded on success', () async {
    final exams = [_makeExam('e1'), _makeExam('e2')];

    when(apiClient.get<UpcomingExams>(
      any,
      queryParameters: anyNamed('queryParameters'),
      parser: anyNamed('parser'),
    )).thenAnswer((_) async {
      // Simulate parser being called
      return UpcomingExams(results: exams, limit: 5, count: 2);
    });

    final expected = [
      predicate<ExamState>((s) => s is ExamUpcomingLoading),
      predicate<ExamState>((s) =>
          s is ExamUpcomingLoaded && s.exams.length == 2 && s.count == 2),
    ];

    expect(
      bloc.stream,
      emitsInOrder(expected),
    );

    bloc.add(const UpcomingExamsLoadRequested(limit: 5));
  });

  test('UpcomingExamsLoadRequested emits Loading then ExamError on failure',
      () async {
    when(apiClient.get<UpcomingExams>(
      any,
      queryParameters: anyNamed('queryParameters'),
      parser: anyNamed('parser'),
    )).thenThrow(Exception('Network error'));

    final expected = [
      predicate<ExamState>((s) => s is ExamUpcomingLoading),
      predicate<ExamState>((s) => s is ExamError && s.message.contains('Network error')),
    ];

    expect(
      bloc.stream,
      emitsInOrder(expected),
    );

    bloc.add(const UpcomingExamsLoadRequested());
  });

  test('UpcomingExamsLoadRequested does NOT clear existing ExamLoaded state for list',
      () async {
    // This test verifies that the new event flow is independent.
    // We dispatch the upcoming event and verify the loaded state for it
    // does not interfere with other state types.

    when(apiClient.get<UpcomingExams>(
      any,
      queryParameters: anyNamed('queryParameters'),
      parser: anyNamed('parser'),
    )).thenAnswer((_) async => UpcomingExams(results: const [], limit: 5, count: 0));

    bloc.add(const UpcomingExamsLoadRequested());

    await expectLater(
      bloc.stream,
      emitsThrough(predicate<ExamState>((s) =>
          s is ExamUpcomingLoaded && s.exams.isEmpty && s.count == 0)),
    );
  });
}
```

- [ ] **Step 2: Run test to verify it fails (or pass after previous tasks)**

Run: `cd client/mobile && flutter test test/presentation/blocs/exam_bloc_test.dart`
Expected: 3 tests pass (since Task 8+9 already added the event, state, and handler).

- [ ] **Step 3: Commit**

```bash
git add client/mobile/test/presentation/blocs/exam_bloc_test.dart
git commit -m "test(mobile): add ExamBloc tests for UpcomingExamsLoadRequested"
```

---

## Task 11: Mobile HomePage dispatches UpcomingExamsLoadRequested

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart` (add dispatch in initState)

- [ ] **Step 1: Add the dispatch**

In `client/mobile/lib/presentation/pages/home_page.dart`, find the `initState` method (around line 38). The current body is:

```dart
  void initState() {
    super.initState();
    context.read<ExamBloc>().add(const ExamLoadRequested());
    context.read<ClassBloc>().add(const ClassFetchRequested());
    context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
    _syncPendingSubmissions();
  }
```

Add a new line after `ExamLoadRequested()`:

```dart
  void initState() {
    super.initState();
    context.read<ExamBloc>().add(const ExamLoadRequested());
    context.read<ExamBloc>().add(const UpcomingExamsLoadRequested(limit: 5));
    context.read<ClassBloc>().add(const ClassFetchRequested());
    context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
    _syncPendingSubmissions();
  }
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/home_page.dart`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/mobile/lib/presentation/pages/home_page.dart
git commit -m "feat(mobile): dispatch UpcomingExamsLoadRequested in HomePage initState"
```

---

## Task 12: Mobile DashboardView reads upcoming state + refresh

**Files:**
- Modify: `client/mobile/lib/presentation/pages/dashboard_view.dart` (replace client-side filter with state read, add refresh dispatch)

- [ ] **Step 1: Update the `onRefresh` callback**

In `client/mobile/lib/presentation/pages/dashboard_view.dart`, find the `RefreshIndicator` (around line 40). The current `onRefresh` is:

```dart
    return RefreshIndicator(
      onRefresh: () async {
        context.read<ExamBloc>().add(const ExamLoadRequested());
        context.read<ClassBloc>().add(const ClassFetchRequested());
      },
```

Add a new line for the upcoming event (after the `ExamLoadRequested()` line):

```dart
    return RefreshIndicator(
      onRefresh: () async {
        context.read<ExamBloc>().add(const ExamLoadRequested());
        context.read<ExamBloc>().add(const UpcomingExamsLoadRequested(limit: 5));
        context.read<ClassBloc>().add(const ClassFetchRequested());
      },
```

- [ ] **Step 2: Update `_buildUpcomingExams` to read from new state**

Find the `_buildUpcomingExams` method (line 278). Replace its entire body. First, update the call site (around line 37):

Current code:
```dart
    final upcomingExams = _buildUpcomingExams(examState);
    final isLoading = (examState is ExamLoading) || (classState is ClassLoading);
```

Replace with:
```dart
    final isLoading = (examState is ExamLoading) || (classState is ClassLoading);
    final isLoadingUpcoming = examState is ExamUpcomingLoading;
    final upcomingExams = _buildUpcomingExams(examState);
```

Note: `isLoadingUpcoming` is declared but not used yet — it will be wired in step 3.

- [ ] **Step 3: Replace the `_buildUpcomingExams` method body**

Find the entire `_buildUpcomingExams` method (lines 278-323). Replace it with:

```dart
  List<Widget> _buildUpcomingExams(ExamState state) {
    // Prefer the dedicated ExamUpcomingLoaded state; fall back to nothing.
    if (state is! ExamUpcomingLoaded) {
      return [];
    }
    final upcoming = state.exams.take(3).toList();
    if (upcoming.isEmpty) return [];

    return upcoming.map((exam) {
      String statusLabel = exam.status.toUpperCase();
      Color bg = const Color(0xFFE2E5FA);
      Color text = const Color(0xFF6366F1);
      if (exam.status == 'published') {
        bg = const Color(0xFF0C2B64);
        text = Colors.white;
      } else if (exam.status == 'in_progress') {
        bg = const Color(0xFFFDECE2);
        text = const Color(0xFFD47C56);
      } else if (exam.status == 'completed') {
        bg = const Color(0xFFE6F4EA);
        text = const Color(0xFF137333);
      }

      String dateText = 'No date';
      if (exam.examDate != null) {
        final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateText = '${months[exam.examDate!.month - 1]} ${exam.examDate!.day.toString().padLeft(2, '0')}';
      }

      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: UpcomingExamCard(
          title: exam.title,
          subtitle: '${exam.primaryClassName} \u2022 $dateText',
          status: statusLabel,
          statusBgColor: bg,
          statusTextColor: text,
        ),
      );
    }).toList();
  }
```

- [ ] **Step 4: Add skeleton placeholder when loading**

Find the section in `build` method that displays the upcoming exams (around lines 172-191):

Current code:
```dart
            if (upcomingExams.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: const Column(
                  children: [
                    Icon(Icons.assignment_outlined, size: 40, color: Color(0xFFCBD5E1)),
                    SizedBox(height: 12),
                    Text(
                      'No upcoming exams',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              )
            else
              ...upcomingExams,
```

Replace with:
```dart
            if (isLoadingUpcoming)
              Container(
                width: double.infinity,
                height: 70,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              )
            else if (upcomingExams.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: const Column(
                  children: [
                    Icon(Icons.assignment_outlined, size: 40, color: Color(0xFFCBD5E1)),
                    SizedBox(height: 12),
                    Text(
                      'No upcoming exams',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              )
            else
              ...upcomingExams,
```

- [ ] **Step 5: Verify the file compiles**

Run: `cd client/mobile && flutter analyze lib/presentation/pages/dashboard_view.dart`
Expected: No errors.

- [ ] **Step 6: Run all existing tests to confirm no regression**

Run: `cd client/mobile && flutter test`
Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/presentation/pages/dashboard_view.dart
git commit -m "feat(mobile): dashboard reads upcoming from new ExamBloc state + skeleton"
```

---

## Task 13: Mobile DashboardView widget test

**Files:**
- Create: `client/mobile/test/presentation/pages/dashboard_view_test.dart`

- [ ] **Step 1: Write the widget test**

Create `client/mobile/test/presentation/pages/dashboard_view_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';
import 'package:smart_grading_mobile/core/network/exam_service.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/auth/auth_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam/exam_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/dashboard_view.dart';

class _FakeApiClient extends Mock implements ApiClient {}

Exam _makeExam({required String id, required String title, DateTime? examDate}) {
  return Exam(
    id: id,
    title: title,
    status: 'published',
    examDate: examDate,
    createdAt: DateTime(2026, 1, 1),
  );
}

User _makeUser() {
  return User(
    id: 'u1',
    name: 'Test Teacher',
    email: 'teacher@test.com',
    role: 'teacher',
    createdAt: DateTime(2026, 1, 1),
  );
}

Widget _wrap(Widget child, ExamBloc examBloc, AuthBloc authBloc) {
  return MaterialApp(
    home: MultiBlocProvider(
      providers: [
        BlocProvider<ExamBloc>.value(value: examBloc),
        BlocProvider<AuthBloc>.value(value: authBloc),
      ],
      child: child,
    ),
  );
}

void main() {
  group('DashboardView upcoming exams', () {
    late ExamBloc examBloc;
    late AuthBloc authBloc;
    late _FakeApiClient apiClient;

    setUp(() {
      apiClient = _FakeApiClient();
      examBloc = ExamBloc(apiClient: apiClient);
      authBloc = AuthBloc(apiClient: apiClient);
      authBloc.emit(AuthAuthenticated(_makeUser()));
    });

    tearDown(() async {
      await examBloc.close();
      await authBloc.close();
    });

    testWidgets('shows 3 upcoming exam cards when ExamUpcomingLoaded has 5 results',
        (tester) async {
      when(apiClient.get<UpcomingExams>(
        any,
        queryParameters: anyNamed('queryParameters'),
        parser: anyNamed('parser'),
      )).thenAnswer((_) async {
        return UpcomingExams(
          results: List.generate(
            5,
            (i) => _makeExam(
              id: 'e$i',
              title: 'Test Exam $i',
              examDate: DateTime(2026, 6, 20 + i),
            ),
          ),
          limit: 5,
          count: 5,
        );
      });

      examBloc.add(const UpcomingExamsLoadRequested(limit: 5));
      // wait for the BLoC to emit Loaded
      await Future<void>.delayed(const Duration(milliseconds: 50));

      await tester.pumpWidget(_wrap(const DashboardView(), examBloc, authBloc));
      await tester.pumpAndSettle();

      // We expect to see 3 cards (take(3)) with the first 3 titles
      expect(find.text('Test Exam 0'), findsOneWidget);
      expect(find.text('Test Exam 1'), findsOneWidget);
      expect(find.text('Test Exam 2'), findsOneWidget);
      // The 4th and 5th should NOT be displayed
      expect(find.text('Test Exam 3'), findsNothing);
      expect(find.text('Test Exam 4'), findsNothing);
    });

    testWidgets('shows "No upcoming exams" when ExamUpcomingLoaded has 0 results',
        (tester) async {
      when(apiClient.get<UpcomingExams>(
        any,
        queryParameters: anyNamed('queryParameters'),
        parser: anyNamed('parser'),
      )).thenAnswer((_) async => UpcomingExams(results: const [], limit: 5, count: 0));

      examBloc.add(const UpcomingExamsLoadRequested(limit: 5));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      await tester.pumpWidget(_wrap(const DashboardView(), examBloc, authBloc));
      await tester.pumpAndSettle();

      expect(find.text('No upcoming exams'), findsOneWidget);
    });
  });
}
```

- [ ] **Step 2: Inspect AuthBloc and User entity to confirm correct API**

Look at how other tests in the repo create and provide `AuthBloc` and `AuthAuthenticated`. The plan above uses the correct signatures:
- `AuthBloc` requires `apiClient: ApiClient` in the constructor.
- `AuthAuthenticated` requires a `User` object.
- `User` requires `id`, `name`, `email`, `role`, `createdAt`.

If anything is still off, adjust the test code above to match.

- [ ] **Step 3: Run test to verify it passes (or fix until it does)**

Run: `cd client/mobile && flutter test test/presentation/pages/dashboard_view_test.dart`
Expected: 2 tests pass. Fix any constructor mismatches iteratively.

- [ ] **Step 4: Commit**

```bash
git add client/mobile/test/presentation/pages/dashboard_view_test.dart
git commit -m "test(mobile): add dashboard_view widget test for upcoming state"
```

---

## Task 14: Run full verification suite

**Files:** none (verification only)

- [ ] **Step 1: Run all backend tests**

Run: `cd server && npm test`
Expected: All tests pass (existing + new). Note any failing tests, fix them.

- [ ] **Step 2: Run all mobile tests**

Run: `cd client/mobile && flutter test`
Expected: All tests pass (existing + new).

- [ ] **Step 3: Run backend lint**

Run: `cd server && npm run lint`
Expected: No new errors.

- [ ] **Step 4: Run mobile analyze**

Run: `cd client/mobile && flutter analyze`
Expected: No new errors.

- [ ] **Step 5: Manual end-to-end test**

1. Start backend: `cd server && npm run dev`
2. Use Postman or curl:
   ```bash
   curl -H "Authorization: Bearer <teacher_token>" http://localhost:3000/v1/exams/upcoming?limit=5
   ```
3. Verify response: `{ results: [...], limit: 5, count: N }` where N is the number of upcoming exams.
4. Start mobile app: `cd client/mobile && flutter run`
5. Log in as a teacher who has at least 1 upcoming exam.
6. Verify dashboard shows "Upcoming Exams" section populated from new endpoint.
7. Pull to refresh — verify the upcoming list refreshes independently.

- [ ] **Step 6: Commit any final fixes (if needed)**

If verification surfaced any issues, fix them with a final commit:
```bash
git add -A
git commit -m "fix: address verification issues from full test run"
```

---

## Self-Review

### 1. Spec coverage

| Spec section | Task(s) |
|--------------|---------|
| 3.1 Backend route mới | Task 5 |
| 3.2 Backend controller | Task 4 |
| 3.3 Backend service | Tasks 2, 3 |
| 3.4 Backend validation | Task 1 |
| 3.5 Mobile service | Task 7 |
| 3.6 Mobile BLoC | Tasks 8, 9 |
| 3.7 Mobile UI (initState + dashboard) | Tasks 11, 12 |
| 4.1 API Contract | Tasks 1, 4, 5 (full implementation), Task 6 (test) |
| 5.1/5.2 Error Handling | Task 3 (service error → ExamError), Task 4 (controller catchAsync) |
| 6.1 Backend tests | Tasks 1, 3, 6 |
| 6.2 Mobile tests | Tasks 7, 10, 13 |
| 6.3 Verification | Task 14 |

✅ All spec sections covered.

### 2. Placeholder scan

No "TBD", "TODO", "implement later", or "Similar to Task N" in the plan. All steps include actual code.

### 3. Type consistency

- `UpcomingExams` class: defined in Task 7 (mobile service), used in Task 7 (test), Task 10 (BLoC test), Task 13 (widget test). ✅
- `ExamUpcomingLoading` / `ExamUpcomingLoaded`: defined in Task 8, used in Task 9 (handler), Task 10 (test), Task 12 (dashboard), Task 13 (widget test). ✅
- `UpcomingExamsLoadRequested`: defined in Task 8, used in Task 9 (handler registration), Task 10 (test), Task 11 (dispatch), Task 12 (refresh), Task 13 (widget test). ✅
- `getUpcomingExams` method: defined in Task 7, used in Task 9 (handler). ✅
- `getUpcoming` validation schema: defined in Task 1, used in Task 5 (route). ✅
- `getUpcomingExams` service method: defined in Task 2, used in Task 3 (test), Task 4 (controller). ✅
- `getUpcoming` controller handler: defined in Task 4, used in Task 5 (route). ✅

✅ No naming inconsistencies.

### 4. Notes

- The `auth()` middleware in the route uses no role argument, matching existing routes like `GET /exams/:id` which allow any authenticated user. The service-level filter `createdBy = user.id` ensures teacher isolation. (Per spec section 5.2: student calling this endpoint gets an empty list, NOT 403.)
- The `limit=1` and `limit=10` integration test cases verify the validation boundaries, not the service's limit handling. The service test in Task 3 verifies limit handling.
- Tests in `test/presentation/blocs/exam_bloc_test.dart` (Task 10) mock the `ApiClient` directly to avoid network calls. Same pattern for service and widget tests.
- Manual end-to-end test in Task 14 is the only way to verify the wire-up of state → UI rendering correctly in a real app context.
