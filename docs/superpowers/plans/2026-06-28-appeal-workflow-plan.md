# Appeal Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add end-to-end appeal workflow (student creates appeal, teacher reviews with accept/reject + note) with no score mutation.

**Architecture:** Backend modifies `appealService.review` to be status-only (no score mutation), frontend adds `createAppeal` to student store and a form in MyScoresPage modal. Test-first on both layers.

**Tech Stack:** Node.js/Express/Jest (backend), React/Zustand/Vitest (frontend)

---

## Phase 1: Backend Tests (TDD)

### Task 1: Create Appeal Fixtures

**Files:**
- Create: `server/tests/fixtures/appeal.fixture.js`

- [ ] **Step 1: Write fixtures**

```javascript
// server/tests/fixtures/appeal.fixture.js
const mongoose = require('mongoose');
const { appealOne, appealTwo, insertAppeals } = require('./appeal.fixture');

const appealOne = {
  _id: new mongoose.Types.ObjectId(),
  submissionId: new mongoose.Types.ObjectId(),
  examId: new mongoose.Types.ObjectId(),
  studentId: new mongoose.Types.ObjectId(),
  questionId: new mongoose.Types.ObjectId(),
  questionPosition: 1,
  reason: 'Tôi chắc chắn đáp án của tôi đúng vì...',
  status: 'pending',
  createdAt: new Date(),
};

const appealTwo = {
  _id: new mongoose.Types.ObjectId(),
  submissionId: new mongoose.Types.ObjectId(),
  examId: new mongoose.Types.ObjectId(),
  studentId: new mongoose.Types.ObjectId(),
  questionId: new mongoose.Types.ObjectId(),
  questionPosition: 2,
  reason: 'Đáp án được quét sai do chất lượng ảnh kém.',
  status: 'approved',
  teacherResponse: {
    reviewedBy: new mongoose.Types.ObjectId(),
    reviewedAt: new Date(),
    decision: 'approved',
    note: 'Đã xem xét, chấp nhận yêu cầu.',
  },
  createdAt: new Date(Date.now() - 86400000),
};

const insertAppeals = async (appeals) => {
  await require('../../../src/models').Appeal.insertMany(
    appeals.map((a) => ({ ...a }))
  );
  return appeals;
};

module.exports = {
  appealOne,
  appealTwo,
  insertAppeals,
};
```

- [ ] **Step 2: Commit**

```bash
git add server/tests/fixtures/appeal.fixture.js
git commit -m "test: add appeal fixtures"
```

---

### Task 2: Appeal Service Tests — create()

**Files:**
- Create: `server/tests/unit/services/appeal.service.test.js`

- [ ] **Step 1: Write failing test — create() success path**

