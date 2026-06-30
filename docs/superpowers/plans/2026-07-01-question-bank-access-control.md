# Question Bank Access Control Implementation Plan

**Goal:** Build backend question bank access control with banks, members, pending approval, and bank-scoped question operations.

**Architecture:** Add `QuestionBank` and `QuestionBankMember` models; extend `Question` with `bankId`; add bank service/controller/middleware; integrate bank context into existing question endpoints.

**Tech Stack:** Node.js/Express + Mongoose + Jest + Supertest

---

## File Structure

- Create:
  - `server/src/models/questionBank.model.js`
  - `server/src/models/questionBankMember.model.js`
  - `server/src/services/questionBank.service.js`
  - `server/src/middlewares/bankAccess.middleware.js`
  - `server/src/controllers/questionBank.controller.js`
  - `server/src/routes/v1/questionBank.route.js`
  - `server/tests/unit/models/questionBank.model.test.js`
  - `server/tests/unit/models/questionBankMember.model.test.js`
  - `server/tests/unit/services/questionBank.service.test.js`
  - `server/tests/integration/questionBank.integration.test.js`

- Modify:
  - `server/src/models/question.model.js`
  - `server/src/services/question.service.js`
  - `server/src/controllers/question.controller.js`
  - `server/src/routes/v1/question.route.js`

---

### Task 1: QuestionBank model unit tests

**Files:**
- Test: `server/tests/unit/models/questionBank.model.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const QuestionBank = require('../../../src/models/questionBank.model');

setupTestDB();

describe('QuestionBank Model', () => {
  it('should create a personal bank with required fields', async () => {
    const bank = await QuestionBank.create({
      name: 'My Bank',
      type: 'personal',
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(bank.isActive).toBe(true);
  });

  it('should enforce required name', async () => {
    await expect(
      QuestionBank.create({ type: 'personal', createdBy: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
  });

  it('should default type to personal and isActive to true', async () => {
    const bank = await QuestionBank.create({
      name: 'Bank',
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(bank.type).toBe('personal');
    expect(bank.isActive).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/models/questionBank.model.test.js`
