# Bank Members Management Modal - Design Spec

## Overview
Feature cho phép owner/manager của một question bank quản lý thành viên thông qua modal popup.

## User Flow
1. User vào Question Bank detail page
2. Nếu user có role owner hoặc manager → thấy button "Manage Bank" ở header
3. Click → Modal hiện lên với 3 sections

## Layout

### Modal Structure
- **Size**: Large (800px width, max-height 80vh, scrollable)
- **Header**: Bank name + close button (X)
- **Body**: 3 sections stacked vertically

### Header
```
┌─────────────────────────────────────────┐
│  [Bank Name]                        [X]  │
└─────────────────────────────────────────┘
```

### Body - 3 Sections

#### Section 1: Managers 👑
- Header: "Managers" + count badge
- Roles shown: owner, manager
- Actions per member:
  - Owner: chỉ hiển thị role badge (không action)
  - Manager: "Remove" button

#### Section 2: Viewers 👥
- Header: "Viewers" + count badge  
- Roles shown: viewer
- Actions per member:
  - "Promote to Manager" button
  - "Remove" button

#### Section 3: Pending Requests ⏳
- Header: "Pending Requests" + count badge
- Status: pending
- Actions per request:
  - "Approve" button
  - "Reject" button

## Member Card Component
```
┌────────────────────────────────────────────────┐
│ [Avatar]  Name                      [Role Badge]│
│           email@school.edu                     │
│                              [Action Button(s)] │
└────────────────────────────────────────────────┘
```

## Permissions Matrix

| Action | Owner | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| View modal | ✅ | ✅ | ❌ |
| Promote viewer → manager | ✅ | ✅ | ❌ |
| Remove member (viewer/manager) | ✅ | ✅ | ❌ |
| Approve pending request | ✅ | ✅ | ❌ |
| Reject pending request | ✅ | ✅ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Demote owner → manager | ✅ | ❌ | ❌ |

## API Endpoints (Existing)

| Method | Endpoint | Used for |
|--------|----------|----------|
| GET | `/api/v1/question-banks/:bankId/members` | Load all members |
| GET | `/api/v1/question-banks/:bankId/pending` | Load pending requests |
| PATCH | `/api/v1/question-banks/:bankId/members/:userId` | Update role (promote) |
| DELETE | `/api/v1/question-banks/:bankId/members/:userId` | Remove member |
| POST | `/api/v1/question-banks/:bankId/respond-request/:userId` | Approve/Reject |

## Frontend Components

### 1. BankManagementModal.tsx
- Props: `bankId: string`, `isOpen: boolean`, `onClose: () => void`
- Fetches members + pending on mount
- Passes data to sections

### 2. MemberSection.tsx
- Props: `title`, `icon`, `members[]`, `actions[]`
- Renders list of MemberCard

### 3. MemberCard.tsx
- Props: `member`, `actions[]`
- Renders avatar, name, email, role badge, action buttons

## State Management
- Local component state (useState) cho modal data
- Mutations trigger re-fetch của members list
- Toast notifications for success/error

## Error Handling
- Show toast error on API failure
- Keep modal open on error (user can retry)
- Disable buttons during loading

## UX Details
- Loading skeleton while fetching data
- Empty state message cho từng section khi không có data
- Confirm dialog trước khi Remove/Transfer ownership
- Optimistic UI update (optional)