```javascript
// server/tests/unit/services/appeal.service.test.js
const mongoose = require('mongoose');
const appealService = require('../../../src/services/appeal.service');
const { Appeal, Submission, Exam, User, Notification } = require('../../../src/models');
const { appealOne, insertAppeals } = require('../../fixtures/appeal.fixture');
const { studentOne, insertUsers } = require('../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../fixtures/school.fixture');
const { examOne, insertExams } = require('../../fixtures/exam.fixture');
const { submissionOne, insertSubmissions } = require('../../fixtures/submission.fixture');
const { questionOne, insertQuestions } = require('../../fixtures/question.fixture');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

describe('Appeal Service — create()', () => {
  beforeEach(async () => {
    await insertSchools([schoolA]);
    await insertUsers([{ ...studentOne, schoolId: schoolA._id }]);
    await insertExams([{ ...examOne, createdBy: studentOne._id }]);
    await insertQuestions([questionOne]);
    await insertSubmissions([submissionOne]);
  });

  it('should create an appeal and mark submission as appealed', async () => {
    const payload = {
      submissionId: submissionOne._id.toString(),
      examId: examOne._id.toString(),
      studentId: studentOne._id.toString(),
      questionId: questionOne._id.toString(),
      questionPosition: 1,
      reason: 'Đáp án của tôi bị quét sai.',
    };

    const appeal = await appealService.create(payload);

    expect(appeal).toBeDefined();
    expect(appeal.status).toBe('pending');
    expect(appeal.reason).toBe(payload.reason);
    expect(appeal.questionId.toString()).toBe(payload.questionId);

    const submission = await Submission.findById(submissionOne._id);
    expect(submission.status).toBe('appealed');
  });

  it('should throw 404 when submission not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const payload = {
      submissionId: fakeId.toString(),
      examId: examOne._id.toString(),
      studentId: studentOne._id.toString(),
      questionId: questionOne._id.toString(),
      questionPosition: 1,
      reason: 'Lý do test.',
    };

    await expect(appealService.create(payload)).rejects.toThrow('Submission not found');
  });

  it('should throw 400 when appeal already exists for this question', async () => {
    const payload = {
      submissionId: submissionOne._id.toString(),
      examId: examOne._id.toString(),
      studentId: studentOne._id.toString(),
      questionId: questionOne._id.toString(),
      questionPosition: 1,
      reason: 'Lý do 1.',
    };
    await appealService.create(payload);

    const payload2 = { ...payload, reason: 'Lý do 2.' };
    await expect(appealService.create(payload2)).rejects.toThrow('Appeal already exists');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && npm test -- appeal.service.test.js 2>&1 | head -60
```

Expected: FAIL — file not found or syntax error.

- [ ] **Step 3: Create the empty test file + run to see real failure**

```bash
# Create placeholder test file first
touch server/tests/unit/services/appeal.service.test.js
cd server && npm test -- appeal.service.test.js 2>&1 | head -80
```

Expected: FAIL — tests not found or empty suite.

- [ ] **Step 4: Write the actual full test file** (paste from Step 1 above, plus review tests below).

- [ ] **Step 5: Run tests**

```bash
cd server && npm test -- appeal.service.test.js 2>&1 | tail -40
```

Expected: FAIL — `appealService.create` exists but test assertions may fail.

- [ ] **Step 6: Implement minimal fix in appeal.service.js** — verify the existing `create()` matches assertions. Read `appeal.service.js` and adjust test or add minimal missing logic.

- [ ] **Step 7: Run tests again**

```bash
cd server && npm test -- appeal.service.test.js 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/tests/unit/services/appeal.service.test.js
git commit -m "test(backend): add appeal.service unit tests for create()"
```

---

### Task 3: Appeal Service Tests — review()

**Files:**
- Modify: `server/tests/unit/services/appeal.service.test.js`

Add to the describe block above:

- [ ] **Step 1: Write failing tests — review() approved (no score mutation)**