Expected: FAIL because model file does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/models/questionBank.model.js` with schema:
```javascript
const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    type: { type: String, enum: ['personal', 'school'], default: 'personal' },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionBankSchema.index({ schoolId: 1, type: 1 });
questionBankSchema.index({ createdBy: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/models/questionBank.model.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/models/questionBank.model.js server/tests/unit/models/questionBank.model.test.js
git commit -m "feat: add QuestionBank model"
```

---

### Task 2: QuestionBankMember model unit tests

**Files:**
- Test: `server/tests/unit/models/questionBankMember.model.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const QuestionBankMember = require('../../../src/models/questionBankMember.model');

setupTestDB();

describe('QuestionBankMember Model', () => {
  it('should create active member', async () => {
    const member = await QuestionBankMember.create({
      bankId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      role: 'viewer',
      status: 'active',
    });
    expect(member.status).toBe('active');
  });

  it('should enforce enum role', async () => {
    await expect(
      QuestionBankMember.create({
        bankId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        role: 'hacker',
        status: 'active',
      })
    ).rejects.toThrow();
  });

  it('should enforce unique bankId + userId', async () => {
    const id = new mongoose.Types.ObjectId();
    const bankId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    await QuestionBankMember.create({ bankId, userId, role: 'owner', status: 'active' });
    await expect(
      QuestionBankMember.create({ bankId, userId, role: 'manager', status: 'active' })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/models/questionBankMember.model.test.js`
Expected: FAIL because model file does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/models/questionBankMember.model.js`:
```javascript
const mongoose = require('mongoose');

const questionBankMemberSchema = new mongoose.Schema(
  {
    bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'manager', 'viewer'], default: 'viewer' },
    status: { type: String, enum: ['active', 'pending'], default: 'active' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

questionBankMemberSchema.index({ bankId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('QuestionBankMember', questionBankMemberSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/models/questionBankMember.model.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/models/questionBankMember.model.js server/tests/unit/models/questionBankMember.model.test.js
git commit -m "feat: add QuestionBankMember model"
```

---

### Task 3: Update Question model with bankId

**Files:**
- Modify: `server/src/models/question.model.js`

- [ ] **Step 1: Write the failing test**

```javascript
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const Question = require('../../../src/models/question.model');

setupTestDB();

describe('Question Model - bankId', () => {
  it('should allow bankId on question', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const q = await Question.create({
      content: 'Q1',
      options: [{ id: 'A', content: 'A', isCorrect: true }],
      createdBy: new mongoose.Types.ObjectId(),
      bankId,
    });
    expect(q.bankId.toString()).toBe(bankId.toString());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/models/questionBank.model.test.js server/tests/unit/models/questionBankMember.model.test.js server/tests/unit/models/question.bankId.test.js`
Expected: FAIL due to unknown `bankId`.

- [ ] **Step 3: Add bankId to question model**

In `server/src/models/question.model.js`, add after `schoolId`:
```javascript
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
      default: null,
    },
```

And add index:
```javascript
questionSchema.index({ bankId: 1 });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/models/question.bankId.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/models/question.model.js server/tests/unit/models/question.bankId.test.js
git commit -m "feat: add bankId to Question"
```

---

### Task 4: QuestionBank service unit tests

**Files:**
- Test: `server/tests/unit/services/questionBank.service.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const QuestionBankService = require('../../../src/services/questionBank.service');
const { QuestionBank, QuestionBankMember, User } = require('../../../src/models');

setupTestDB();

describe('QuestionBank Service', () => {
  let service;
  let ownerId;
  let bankId;

  beforeEach(async () => {
    service = Object.create(QuestionBankService);
    ownerId = new mongoose.Types.ObjectId();
    bankId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  });

  it('adds owner as active member when creating bank', async () => {
    const newBankId = new mongoose.Types.ObjectId();
    await service.createBank({ name: 'New', type: 'personal', createdBy: ownerId });
    const member = await QuestionBankMember.findOne({ bankId: newBankId, userId: ownerId });
    expect(member).toBeTruthy();
    expect(member.role).toBe('owner');
    expect(member.status).toBe('active');
  });

  it('throws when inviting user already active', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
    await expect(service.inviteMember(bankId.toString(), userId.toString(), ownerId)).rejects.toThrow('already a member');
  });

  it('approves pending member', async () => {
    const userId = new mongoose.Types.ObjectId();
    await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending' });
    await service.approveMember(bankId.toString(), userId.toString(), ownerId);
    const member = await QuestionBankMember.findOne({ bankId, userId });
    expect(member.status).toBe('active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/services/questionBank.service.test.js`
Expected: FAIL because service file does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/services/questionBank.service.js`:
```javascript
const { QuestionBank, QuestionBankMember } = require('../models');
const ApiError = require('../utils/ApiError');

class QuestionBankService {
  async createBank({ name, description, type, schoolId, createdBy }) {
    const bank = await QuestionBank.create({ name, description, type, schoolId, createdBy });
    await QuestionBankMember.create({ bankId: bank._id, userId: createdBy, role: 'owner', status: 'active' });
    return bank;
  }

  async inviteMember(bankId, userId, invitedBy) {
    const exists = await QuestionBankMember.findOne({ bankId, userId, status: 'active' });
    if (exists) throw new ApiError(400, 'User is already an active member');

    const member = await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending', invitedBy });
    return member;
  }

  async approveMember(bankId, userId, approvedBy) {
    const member = await QuestionBankMember.findOne({ bankId, userId, status: 'pending' });
    if (!member) throw new ApiError(404, 'Pending member not found');

    member.status = 'active';
    member.approvedBy = approvedBy;
    member.approvedAt = new Date();
    await member.save();
    return member;
  }
}

module.exports = new QuestionBankService();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/services/questionBank.service.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/questionBank.service.js server/tests/unit/services/questionBank.service.test.js
git commit -m "feat: add questionBank service"
```

---

### Task 5: Bank access middleware unit tests

**Files:**
- Test: `server/tests/unit/middlewares/bankAccess.middleware.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const { QuestionBank, QuestionBankMember } = require('../../../src/models');

setupTestDB();

const mockReq = () => ({ params: {}, user: {} });
const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });
const mockNext = jest.fn();

let bankAccess;

beforeEach(async () => {
  jest.resetModules();
  const mod = require('../../../src/middlewares/bankAccess.middleware');
  bankAccess = mod.checkBankAccess;
});

it('calls next for active member', async () => {
  const userId = new mongoose.Types.ObjectId();
  const bankId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: userId });
  await QuestionBankMember.create({ bankId, userId, role: 'manager', status: 'active' });

  const req = mockReq();
  req.params = { bankId: bankId.toString() };
  req.user = { id: userId.toString() };
  const res = mockRes();

  await bankAccess(req, res, mockNext);
  expect(mockNext).toHaveBeenCalled();
});

it('returns 403 for non member', async () => {
  const bankId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: otherUserId });

  const req = mockReq();
  req.params = { bankId: bankId.toString() };
  req.user = { id: new mongoose.Types.ObjectId().toString() };
  const res = mockRes();

  await bankAccess(req, res, mockNext);
  expect(res.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/middlewares/bankAccess.middleware.test.js`
Expected: FAIL because middleware file does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/middlewares/bankAccess.middleware.js`:
```javascript
const httpStatus = require('http-status');
const { QuestionBankMember } = require('../models');
const ApiError = require('../utils/ApiError');

const checkBankAccess = async (req, res, next) => {
  const { bankId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const membership = await QuestionBankMember.findOne({
    bankId,
    userId,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this bank');
  }

  req.membership = membership;
  next();
};

const requireBankRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.membership?.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Insufficient bank permissions');
    }
    next();
  };
};

module.exports = { checkBankAccess, requireBankRole };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/middlewares/bankAccess.middleware.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/middlewares/bankAccess.middleware.js server/tests/unit/middlewares/bankAccess.middleware.test.js
git commit -m "feat: add bank access middleware"
```

---

### Task 6: Bank controller + routes with tests

**Files:**
- Create: `server/src/controllers/questionBank.controller.js`
- Create: `server/src/routes/v1/questionBank.route.js`
- Modify: `server/src/routes/v1/index.js`
- Test: `server/tests/integration/questionBank.integration.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/index');
const { QuestionBank, QuestionBankMember, User } = require('../../../src/models');

describe('QuestionBank API', () => {
  let token;
  let userId;
  let bankId;

  beforeAll(async () => {
    userId = new mongoose.Types.ObjectId();
    await User.create({ _id: userId, name: 'User', email: 'user@example.com', password: 'pass1234', role: 'teacher', schoolId: new mongoose.Types.ObjectId() });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'user@example.com', password: 'pass1234' });
    token = res.body.data.token;
  });

  it('creates a personal bank', async () => {
    const res = await request(app)
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Personal' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('personal');
    bankId = res.body.data._id;
  });

  it('returns created bank', async () => {
    const res = await request(app)
      .get(`/api/v1/banks/${bankId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(bankId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/integration/questionBank.integration.test.js`
Expected: FAIL due to missing route/controller.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/controllers/questionBank.controller.js`:
```javascript
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const QuestionBankService = require('../services/questionBank.service');

const createBank = catchAsync(async (req, res) => {
  const bank = await QuestionBankService.createBank({
    name: req.body.name,
    description: req.body.description,
    type: req.body.type || 'personal',
    schoolId: req.body.schoolId || null,
    createdBy: req.user.id,
  });
  res.status(httpStatus.CREATED).send(bank);
});

const getBank = catchAsync(async (req, res) => {
  const bank = await QuestionBank.findById(req.params.bankId);
  if (!bank) throw new ApiError(404, 'Bank not found');
  res.send(bank);
});

module.exports = { createBank, getBank };
```

Create `server/src/routes/v1/questionBank.route.js`:
```javascript
const express = require('express');
const auth = require('../../middlewares/auth');
const bankController = require('../../controllers/questionBank.controller');

const router = express.Router();

router.route('/').post(auth(), bankController.createBank);
router.route('/:bankId').get(auth(), bankController.getBank);

module.exports = router;
```

In `server/src/routes/v1/index.js`, add:
```javascript
const bankRoute = require('./questionBank.route');
// ...
app.use('/api/v1/banks', bankRoute);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/integration/questionBank.integration.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/questionBank.controller.js server/src/routes/v1/questionBank.route.js server/src/routes/v1/index.js server/tests/integration/questionBank.integration.test.js
git commit -m "feat: add bank controller and routes"
```

---

### Task 7: Update Question service for bank context

**Files:**
- Modify: `server/src/services/question.service.js`
- Test: `server/tests/unit/services/question.service.test.js` (append new cases)

- [ ] **Step 1: Write the failing test**

```javascript
  it('builds bank filter when bankId provided', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const user = { id: new mongoose.Types.ObjectId().toString(), role: 'teacher', schoolId: new mongoose.Types.ObjectId() };
    await Question.create({ content: 'Q', options: [{ id: 'A', content: 'A', isCorrect: true }], createdBy: user.id, bankId });

    const result = await questionService.getAll({ bankId }, user);
    expect(result.results).toHaveLength(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/services/question.service.test.js`
Expected: FAIL if existing tests do not include bankId filter support.

- [ ] **Step 3: Implement minimal code**

In `server/src/services/question.service.js`, inside `getAll`, after `const filter = { ...extraFilters };`, add:
```javascript
    if (query.bankId) filter.bankId = query.bankId;
```

And inside `create`, after setting `data.schoolId`, add:
```javascript
    if (data.bankId) {
      const bank = await QuestionBank.findById(data.bankId);
      if (!bank) throw new ApiError(404, 'QuestionBank not found');
      data.schoolId = bank.schoolId || userSchoolId;
    }
```

And at top:
```javascript
const { QuestionBank } = require('../models');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/services/question.service.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/question.service.js server/tests/unit/services/question.service.test.js
git commit -m "feat: support bank context in question service"
```

---

### Task 8: Bank-scoped question endpoints

**Files:**
- Modify: `server/src/controllers/question.controller.js`
- Modify: `server/src/routes/v1/question.route.js`
- Test: `server/tests/integration/questionBank.integration.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
  it('lists questions in bank', async () => {
    const q = await Question.create({ content: 'InBank', options: [{ id: 'A', content: 'A', isCorrect: true }], createdBy: userId, bankId });
    const res = await request(app)
      .get(`/api/v1/banks/${bankId}/questions`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/integration/questionBank.integration.test.js`
Expected: FAIL due to missing controller/route.

- [ ] **Step 3: Implement minimal code**

In `server/src/controllers/question.controller.js`, add:
```javascript
const getByBank = catchAsync(async (req, res) => {
  const result = await questionService.getAll({ bankId: req.params.bankId }, req.user);
  res.send(result);
});
```

Update exports to include `getByBank`.

In `server/src/routes/v1/questionBank.route.js`, add:
```javascript
const questionController = require('../../controllers/question.controller');

router.route('/:bankId/questions').get(auth(), questionController.getByBank);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/integration/questionBank.integration.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/question.controller.js server/src/routes/v1/questionBank.route.js server/tests/integration/questionBank.integration.test.js
git commit -m "feat: add bank-scoped question listing"
```

---

## Verification

After completing all tasks, run:
```bash
npm test
```

Expected: All tests pass.

---

## Plan Self-Review

- Spec coverage: bank creation, membership, approval, bank-scoped questions covered.
- Placeholder scan: no TBD/TODO.
- Type consistency: roles, statuses, ids consistent across tasks.
- Commands are exact and runnable.
