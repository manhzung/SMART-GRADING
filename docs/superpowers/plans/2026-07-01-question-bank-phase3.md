# Question Bank Phase 3 - Frontend & Notifications Plan

**Goal:** Add bank selector to QuestionBankPage; create BankMembersPage for member management; add pending-request page; emit notifications on bank events; integrate notification badge in RoleDashboard.

**Architecture:**
- Backend: extend notification enum + service hooks into `questionBank.service`.
- Frontend: add `bankService` API client, bank-store Zustand, bank selector component, BankMembersPage, BankRequestsPage, notification badge polling.

**Tech Stack:**
- Backend: Node.js/Express + Mongoose + Jest + Supertest
- Frontend: React + TypeScript + Zustand + React Query + Vitest/Jest

---

## Backend tasks

### Task 16: Notification enums + helpers

**Files:**
- Modify: `server/src/models/notification.model.js` (add types)
- Modify: `server/src/services/notification.service.js` (add bank methods)
- Test: `server/tests/unit/services/notification.service.test.js`

Steps:

1. Write failing test for `notifyBankRequestSubmitted`, `notifyBankRequestApproved`, `notifyBankRequestRejected`.

```javascript
const Notification = require('../../../src/models/notification.model');
const notificationService = require('../../../src/services/notification.service');

it('notifies owner of new bank access request', async () => {
  await notificationService.notifyBankRequestSubmitted({
    bankId: new mongoose.Types.ObjectId(),
    bankName: 'Personal Bank',
    requesterId: new mongoose.Types.ObjectId(),
    requesterName: 'Tao',
    ownerId: new mongoose.Types.ObjectId(),
  });
  const docs = await Notification.find({ type: 'bank_request_submitted' });
  expect(docs).toHaveLength(1);
  expect(docs[0].title).toContain('Tao');
});
```

2. Run - FAIL.
3. Add to notification model enum: `bank_request_submitted`, `bank_request_approved`, `bank_request_rejected`, `bank_member_added`.
4. Add to notification.service.js:

```javascript
async notifyBankRequestSubmitted({ bankId, bankName, requesterName, ownerId }) {
  return Notification.create({
    userId: ownerId,
    type: 'bank_request_submitted',
    title: 'New access request',
    body: `${requesterName} requested access to bank "${bankName}".`,
    data: { bankId },
    channels: ['in_app'],
    priority: 'normal',
  });
}

async notifyBankRequestApproved({ bankId, bankName, userId }) {
  return Notification.create({
    userId,
    type: 'bank_request_approved',
    title: 'Access approved',
    body: `Your request to access bank "${bankName}" was approved.`,
    data: { bankId },
    channels: ['in_app'],
    priority: 'normal',
  });
}

async notifyBankRequestRejected({ bankId, bankName, userId }) {
  return Notification.create({
    userId,
    type: 'bank_request_rejected',
    title: 'Access rejected',
    body: `Your request to access bank "${bankName}" was rejected.`,
    data: { bankId },
    channels: ['in_app'],
    priority: 'normal',
  });
}
```

5. Run - PASS.

### Task 17: Hook notification calls into bank service

**Files:**
- Modify: `server/src/services/questionBank.service.js`
- Test: extend `server/tests/unit/services/questionBank.service.test.js` (mock notification)

Steps:

1. Failing test - validate notifications emitted.

```javascript
it('emits a request_submitted notification on requestAccess', async () => {
  // ... setup bank + member
  await service.requestAccess(bankId.toString(), requester.toString());
  // assert notification doc exists
});
```

2. Run - FAIL.
3. Update service to call notification hooks after `requestAccess` and `respondToRequest`.
4. Run - PASS.

---

## Frontend tasks

### Task 18: bankService API client

Create `client/web/src/services/bankService.ts`:
- `listBanks()`
- `createBank(payload)`
- `getBank(id)`
- `listMembers(bankId, status?)`
- `inviteMember(bankId, userId)`
- `updateMemberRole(bankId, userId, role)`
- `removeMember(bankId, userId)`
- `leaveBank(bankId)`
- `requestAccess(bankId)`
- `listPending(bankId)`
- `respondRequest(bankId, userId, decision)`
- `transferOwnership(bankId, toUserId)`
- `getBankQuestions(bankId, params)`

### Task 19: bankStore Zustand

Create `client/web/src/presentation/store/bankStore.ts`:
- state: banks, currentBank, members, pendingRequests
- actions: fetchBanks, fetchBank, fetchMembers, fetchPending, inviteMember, updateMember, removeMember, leave, requestAccess, respond, transfer

### Task 20: Notification badge hook

Create `client/web/src/presentation/hooks/useUnreadNotifications.ts` using React Query polling every 30s.

Create `client/web/src/presentation/components/NotificationBadge.tsx`:
- Uses hook to display bell icon with unread count
- Click navigates to /notifications

### Task 21: Bank selector in QuestionBankPage

Modify `client/web/src/pages/QuestionBankPage.tsx`:
- Fetch user's banks on mount
- Add dropdown selector near header
- Selected bankId passed as filter to `fetchQuestions({ bankId })`
- "Create Bank" button opens modal

### Task 22: BankMembersPage

Create `client/web/src/pages/BankMembersPage.tsx` + `BankMembersPage.module.css`:
- Lists members with role badges
- Owner can edit role, remove members, transfer ownership
- Show "Leave Bank" if user is not owner

### Task 23: BankRequestsPage (pending)

Create `client/web/src/pages/BankRequestsPage.tsx` + `.module.css`:
- Lists pending requests for selected bank
- Owner/manager can approve/reject

### Task 24: Routes

Modify `client/web/src/presentation/routes/AppRoutes.tsx`:
- `/banks/:bankId/members`
- `/banks/:bankId/requests`
- `/bank-members`

### Task 25: Tests

Frontend test files (Vitest/Jest based on project setup):
- `client/web/src/services/bankService.test.ts` - API mocking
- `client/web/src/presentation/store/bankStore.test.ts` - store actions
- `client/web/src/pages/QuestionBankPage.bankSelector.test.tsx` - integration

---

## Final verification

Run backend tests: `npm test -- tests/unit/services/notification.service.test.js tests/unit/services/questionBank.service.test.js`

Run frontend tests: `npm test -- src/services/bankService.test.ts src/presentation/store/bankStore.test.ts`

Expected: all pass.