```javascript
  it('should set status to approved on accept, no score mutation', async () => {
    const payload = {
      submissionId: submissionOne._id.toString(),
      examId: examOne._id.toString(),
      studentId: studentOne._id.toString(),
      questionId: questionOne._id.toString(),
      questionPosition: 1,
      reason: 'Lý do test.',
    };
    const appeal = await appealService.create(payload);
    const submissionBefore = await Submission.findById(submissionOne._id);
    const totalScoreBefore = submissionBefore.totalScore;

    const reviewed = await appealService.review(
      appeal._id.toString(),
      { decision: 'approved', note: 'Chấp nhận, điểm giữ nguyên.' },
      studentOne._id.toString()
    );

    expect(reviewed.status).toBe('approved');
    expect(reviewed.teacherResponse.decision).toBe('approved');
    expect(reviewed.teacherResponse.note).toBe('Chấp nhận, điểm giữ nguyên.');
    expect(reviewed.teacherResponse.scoreAdjustment).toBeUndefined();

    const submissionAfter = await Submission.findById(submissionOne._id);
    expect(submissionAfter.totalScore).toBe(totalScoreBefore);
  });

  it('should set status to rejected on reject, no score mutation', async () => {
    const payload = {
      submissionId: submissionOne._id.toString(),
      examId: examOne._id.toString(),
      studentId: studentOne._id.toString(),
      questionId: questionOne._id.toString(),
      questionPosition: 1,
      reason: 'Lý do test.',
    };
    const appeal = await appealService.create(payload);

    const reviewed = await appealService.review(
      appeal._id.toString(),
      { decision: 'rejected', note: 'Từ chối.' },
      studentOne._id.toString()
    );

    expect(reviewed.status).toBe('rejected');
    expect(reviewed.teacherResponse.decision).toBe('rejected');
    expect(reviewed.teacherResponse.scoreAdjustment).toBeUndefined();
  });

  it('should throw when appeal already reviewed', async () => {
    const payload = {
      submissionId: submissionOne._id.toString(),
      examId: examOne._id.toString(),
      studentId: studentOne._id.toString(),
      questionId: questionOne._id.toString(),
      questionPosition: 1,
      reason: 'Lý do test.',
    };
    const appeal = await appealService.create(payload);
    await appealService.review(appeal._id.toString(), { decision: 'approved' }, studentOne._id.toString());

    await expect(
      appealService.review(appeal._id.toString(), { decision: 'rejected' }, studentOne._id.toString())
    ).rejects.toThrow('Appeal already reviewed');
  });
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd server && npm test -- appeal.service.test.js 2>&1 | tail -50
```

Expected: FAIL — `review()` currently mutates `totalScore` and writes `scoreAdjustment`.

- [ ] **Step 3: Modify `appealService.review()` in `server/src/services/appeal.service.js`**

Read the file first, then change the `decision === 'approved'` block to remove all score mutation:

```javascript
  // OLD (remove all of this):
  //   const submission = await Submission.findById(appeal.submissionId);
  //   if (!submission) throw...
  //   const answer = submission.answers.find(a => a.questionId?.toString() === appeal.questionId.toString());
  //   if (answer) {
  //     const adjustment = scoreAdjustment !== undefined ? scoreAdjustment : ...
  //     answer.score = newScore !== undefined ? newScore : answer.score;
  //     answer.isCorrect = true;
  //     submission.totalScore = submission.answers.reduce((sum, a) => sum + a.score, 0);
  //     submission.finalScore = submission.totalScore;
  //     submission.status = 'appealed';
  //     await submission.save();
  //   }

  // REPLACE with: do nothing to submission
  // Keep notification call.
```

