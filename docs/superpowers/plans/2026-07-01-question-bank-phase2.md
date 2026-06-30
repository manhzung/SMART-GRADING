# Question Bank Access Control - Phase 2 Implementation Plan

**Goal:** Add member management (invite/role/remove/leave), access request flow, ownership transfer, school-bank constraints, and listing endpoints.

**Architecture:** Extend `QuestionBankService` with member operations; reuse `QuestionBankMember` model; integrate `checkBankAccess` middleware on protected routes; leverage school-admin role from user model.

**Tech Stack:** Node.js/Express + Mongoose + Jest + Supertest

---

## Task 9: Service - list/get members

### Step 1: Write failing test

Extend `server/tests/unit/services/questionBank.service.test.js` with:

```javascript
it('lists members of a bank', async () => {
  const userIdA = new mongoose.Types.ObjectId();
  const userIdB = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.insertMany([
    { bankId, userId: userIdA, role: 'manager', status: 'active' },
    { bankId, userId: userIdB, role: 'viewer', status: 'pending' },
  ]);

  const active = await service.listMembers(bankId.toString(), { status: 'active' });
  expect(active).toHaveLength(1);
  expect(active[0].userId.toString()).toBe(userIdA.toString());

  const all = await service.listMembers(bankId.toString(), {});
  expect(all).toHaveLength(2);
});
```

### Step 2: Run test - expected FAIL (listMembers missing)

### Step 3: Implement in `server/src/services/questionBank.service.js`

```javascript
async listMembers(bankId, { status } = {}) {
  const filter = { bankId };
  if (status) filter.status = status;
  return QuestionBankMember.find(filter).populate('userId', 'name email role schoolId').lean();
}

async getMembership(bankId, userId) {
  return QuestionBankMember.findOne({ bankId, userId }).lean();
}
```

### Step 4: Run test - expected PASS

### Step 5: Commit

```bash
git commit -m "feat: add listMembers/getMembership in questionBank service"
```

---

## Task 10: Service - invite + set role

### Step 1: Write failing test

```javascript
it('invites a new user as pending viewer', async () => {
  const userId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  const member = await service.inviteMember(bankId.toString(), userId.toString(), ownerId);
  expect(member.status).toBe('pending');
  expect(member.role).toBe('viewer');
});

it('updates pending member to active manager role', async () => {
  const userId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'pending' });
  const updated = await service.setMemberRole(bankId.toString(), userId.toString(), 'manager', ownerId);
  expect(updated.role).toBe('manager');
  expect(updated.status).toBe('active');
});

it('rejects setting role to owner via setMemberRole', async () => {
  const userId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
  await expect(
    service.setMemberRole(bankId.toString(), userId.toString(), 'owner', ownerId)
  ).rejects.toThrow('Cannot promote via setMemberRole');
});
```

### Step 2: Run - FAIL

### Step 3: Implement

In service:

```javascript
async setMemberRole(bankId, userId, role, byUserId) {
  if (role === 'owner') {
    throw new ApiError(400, 'Cannot promote via setMemberRole');
  }
  const member = await QuestionBankMember.findOne({ bankId, userId });
  if (!member) throw new ApiError(404, 'Member not found');
  member.role = role;
  if (member.status === 'pending') member.status = 'active';
  await member.save();
  return member;
}
```

Update `inviteMember` to make explicit role 'viewer'.

### Step 4: Run - PASS

### Step 5: Commit

```bash
git commit -m "feat: add invite/setMemberRole with role constraint"
```

---

## Task 11: Remove member + leave bank

### Step 1: Write failing test

```javascript
it('removes a member', async () => {
  const userId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId, role: 'viewer', status: 'active' });
  await service.removeMember(bankId.toString(), userId.toString(), ownerId);
  const m = await QuestionBankMember.findOne({ bankId, userId });
  expect(m).toBeNull();
});

it('throws when owner tries to leave without transfer', async () => {
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await expect(
    service.leaveBank(bankId.toString(), ownerId.toString())
  ).rejects.toThrow(/transfer ownership/i);
});

it('non-owner can leave', async () => {
  const userId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId, role: 'manager', status: 'active' });
  await service.leaveBank(bankId.toString(), userId.toString());
  const m = await QuestionBankMember.findOne({ bankId, userId });
  expect(m).toBeNull();
});
```

### Step 2: Run - FAIL

### Step 3: Implement

```javascript
async removeMember(bankId, userId) {
  const result = await QuestionBankMember.deleteOne({ bankId, userId });
  return result.deletedCount > 0;
}

async leaveBank(bankId, userId) {
  const member = await QuestionBankMember.findOne({ bankId, userId });
  if (!member) throw new ApiError(404, 'Member not found');
  if (member.role === 'owner') {
    throw new ApiError(400, 'Owner must transfer ownership before leaving');
  }
  await QuestionBankMember.deleteOne({ _id: member._id });
  return true;
}
```

