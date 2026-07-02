# Teacher Bank Approval Requirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict `GET /api/v1/banks` so non-school-admin users only see banks they have an approved membership for, while keeping `GET /api/v1/banks/search` available for discovery and access requests.

**Architecture:** Add a small service method for approved-membership bank listing, update the controller to use it for non-admin/school-admin users, and add focused backend tests that prove the new role-specific behavior without changing the search endpoint.

**Tech Stack:** Node.js, Express, Jest/Supertest, Mongoose

---

## File Structure

- `server/src/services/questionBank.service.js` — add approved-membership listing helper
- `server/src/controllers/questionBank.controller.js` — update `listBanks` role branching
- `server/tests/unit/services/questionBank.service.test.js` — unit test the new helper
- `server/tests/integration/questionBank.integration.test.js` — integration test controller behavior for teacher/admin/school-admin

---

### Task 1: Add service method for approved banks

**Files:**
- Modify: `server/src/services/questionBank.service.js`
- Test: `server/tests/unit/services/questionBank.service.test.js`

- [ ] **Step 1: Write the failing test**

Add a unit test proving the new helper only returns banks with active membership and ignores pending membership.

```javascript
describe('listApprovedBanksForUser', () => {
  it('returns only active membership banks and ignores pending', async () => {
    const userId = new mongoose.Types.ObjectId();
    const bankIdA = new mongoose.Types.ObjectId();
    const bankIdB = new mongoose.Types.ObjectId();
    const bankIdC = new mongoose.Types.ObjectId();
    await QuestionBank.insertMany([
      { _id: bankIdA, name: 'Approved A', createdBy: ownerId },
      { _id: bankIdB, name: 'Approved B', createdBy: ownerId },
      { _id: bankIdC, name: 'Pending C', createdBy: ownerId },
    ]);
    await QuestionBankMember.insertMany([
      { bankId: bankIdA, userId, role: 'owner', status: 'active' },
      { bankId: bankIdB, userId, role: 'viewer', status: 'active' },
      { bankId: bankIdC, userId, role: 'viewer', status: 'pending' },
    ]);

    const banks = await service.listApprovedBanksForUser(userId.toString());
    const ids = banks.map((bank) => bank._id.toString()).sort();
    expect(ids).toEqual([bankIdA.toString(), bankIdB.toString()].sort());
  });

  it('returns empty array when user has no active membership', async () => {
    const userId = new mongoose.Types.ObjectId();
    const banks = await service.listApprovedBanksForUser(userId.toString());
    expect(banks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/unit/services/questionBank.service.test.js`
Expected: FAIL with `service.listApprovedBanksForUser is not a function`

- [ ] **Step 3: Write minimal implementation**

Add this method to `server/src/services/questionBank.service.js`:

```javascript
async listApprovedBanksForUser(userId) {
  const memberships = await QuestionBankMember.find({
    userId,
    status: 'active',
  }).lean();
  const bankIds = memberships.map((membership) => membership.bankId);
  if (bankIds.length === 0) {
    return [];
  }
  return QuestionBank.find({ _id: { $in: bankIds } })
    .select('name description type schoolId createdAt')
    .sort({ createdAt: -1 })
    .lean();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/unit/services/questionBank.service.test.js`
Expected: PASS for the two new cases

- [ ] **Step 5: Commit**

```bash
git add server/src/services/questionBank.service.js server/tests/unit/services/questionBank.service.test.js
git commit -m "feat: add approved bank listing for non-admin users"
```

---

### Task 2: Update controller list behavior

**Files:**
- Modify: `server/src/controllers/questionBank.controller.js`
- Test: `server/tests/integration/questionBank.integration.test.js`

- [ ] **Step 1: Write the failing test**

Add integration tests proving `GET /api/v1/banks` now respects approved membership for teachers and still returns school banks for school-admin and all banks for admin.