Also remove `newScore` and `oldScore` from the destructured `data` at the top of the function (or just ignore them — don't use them).

- [ ] **Step 4: Run tests again**

```bash
cd server && npm test -- appeal.service.test.js 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/appeal.service.js
git commit -m "fix(backend): remove score mutation from appeal review — appeals are informational only"
```

---

### Task 4: Appeal Validation — remove newScore/oldScore

**Files:**
- Modify: `server/src/validations/appeal.validation.js`

- [ ] **Step 1: Read current validation**

```javascript
// Current reviewAppeal body:
body: Joi.object().keys({
  decision: Joi.string().valid('approved', 'rejected').required(),
  note: Joi.string().max(1000),
  newScore: Joi.number().min(0),    // REMOVE
  oldScore: Joi.number().min(0),    // REMOVE
}),
```

- [ ] **Step 2: Modify to remove newScore/oldScore**

```javascript
const reviewAppeal = {
  params: id,
  body: Joi.object().keys({
    decision: Joi.string().valid('approved', 'rejected').required(),
    note: Joi.string().max(1000),
  }),
};
```

- [ ] **Step 3: Run tests**

```bash
cd server && npm test -- appeal.service.test.js 2>&1 | tail -10
```

Expected: PASS (validation change doesn't affect service-level tests).

- [ ] **Step 4: Commit**

```bash
git add server/src/validations/appeal.validation.js
git commit -m "fix(backend): drop newScore/oldScore from appeal review validation"
```

---

### Task 5: Appeal Controller Tests

**Files:**
- Create: `server/tests/unit/controllers/appeal.controller.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// server/tests/unit/controllers/appeal.controller.test.js
const httpStatus = require('http-status');
const { Appeal } = require('../../../src/models');
const appealService = require('../../../src/services/appeal.service');
const appealController = require('../../../src/controllers/appeal.controller');
const mongoose = require('mongoose');

jest.mock('../../../src/services/appeal.service');
jest.mock('../../../src/models');

describe('Appeal Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should return 201 with created appeal on success', async () => {
      const mockAppeal = {
        _id: new mongoose.Types.ObjectId(),
        status: 'pending',
        reason: 'Lý do test',
      };
      appealService.create.mockResolvedValue(mockAppeal);
      mockReq = { body: { reason: 'Lý do test', submissionId: 'abc', examId: 'def', questionId: 'ghi', questionPosition: 1 } };

      await appealController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.CREATED);
      expect(mockRes.send).toHaveBeenCalledWith(mockAppeal);
    });

    it('should throw when appeal already exists', async () => {
      const error = new Error('Appeal already exists for this question');
      error.statusCode = 400;
      appealService.create.mockRejectedValue(error);
      mockReq = { body: { reason: 'Lý do', submissionId: 'abc', examId: 'def', questionId: 'ghi', questionPosition: 1 } };

      await expect(appealController.create(mockReq, mockRes)).rejects.toThrow('Appeal already exists');
    });
  });

  describe('review', () => {
    it('should return 200 with reviewed appeal on success', async () => {
      const mockReviewed = {
        _id: 'appeal123',
        status: 'approved',
        teacherResponse: { decision: 'approved', note: 'OK' },
      };
      appealService.review.mockResolvedValue(mockReviewed);
      mockReq = {
        params: { id: 'appeal123' },
        body: { decision: 'approved', note: 'OK' },
        user: { id: 'teacher1' },
      };

      await appealController.review(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith(mockReviewed);
    });

    it('should return 404 when appeal not found', async () => {
      const error = new Error('Appeal not found');
      error.statusCode = 404;
      appealService.review.mockRejectedValue(error);
      mockReq = { params: { id: 'fake' }, body: { decision: 'approved' }, user: { id: 't1' } };

      await expect(appealController.review(mockReq, mockRes)).rejects.toThrow('Appeal not found');
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && npm test -- appeal.controller.test.js 2>&1 | tail -40
```

Expected: FAIL — test file may have path/import issues. Fix until tests run.

- [ ] **Step 3: Run all backend tests**

```bash
cd server && npm test -- --testPathPattern="appeal" 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/tests/unit/controllers/appeal.controller.test.js
git commit -m "test(backend): add appeal.controller unit tests"
```

---

## Phase 2: Backend Production Code (already passes via service changes above)

The production code changes for backend are done in Task 3 and Task 4 above. No additional backend code needed.

---

## Phase 3: Frontend Store Tests

### Task 6: studentStore — createAppeal test

**Files:**
- Create: `client/web/src/__tests__/stores/studentStore-createAppeal.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// client/web/src/__tests__/stores/studentStore-createAppeal.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStudentStore } from '../../presentation/store/studentStore';
import * as apiModule from '../../core/api';

// Mock the API service
vi.mock('../../core/api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('studentStore — createAppeal', () => {
  beforeEach(() => {
    // Reset store state
    useStudentStore.setState({
      submissions: [],
      appeals: [],
      submissionAppeals: [],
      isCreatingAppeal: false,
    });
    vi.clearAllMocks();
  });

  it('should POST /appeals with correct payload', async () => {
    const api = vi.mocked(apiModule.apiService);
    const mockAppeal = {
      _id: 'appeal123',
      submissionId: 'sub123',
      examId: 'exam123',
      studentId: 'student123',
      questionId: 'q123',
      questionPosition: 1,
      reason: 'Đáp án bị quét sai.',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    api.post.mockResolvedValue(mockAppeal);

    const store = useStudentStore.getState();
    const result = await store.createAppeal({
      submissionId: 'sub123',
      examId: 'exam123',
      questionId: 'q123',
      questionPosition: 1,
      reason: 'Đáp án bị quét sai.',
    });

    expect(api.post).toHaveBeenCalledWith('/appeals', {
      submissionId: 'sub123',
      examId: 'exam123',
      questionId: 'q123',
      questionPosition: 1,
      reason: 'Đáp án bị quét sai.',
    });
    expect(result).toEqual(mockAppeal);
  });

  it('should set isCreatingAppeal to false after success', async () => {
    const api = vi.mocked(apiModule.apiService);
    api.post.mockResolvedValue({ _id: 'a1', status: 'pending', reason: 'test' });

    const store = useStudentStore.getState();
    const promise = store.createAppeal({
      submissionId: 'sub1',
      examId: 'ex1',
      questionId: 'q1',
      questionPosition: 1,
      reason: 'test',
    });

    // During the call, it should be true
    expect(useStudentStore.getState().isCreatingAppeal).toBe(true);
    await promise;
    expect(useStudentStore.getState().isCreatingAppeal).toBe(false);
  });

  it('should set isCreatingAppeal to false on error', async () => {
    const api = vi.mocked(apiModule.apiService);
    const err = new Error('Server error');
    api.post.mockRejectedValue(err);

    const store = useStudentStore.getState();
    await expect(
      store.createAppeal({
        submissionId: 'sub1',
        examId: 'ex1',
        questionId: 'q1',
        questionPosition: 1,
        reason: 'test',
      })
    ).rejects.toThrow('Server error');

    expect(useStudentStore.getState().isCreatingAppeal).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd client/web && npm test -- studentStore-createAppeal 2>&1 | tail -50
```

Expected: FAIL — `createAppeal` not defined on store.

- [ ] **Step 3: Implement `createAppeal` in `studentStore.ts`**

Add to the interface and implementation:

```typescript
// In interface, add:
createAppeal: (payload: {
  submissionId: string;
  examId: string;
  questionId: string;
  questionPosition: number;
  reason: string;
}) => Promise<StudentExamAppeal>;
isCreatingAppeal: boolean;

// In the store implementation (add before clearError):
isCreatingAppeal: false,

createAppeal: async (payload) => {
  set({ isCreatingAppeal: true });
  try {
    const response = await apiService.post<StudentExamAppeal>('/appeals', payload);
    const newAppeal = response;
    // Add to submissionAppeals if it matches the active submission
    set((state) => ({
      submissionAppeals: [newAppeal, ...state.submissionAppeals],
      appeals: [newAppeal, ...state.appeals],
      isCreatingAppeal: false,
    }));
    return newAppeal;
  } catch (error) {
    set({ isCreatingAppeal: false });
    throw error;
  }
},
```

- [ ] **Step 4: Run tests**

```bash
cd client/web && npm test -- studentStore-createAppeal 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/web/src/__tests__/stores/studentStore-createAppeal.test.ts
git add client/web/src/presentation/store/studentStore.ts
git commit -m "feat(frontend): add createAppeal action to studentStore"
```

---

## Phase 4: Frontend UI — Create Appeal Form in MyScoresPage

### Task 7: Add create appeal form to MyScoresPage

**Files:**
- Modify: `client/web/src/pages/MyScoresPage.tsx`
- Modify: `client/web/src/pages/MyScoresPage.module.css`

- [ ] **Step 1: Add state for create form**

Add these to the existing state declarations near the top of the component:

```typescript
const [showCreateForm, setShowCreateForm] = useState(false);
const [formReason, setFormReason] = useState('');
const [formQuestionPosition, setFormQuestionPosition] = useState<number | ''>('');
const [formError, setFormError] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
```

- [ ] **Step 2: Add createAppeal function and handler**

Add near the bottom of the component (before the final `return`):

```typescript
const { createAppeal, fetchSubmissionAppeals } = useStudentStore();

const handleCreateAppeal = async () => {
  if (!formReason.trim() || formReason.length < 10) {
    setFormError('Lý do phúc khảo phải có ít nhất 10 ký tự.');
    return;
  }
  if (formQuestionPosition === '' || !selectedSubmission) {
    setFormError('Vui lòng chọn câu cần phúc khảo.');
    return;
  }
  const answer = selectedSubmission.answers?.find(a => a.position === formQuestionPosition);
  if (!answer) {
    setFormError('Câu hỏi không hợp lệ.');
    return;
  }

  setIsSubmitting(true);
  setFormError(null);
  try {
    await createAppeal({
      submissionId: selectedSubmission._id,
      examId: selectedSubmission.examId?._id || '',
      questionId: answer.questionId,
      questionPosition: formQuestionPosition as number,
      reason: formReason.trim(),
    });
    // Refresh the appeals list for this submission
    await fetchSubmissionAppeals(selectedSubmission._id);
    setShowCreateForm(false);
    setFormReason('');
    setFormQuestionPosition('');
  } catch (err) {
    setFormError((err as Error).message || 'Có lỗi xảy ra khi gửi đơn.');
  } finally {
    setIsSubmitting(false);
  }
};

const canCreateAppeal = selectedSubmission &&
  selectedSubmission.answers &&
  selectedSubmission.answers.length > 0 &&
  ['scanned', 'manual_review', 'completed', 'appealed'].includes(selectedSubmission.status);
```

- [ ] **Step 3: Add create form UI in tab "Phúc khảo"**

Find the section `{activeTab === 'appeals' && (...)}` in the modal and add above the existing conditional:

```tsx
{activeTab === 'appeals' && (
  <div>
    {/* Create form toggle */}
    {canCreateAppeal && !showCreateForm && (
      <button
        className={styles.createAppealBtn}
        onClick={() => setShowCreateForm(true)}
      >
        <Scale size={14} />
        Tạo đơn phúc khảo
      </button>
    )}

    {/* Create form */}
    {showCreateForm && (
      <div className={styles.createAppealForm}>
        <h4 className={styles.formTitle}>Tạo đơn phúc khảo</h4>

        {/* Question selector */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Câu cần phúc khảo *</label>
          <select
            className={styles.formSelect}
            value={formQuestionPosition}
            onChange={(e) => setFormQuestionPosition(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">-- Chọn câu --</option>
            {selectedSubmission.answers?.map((a) => (
              <option key={a.questionId} value={a.position}>
                Câu {a.position} — {a.isCorrect ? 'Đúng ✓' : a.selectedAnswer ? 'Sai ✗' : 'Bỏ trống'}
              </option>
            ))}
          </select>
        </div>

        {/* Reason textarea */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>
            Lý do phúc khảo *
            <span className={styles.charCount}>{formReason.length}/1000</span>
          </label>
          <textarea
            className={styles.formTextarea}
            placeholder="Mô tả lý do bạn cho rằng đáp án bị chấm sai (ít nhất 10 ký tự)..."
            value={formReason}
            onChange={(e) => {
              if (e.target.value.length <= 1000) setFormReason(e.target.value);
            }}
            rows={4}
          />
        </div>

        {formError && (
          <div className={styles.formError}>{formError}</div>
        )}

        <div className={styles.formActions}>
          <button
            className={styles.cancelBtn}
            onClick={() => {
              setShowCreateForm(false);
              setFormReason('');
              setFormQuestionPosition('');
              setFormError(null);
            }}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleCreateAppeal}
            disabled={isSubmitting || formReason.length < 10 || formQuestionPosition === ''}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi đơn'}
          </button>
        </div>
      </div>
    )}

    {/* Existing appeals list (same as before) */}
    {isLoadingSubmissionAppeals ? (
      <div className={styles.noAppeals}>Đang tải...</div>
    ) : submissionAppeals.length === 0 && !showCreateForm ? (
      <div className={styles.noAppeals}>Bạn chưa gửi đơn phúc khảo nào cho bài thi này.</div>
    ) : (
      /* ... keep existing appeals list rendering code ... */
    )}
  </div>
)}
```

Note: Replace the `/* ... existing appeals list ... */` comment with the actual existing code block that renders `submissionAppeals.map(...)`.

- [ ] **Step 4: Add CSS for create form**

Add to `MyScoresPage.module.css`:

```css
/* Create Appeal Form */
.createAppealBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.15s;
}
.createAppealBtn:hover { background-color: #dbeafe; }

.createAppealForm {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.formTitle {
  font-size: 14px;
  font-weight: 700;
  color: #0b2240;
  margin: 0 0 12px;
}

.formField {
  margin-bottom: 12px;
}

.formLabel {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.charCount {
  font-weight: 400;
  color: #94a3b8;
}

.formSelect,
.formTextarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  background-color: #fff;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}
.formSelect:focus,
.formTextarea:focus { border-color: #2563eb; }
.formTextarea { resize: vertical; min-height: 80px; }

.formError {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 12px;
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.cancelBtn {
  padding: 7px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.cancelBtn:hover:not(:disabled) { background-color: #f1f5f9; }
.cancelBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.submitBtn {
  padding: 7px 16px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.submitBtn:hover:not(:disabled) { background-color: #1d4ed8; }
.submitBtn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 5: Run lint and type check**

```bash
cd client/web && npm run lint -- --quiet 2>&1 | grep -E "(error|warning)" | head -20
```

Fix any TypeScript errors.

- [ ] **Step 6: Run frontend tests**

```bash
cd client/web && npm test -- studentStore-createAppeal 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/web/src/pages/MyScoresPage.tsx
git add client/web/src/pages/MyScoresPage.module.css
git commit -m "feat(frontend): add create appeal form to MyScoresPage modal"
```

---

## Phase 5: Verification

### Task 8: Full Test Suite Run

- [ ] **Step 1: Run all backend tests**

```bash
cd server && npm test -- --testPathPattern="appeal" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 2: Run all frontend tests**

```bash
cd client/web && npm test -- 2>&1 | tail -30
```

Expected: All PASS.

- [ ] **Step 3: Build frontend**

```bash
cd client/web && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 4: Run linters**

```bash
cd server && npm run lint -- --quiet 2>&1 | tail -5
cd client/web && npm run lint -- --quiet 2>&1 | tail -5
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: run full verification suite for appeal workflow"
```

---

## Summary of Commits

| # | Commit message | Files |
|---|---------------|-------|
| 1 | `test: add appeal fixtures` | `appeal.fixture.js` |
| 2 | `test(backend): add appeal.service unit tests for create()` | `appeal.service.test.js` |
| 3 | `fix(backend): remove score mutation from appeal review — appeals are informational only` | `appeal.service.js` |
| 4 | `fix(backend): drop newScore/oldScore from appeal review validation` | `appeal.validation.js` |
| 5 | `test(backend): add appeal.controller unit tests` | `appeal.controller.test.js` |
| 6 | `feat(frontend): add createAppeal action to studentStore` | `studentStore.ts` |
| 7 | `test(frontend): add studentStore createAppeal unit tests` | `studentStore-createAppeal.test.ts` |
| 8 | `feat(frontend): add create appeal form to MyScoresPage modal` | `MyScoresPage.tsx`, `MyScoresPage.module.css` |
| 9 | `chore: verify all tests pass after appeal workflow implementation` | (verification only) |