### Step 4: Run - PASS

### Step 5: Commit

```bash
git commit -m "feat: add removeMember and leaveBank"
```

---

## Task 12: Access request flow

### Step 1: Write failing test

```javascript
it('creates a pending request when user requests access', async () => {
  const userId = new mongoose.Types.ObjectId();
  const requester = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  const request = await service.requestAccess(bankId.toString(), requester.toString());
  expect(request.status).toBe('pending');
});

it('throws when active member requests access again', async () => {
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
  await expect(
    service.requestAccess(bankId.toString(), ownerId.toString())
  ).rejects.toThrow(/already an? active member/i);
});

it('responds to a request by approving', async () => {
  const requester = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId: requester, role: 'viewer', status: 'pending' });
  const result = await service.respondToRequest(bankId.toString(), requester.toString(), 'approve', ownerId.toString());
  expect(result.status).toBe('active');
});

it('responds to a request by rejecting (removes)', async () => {
  const requester = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.create({ bankId, userId: requester, role: 'viewer', status: 'pending' });
  await service.respondToRequest(bankId.toString(), requester.toString(), 'reject', ownerId.toString());
  const m = await QuestionBankMember.findOne({ bankId, userId: requester });
  expect(m).toBeNull();
});
```

### Step 2: Run - FAIL

### Step 3: Implement

```javascript
async requestAccess(bankId, userId) {
  const exists = await QuestionBankMember.findOne({ bankId, userId });
  if (exists && exists.status === 'active') {
    throw new ApiError(400, 'User is already an active member');
  }
  return QuestionBankMember.findOneAndUpdate(
    { bankId, userId },
    { bankId, userId, role: 'viewer', status: 'pending' },
    { upsert: true, new: true }
  );
}

async respondToRequest(bankId, userId, decision, approverId) {
  const member = await QuestionBankMember.findOne({ bankId, userId, status: 'pending' });
  if (!member) throw new ApiError(404, 'Pending request not found');
  if (decision === 'approve') {
    member.status = 'active';
    member.approvedBy = approverId;
    member.approvedAt = new Date();
    await member.save();
    return member;
  }
  if (decision === 'reject') {
    await QuestionBankMember.deleteOne({ _id: member._id });
    return { status: 'rejected' };
  }
  throw new ApiError(400, 'Invalid decision');
}
```

### Step 4: Run - PASS

### Step 5: Commit

```bash
git commit -m "feat: add requestAccess and respondToRequest"
```

---

## Task 13: Transfer ownership

### Step 1: Write failing test

```javascript
it('transfers ownership to another active member', async () => {
  const targetId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.insertMany([
    { bankId, userId: ownerId, role: 'owner', status: 'active' },
    { bankId, userId: targetId, role: 'manager', status: 'active' },
  ]);
  await service.transferOwnership(bankId.toString(), ownerId.toString(), targetId.toString());
  const oldOwner = await QuestionBankMember.findOne({ bankId, userId: ownerId });
  const newOwner = await QuestionBankMember.findOne({ bankId, userId: targetId });
  expect(oldOwner.role).toBe('manager');
  expect(newOwner.role).toBe('owner');
});

it('rejects transfer when target not active', async () => {
  const targetId = new mongoose.Types.ObjectId();
  await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: ownerId });
  await QuestionBankMember.insertMany([
    { bankId, userId: ownerId, role: 'owner', status: 'active' },
    { bankId, userId: targetId, role: 'viewer', status: 'pending' },
  ]);
  await expect(
    service.transferOwnership(bankId.toString(), ownerId.toString(), targetId.toString())
  ).rejects.toThrow('Target must be an active member');
});
```

### Step 2: Run - FAIL

### Step 3: Implement

```javascript
async transferOwnership(bankId, fromUserId, toUserId) {
  const target = await QuestionBankMember.findOne({ bankId, userId: toUserId, status: 'active' });
  if (!target) throw new ApiError(400, 'Target must be an active member');

  const currentOwner = await QuestionBankMember.findOne({ bankId, userId: fromUserId, role: 'owner' });
  if (!currentOwner) throw new ApiError(403, 'Only current owner can transfer ownership');

  currentOwner.role = 'manager';
  target.role = 'owner';
  await Promise.all([currentOwner.save(), target.save()]);
}
```

### Step 4: Run - PASS

### Step 5: Commit

```bash
git commit -m "feat: add transferOwnership"
```

---

## Task 14: School bank constraints + listing my banks

### Step 1: Write failing test