```javascript
describe('list banks by role', () => {
  let bankId;
  let schoolAdminId;
  let schoolAdminToken;

  beforeEach(async () => {
    schoolAdminId = new mongoose.Types.ObjectId();
    await User.create({
      _id: schoolAdminId,
      name: 'School Admin',
      email: 'school-admin@example.com',
      password: 'hashed',
      role: 'school-admin',
      schoolId: teacherOne.schoolId,
      isActive: true,
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'school-admin@example.com', password: 'hashed' });
    schoolAdminToken = login.body.token;
  });

  it('returns only approved banks for teacher', async () => {
    bankId = await createBank(teacherOneAccessToken, 'Teacher Bank');
    await createBank(teacherTwoAccessToken, 'Other Teacher Bank');

    await QuestionBankMember.create({
      bankId,
      userId: teacherOne._id,
      role: 'owner',
      status: 'active',
    });

    const res = await request(app)
      .get('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._id).toBe(bankId);
  });

  it('does not include pending bank for teacher', async () => {
    bankId = await createBank(teacherOneAccessToken, 'Pending Bank');
    await QuestionBankMember.create({
      bankId,
      userId: teacherOne._id,
      role: 'viewer',
      status: 'pending',
    });

    const res = await request(app)
      .get('/api/v1/banks')
      .set('Authorization', `Bearer ${teacherOneAccessToken}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body).toHaveLength(0);
  });

  it('returns all school banks for school-admin', async () => {
    const schoolBankA = await createBank(teacherOneAccessToken, 'School A');
    const schoolBankB = await createBank(teacherTwoAccessToken, 'School B');
    await QuestionBank.updateOne(
      { _id: schoolBankB },
      { $set: { schoolId: teacherOne.schoolId } }
    );

    const res = await request(app)
      .get('/api/v1/banks')
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.map((bank) => bank._id).sort()).toEqual(
      [schoolBankA, schoolBankB].sort()
    );
  });

  it('returns all banks for admin', async () => {
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin' });
    const adminToken = adminLogin.body.token;

    const adminBank = await createBank(adminLogin.body.token, 'Admin Bank');

    const res = await request(app)
      .get('/api/v1/banks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.some((bank) => bank._id === adminBank)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/tests/integration/questionBank.integration.test.js`
Expected: FAIL for teacher list behavior and school-admin/admin role separation

- [ ] **Step 3: Write minimal implementation**

Replace `listBanks` in `server/src/controllers/questionBank.controller.js` with:

```javascript
const listBanks = catchAsync(async (req, res) => {
  if (req.user.role === 'admin') {
    const banks = await QuestionBank.find()
      .select('name description type schoolId createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.send(banks);
  }

  if (req.user.role === 'school-admin' && req.user.schoolId) {
    const banks = await QuestionBank.find({ schoolId: req.user.schoolId })
      .select('name description type schoolId createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.send(banks);
  }

  const banks = await QuestionBankService.listApprovedBanksForUser(req.user.id);
  return res.send(banks);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/tests/integration/questionBank.integration.test.js`
Expected: PASS for the new role-scoped list cases and existing bank flows

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/questionBank.controller.js server/tests/integration/questionBank.integration.test.js
git commit -m "feat: restrict list banks to approved memberships for teachers"
```

---

### Task 3: Run targeted verification and lint

**Files:**
- Affected: `server/src/services/questionBank.service.js`
- Affected: `server/src/controllers/questionBank.controller.js`
- Affected: `server/tests/unit/services/questionBank.service.test.js`
- Affected: `server/tests/integration/questionBank.integration.test.js`

- [ ] **Step 1: Run targeted backend tests**

Run: `npm test -- server/tests/unit/services/questionBank.service.test.js server/tests/integration/questionBank.integration.test.js`
Expected: PASS

- [ ] **Step 2: Run full backend test suite**

Run: `cd server && npm test`
Expected: PASS, no regressions

- [ ] **Step 3: Run linter on changed files**

Run: `cd server && npm run lint -- server/src/services/questionBank.service.js server/src/controllers/questionBank.controller.js server/tests/unit/services/questionBank.service.test.js server/tests/integration/questionBank.integration.test.js`
Expected: No new lint errors

- [ ] **Step 4: Optional frontend sanity check**

Verify `client/web/src/pages/BankLandingPage.tsx` still uses `/banks` for Your Banks and `/banks/search` for All Banks without changing behavior.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-02-bank-approval-requirement.md docs/superpowers/plans/2026-07-02-bank-approval-requirement.md
git commit -m "docs: add bank approval requirement spec and plan"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-02-bank-approval-requirement.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