```javascript
it('school bank must have at least one school-admin owner', async () => {
  const schoolId = new mongoose.Types.ObjectId();
  const schoolAdminId = new mongoose.Types.ObjectId();
  await QuestionBank.create({
    _id: bankId,
    name: 'SchoolBank',
    type: 'school',
    schoolId,
    createdBy: ownerId,
  });
  await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });

  await expect(
    service.ensureSchoolBankHasAdmin(bankId.toString(), [{ userId: schoolAdminId, role: 'school-admin' }])
  ).rejects.toThrow(/at least one school admin/i);
});

it('passes when school bank has a school-admin', async () => {
  const schoolId = new mongoose.Types.ObjectId();
  const schoolAdminId = new mongoose.Types.ObjectId();
  await QuestionBank.create({
    _id: bankId,
    name: 'SchoolBank',
    type: 'school',
    schoolId,
    createdBy: ownerId,
  });
  await QuestionBankMember.create({ bankId, userId: ownerId, role: 'owner', status: 'active' });
  await QuestionBankMember.create({ bankId, userId: schoolAdminId, role: 'owner', status: 'active' });

  await expect(
    service.ensureSchoolBankHasAdmin(bankId.toString(), [{ userId: schoolAdminId, role: 'school-admin' }])
  ).resolves.toBeUndefined();
});

it('creates a school bank with a school admin added', async () => {
  const schoolId = new mongoose.Types.ObjectId();
  const schoolAdminId = new mongoose.Types.ObjectId();
  const bank = await service.createBank({
    name: 'School Bank',
    type: 'school',
    schoolId,
    createdBy: schoolAdminId,
  });
  const members = await QuestionBankMember.find({ bankId: bank._id });
  const owners = members.filter((m) => m.role === 'owner');
  expect(owners).toHaveLength(1);
  expect(owners[0].userId.toString()).toBe(schoolAdminId.toString());
});
```

### Step 2: Run - FAIL

### Step 3: Implement

```javascript
async ensureSchoolBankHasAdmin(bankId, candidateOwners) {
  const bank = await QuestionBank.findById(bankId);
  if (!bank) throw new ApiError(404, 'Bank not found');
  if (bank.type !== 'school') return;

  const owners = await QuestionBankMember.find({ bankId, role: 'owner', status: 'active' });
  const ownerIds = owners.map((o) => o.userId.toString());
  const hasAdmin = candidateOwners.some(
    (c) => c.role === 'school-admin' && ownerIds.includes(c.userId.toString())
  );
  if (!hasAdmin) {
    throw new ApiError(400, 'School bank must have at least one school admin owner');
  }
}
```

Update `createBank`: when `type === 'school'`, the `createdBy` is required to be a school-admin in the call site. Caller will pre-check or trust request level validation.

### Step 4: Run - PASS

### Step 5: Commit

```bash
git commit -m "feat: add school bank admin constraint"
```

---

## Task 15: List my banks endpoint + controllers/route integration

### Step 1: Write failing integration test

Append to `server/tests/integration/questionBank.integration.test.js`:

```javascript
it('lists banks for the authenticated user', async () => {
  const res = await request(app)
    .get('/api/v1/banks')
    .set('Authorization', `Bearer ${teacherOneAccessToken}`);
  expect(res.status).toBe(httpStatus.OK);
  expect(Array.isArray(res.body)).toBe(true);
});

it('does not list bank user is not member of', async () => {
  const res = await request(app)
    .get('/api/v1/banks')
    .set('Authorization', `Bearer ${teacherTwoAccessToken}`)
    .set('Authorization', `Bearer ${teacherOneAccessToken}`);
  expect(res.body).toHaveLength(0);
});
```

### Step 2: Run - FAIL

### Step 3: Implement

In `server/src/services/questionBank.service.js`:

```javascript
async listBanksForUser(userId) {
  const memberships = await QuestionBankMember.find({ userId, status: 'active' }).lean();
  const bankIds = memberships.map((m) => m.bankId);
  if (bankIds.length === 0) return [];
  return QuestionBank.find({ _id: { $in: bankIds } }).lean();
}
```

In `server/src/controllers/questionBank.controller.js`:

```javascript
const listBanks = catchAsync(async (req, res) => {
  const banks = await QuestionBankService.listBanksForUser(req.user.id);
  res.send(banks);
});
```

In route, add `GET /`:

```javascript
router.route('/').post(auth(), bankController.createBank).get(auth(), bankController.listBanks);
```

### Step 4: Run - PASS

### Step 5: Commit

```bash
git commit -m "feat: add listBanksForUser and GET /banks endpoint"
```

---

## Final Verification

Run targeted tests:
```bash
npm test -- tests/unit/services/questionBank.service.test.js
npm test -- tests/integration/questionBank.integration.test.js
```

Expected: All pass.
