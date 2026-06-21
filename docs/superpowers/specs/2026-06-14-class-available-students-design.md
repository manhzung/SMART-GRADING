# Add Students / Teachers API: Class & School-Scoped Listing Endpoints

**Ngày:** 2026-06-14
**Trạng thái:** Draft (đã duyệt qua 6 phần brainstorming)
**Platform:** Node.js/Express backend + Flutter mobile + React web
**Phạm vi:** Thay thế lệnh gọi `GET /api/v1/users?role=student` (admin-only) bằng 1 endpoint mới theo lớp (`/classes/:id/available-students`); thêm 1 endpoint theo trường (`/schools/:schoolId/available-teachers`) để thay thế lệnh gọi `GET /api/v1/users?role=teacher` ở web. Endpoint theo lớp cho teachers được hoãn (YAGNI — chưa có use case rõ ràng).

---

## 1. Bối cảnh & Vấn đề

### 1.1 Lỗi hiện tại

```
error: Error: Forbidden
    at C:\TAILIEU\DATN\SMART GRADING\server\src\middlewares\auth.js:16:21
    at strategy.success (.../passport/lib/middleware/authenticate.js:219:18)
    at verified (.../passport-jwt/lib/strategy.js:115:41)
    at JwtStrategy.jwtVerify [as _verify] (.../server/src/config/passport.js:20:5)
error: GET /api/v1/users?page=1&limit=50&role=student 403 - 2.309ms - message: Forbidden
lỗi khi vào trang add student ở mobile
```

### 1.2 Phân tích nguyên nhân gốc

| Lớp | Phát hiện |
|---|---|
| **Endpoint lỗi** | `GET /api/v1/users?page=1&limit=50&role=student` |
| **Nơi gọi** | `client/mobile/lib/core/network/user_service.dart:19`, gọi từ `add_students_page.dart:60` |
| **Bảo vệ** | `server/src/routes/v1/user.route.js:12` → `auth('getUsers')` |
| **Phân quyền** | Quyền `'getUsers'` CHỈ có ở role `admin` (xem `server/src/config/roles.js:3`). Teacher KHÔNG có. |
| **User mobile** | Mobile app dùng cho **teacher** (vd `dashboard_view.dart:52` chào "Hi, Prof. $teacherName") |
| **Kết luận** | Đây là **mismatch kiến trúc** — teacher không nên list toàn bộ user, họ chỉ nên thấy học sinh trong lớp/trường mình |

### 1.3 Bug tương tự ở web

`client/web/src/presentation/store/classStore.ts:216` cũng gọi `/users?role=teacher` để lấy dropdown giáo viên trong trang tạo lớp. Hiện tại chưa trigger lỗi nhưng chắc chắn sẽ fail tương tự khi teacher đăng nhập.

### 1.4 Yêu cầu chốt (từ user, qua brainstorming)

1. Khi teacher mở trang "Add Students" của lớp X, họ thấy **tất cả học sinh trong cùng trường** (trừ những em đã có trong lớp) để chọn thêm vào
2. Endpoint admin-only `GET /api/v1/users?role=student` sẽ được **thay thế hoàn toàn** bằng endpoint mới theo lớp
3. Sửa **cả mobile lẫn web** trong đợt này
4. **Phương án chốt:**
   - **Endpoint 1 (class-scoped):** `GET /api/v1/classes/:id/available-students` cho "Add Students" ở mobile — phù hợp vì đang ở context lớp cụ thể
   - **Endpoint 2 (school-scoped):** `GET /api/v1/schools/:schoolId/available-teachers` cho dropdown teachers ở web — phù hợp vì dropdown dùng cho cả create/edit, không có classId ổn định
   - Endpoint 3 (class-scoped teachers) hoãn lại do YAGNI

---

## 2. Phạm vi thay đổi

### 2.1 Server (Node.js/Express)

| File | Thay đổi |
|---|---|
| `src/routes/v1/class.route.js` | Thêm 1 route: `GET /:id/available-students` |
| `src/routes/v1/school.route.js` (hoặc `user.route.js`) | Thêm 1 route: `GET /:schoolId/available-teachers` (xem Section 3.2) |
| `src/validations/class.validation.js` | Thêm schema `getAvailableStudents` |
| `src/validations/school.validation.js` (hoặc mới) | Thêm schema `getAvailableTeachers` |
| `src/controllers/class.controller.js` | Thêm 1 controller method: `getAvailableStudents` |
| `src/controllers/school.controller.js` (hoặc `user.controller.js`) | Thêm 1 controller method: `getAvailableTeachers` |
| `src/services/class.service.js` | Thêm 1 service method: `getAvailableStudents` |
| `src/services/user.service.js` (hoặc `school.service.js`) | Thêm 1 service method: `getAvailableTeachers` |
| `tests/unit/validations/class.validation.test.js` | Bổ sung test cho schema mới |
| `tests/integration/class.test.js` | **MỚI** — integration test cho endpoint mới |

### 2.2 Mobile (Flutter)

| File | Thay đổi |
|---|---|
| `client/mobile/lib/core/network/user_service.dart` | Thay `getStudents()` bằng `getAvailableStudents(classId, ...)` |
| `client/mobile/lib/presentation/pages/add_students_page.dart` | Cập nhật call site (line 60) |
| `client/mobile/test/core/network/user_service_test.dart` | **MỚI** — unit test cho service method mới |

### 2.3 Web (React)

| File | Thay đổi |
|---|---|
| `client/web/src/presentation/store/classStore.ts` | Thay `fetchTeachers` gọi `/users?role=teacher` bằng `/classes/:id/available-teachers` |

---

## 3. API Contracts

### 3.1 `GET /api/v1/classes/:id/available-students`

**Request:**
```
GET /api/v1/classes/:id/available-students?search=...&page=1&limit=20
Authorization: Bearer <jwt>
```

**Query params (optional):**
- `search` (string, max 100 chars) — tìm theo `name`, `studentCode`, `email` (case-insensitive, partial match)
- `page` (integer ≥ 1, default 1)
- `limit` (integer 1-100, default 20)

**Auth:** `auth('manageClasses')` + service-level `_authorizeClassAccess(id, user, 'view')`

**Response 200:**
```json
{
  "results": [
    {
      "id": "65f0a1b2c3d4e5f6a7b8c9d0",
      "name": "Nguyễn Văn An",
      "email": "an.nv@school.edu.vn",
      "studentCode": "HS10003",
      "avatarUrl": null,
      "isActive": true
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 47,
  "pages": 3
}
```

**Error responses:**
- `401 Unauthorized` — token missing/invalid
- `403 Forbidden` — teacher không phải homeroom/subject teacher của lớp; admin vẫn OK
- `404 Not Found` — classId không tồn tại hoặc lớp đã bị deactivate

### 3.2 `GET /api/v1/schools/:schoolId/available-teachers`

**Mục đích:** Web `classStore.fetchTeachers()` cần list teachers cùng trường để populate dropdown:
- Khi tạo lớp mới (chưa có classId)
- Khi xem chi tiết lớp để quản lý subject teachers / transfer homeroom

Endpoint theo lớp (3.3) phù hợp cho context edit/add — endpoint theo trường phù hợp cho create.

**Request:**
```
GET /api/v1/schools/:schoolId/available-teachers?search=...&page=1&limit=20
Authorization: Bearer <jwt>
```

**Query params:** giống 3.1

**Auth:** `auth()` (chỉ cần đăng nhập) + check school boundary

**Filter logic:** Tìm user `role = { $in: ['teacher', 'admin'] }` trong `schoolId = schoolId`, sắp xếp theo `name: 1`.

**Response 200:** Cùng shape với 3.1, mỗi item có thêm `role`:
```json
{
  "results": [
    {
      "id": "65f0a1b2c3d4e5f6a7b8c9d1",
      "name": "Trần Thị B",
      "email": "tranb@school.edu.vn",
      "role": "teacher",
      "avatarUrl": null,
      "isActive": true
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 12,
  "pages": 1
}
```

**Error responses:**
- `401 Unauthorized` — token missing/invalid
- `403 Forbidden` — user không thuộc `schoolId` này; admin luôn OK (bypass school check)
- `404 Not Found` — `schoolId` không tồn tại

### 3.3 (Tương lai) `GET /api/v1/classes/:id/available-teachers`

Endpoint lồng theo lớp sẽ được thêm SAU nếu cần loại trừ homeroom/subject teachers hiện tại khỏi dropdown. Hiện tại chưa có use case rõ ràng trong UI → giữ scope YAGNI.

**Lý do tách 3.2 và 3.3:**
- `ClassDetailPage` và `ClassesPage` đều dùng `fetchTeachers()` global — không truyền `classId`
- Truyền `classId` vào method yêu cầu refactor cả 2 call sites và component
- Tách endpoint theo trường giữ nguyên call site ở client, chỉ đổi URL

---

## 4. Service logic (chi tiết)

### 4.1 `classService.getAvailableStudents(classId, query, requestingUser)`

```javascript
async getAvailableStudents(classId, query, requestingUser = null) {
  // 1. Authorize (dùng helper có sẵn)
  const classData = await this._authorizeClassAccess(classId, requestingUser, 'view');

  // 2. Parse pagination
  const { page, limit, skip } = parsePagination(query);

  // 3. Build filter
  const filter = {
    role: 'student',
    schoolId: classData.schoolId,
    _id: { $nin: classData.studentIds },
  };

  if (query.search && query.search.trim().length > 0) {
    const escaped = escapeRegex(query.search.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { studentCode: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  // 4. Query
  const [results, total] = await Promise.all([
    User.find(filter)
      .select('name email studentCode avatarUrl isActive')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { results, page, limit, total, pages: Math.ceil(total / limit) };
}
```

### 4.2 `userService.getAvailableTeachers(schoolId, query, requestingUser)` (MỚI — trong `user.service.js`, không phải `class.service.js`)

Tương tự 4.1 nhưng:
- Filter: `role = { $in: ['teacher', 'admin'] }`, `schoolId = schoolId`
- Select thêm `role` field
- Sort theo `name: 1`
- Authorization: kiểm tra `requestingUser.schoolId?.toString() === schoolId?.toString()` HOẶC `requestingUser.role === 'admin'`

Đặt trong `user.service.js` (không phải `class.service.js`) vì endpoint thuộc `school.route.js`, không liên quan đến class authorization.

### 4.3 Lưu ý kỹ thuật

- Dùng `escapeRegex` (helper có sẵn trong `query.utils.js` hoặc tương đương) để tránh ReDoS
- Query `_id: { $nin: classData.studentIds }` hoạt động tốt vì `studentIds` trong `Class` model là `array of ObjectId refs`
- `$or` với search tương tự pattern đã có trong codebase
- Không filter `isActive: true` ở server — deactivation là admin concern, teacher cần thấy để biết
- `parsePagination` đã có sẵn trong `src/utils/parsePagination.js`

---

## 5. Client thay đổi

### 5.1 Mobile (`client/mobile`)

**File `core/network/user_service.dart`:**
- **Xóa** method `getStudents()` (dùng admin endpoint)
- **Thêm** method `getAvailableStudents({required String classId, int page, int limit, String? search})` gọi `/classes/{classId}/available-students`
- **Giữ nguyên** method `getTeachers()` (vẫn dùng cho trang khác nếu cần, hoặc đánh dấu deprecated)

**File `presentation/pages/add_students_page.dart`:**
- **Sửa** dòng 60: `await _userService.getStudents()` → `await _userService.getAvailableStudents(classId: widget.cls.id)`
- Phần còn lại (UI, filter, search) **không thay đổi** — JSON shape tương thích

### 5.2 Web (`client/web`)

**File `presentation/store/classStore.ts`:**
- Method `fetchTeachers()` (line 210-221) hiện gọi `apiService.get<PaginatedTeachers>('/users', { params })`
- Thay bằng: `apiService.get<PaginatedTeachers>('/schools/{schoolId}/available-teachers', { params })`
- URL đã có `schoolId` từ `useAuthStore.getState().user?.schoolId` (line 213) — không cần refactor call site
- Mobile `create_edit_class_page.dart` cũng gọi `getTeachers()` → sẽ được update trong đợt riêng (YAGNI cho spec này)

---

## 6. Testing strategy (TDD: RED → GREEN → REFACTOR)

### 6.1 Server tests (Jest)

**Unit test cho validation (`tests/unit/validations/class.validation.test.js`):**
- Bổ sung test cho schema `getAvailableStudents`:
  - Accept valid id, search, page, limit
  - Reject invalid id (không phải ObjectId)
  - Reject limit > 100
  - Reject search > 100 chars
  - Default page=1, limit=20 khi không truyền

**Unit test cho `user.service.js` (mở rộng file hiện có nếu có, hoặc tạo mới):**
- `getAvailableTeachers`:
  - User cùng trường → trả về list teacher + admin
  - User khác trường → throw 403
  - Admin → bypass school check
  - Search filter hoạt động
  - Lọc đúng `role = { $in: ['teacher', 'admin'] }`

**Unit test cho service (`tests/unit/services/class.service.test.js` — MỚI):**
- `getAvailableStudents`:
  - Teacher là homeroom → trả về list student cùng trường, loại trừ HS trong lớp
  - Teacher không phải homeroom → throw 403
  - Admin → trả về full list
  - Search filter hoạt động (case-insensitive, partial match)
  - Pagination hoạt động đúng
  - Lớp không tồn tại → throw 404

**Integration test (`tests/integration/class.test.js` — MỚI):**
- Setup: tạo 1 school, 1 admin, 2 teacher (1 homeroom của class A, 1 không), 1 class A với 2 students, 1 class B
- `GET /api/v1/classes/:id/available-students`:
  - Không có token → 401
  - Teacher khác lớp → 403
  - Teacher đúng lớp (homeroom) → 200 + đúng data
  - Admin → 200
  - Search filter integration test
- `GET /api/v1/schools/:schoolId/available-teachers`:
  - User cùng trường → 200
  - User khác trường → 403
  - Admin (bất kỳ trường nào) → 200

### 6.2 Mobile tests (Flutter)

**File `test/core/network/user_service_test.dart` (MỚI):**
- `getAvailableStudents` builds đúng URL với params (`/classes/{id}/available-students?page=1&limit=20&search=foo`)
- Parser `PaginatedUsers.fromJson` hoạt động đúng với response shape mới

### 6.3 Test commands

```bash
# Server
cd server && npm test

# Mobile
cd client/mobile && flutter test
```

---

## 7. Error handling & Edge cases

| Tình huống | Hành vi |
|---|---|
| Class bị `isActive: false` | Trả 404 với message "Class has been deactivated" (đã có sẵn trong `_authorizeClassAccess`) |
| Teacher là homeroom của lớp khác trong cùng trường | Vẫn 403 vì không phải homeroom/subject teacher của lớp này |
| Học sinh đã có trong lớp | Bị loại bỏ khỏi response nhờ `_id: { $nin }` |
| Học sinh cùng trường nhưng đã ở lớp khác | VẪN xuất hiện (mỗi HS có thể ở nhiều lớp) |
| `search` chứa ký tự regex đặc biệt (`.*+?^${}()`) | Escape bằng `escapeRegex` helper |
| `search` rỗng / chỉ whitespace | Bỏ qua filter search |
| Token hết hạn | 401 (handled bởi passport middleware) |
| Student `isActive: false` | VẪN hiển thị (deactivation là admin concern) |
| Lớp có 0 students | Trả `{ results: [], total: 0, pages: 0 }` |
| Lớp có >100 students available | Pagination xử lý, mỗi page tối đa 100 |

**Backward compatibility:**
- Endpoint cũ `/api/v1/users?role=student` và `/api/v1/users?role=teacher` VẪN hoạt động cho admin dùng ở chỗ khác (không xóa route cũ)
- Chỉ thay đổi call site ở mobile "Add Students" và web "create class" dropdown

---

## 8. Verification steps (sau khi implement)

1. Server: `cd server && npm test` — tất cả test pass (cũ + mới)
2. Mobile: `cd client/mobile && flutter test` — tất cả test pass
3. **End-to-end manual test (mobile):**
   - Đăng nhập với teacher
   - Vào chi tiết lớp → tab Học sinh → "Thêm học sinh"
   - Verify list học sinh load được (không còn 403)
   - Search "Nguyễn" → filter hoạt động
   - Chọn 2 học sinh → "Confirm Addition" → success
4. **End-to-end manual test (web):**
   - Đăng nhập với teacher
   - Tạo lớp mới → dropdown "Giáo viên chủ nhiệm" load được
5. **Negative test:**
   - Với teacher không phải homeroom/subject teacher của lớp → API trả 403
   - Với classId không tồn tại → API trả 404

---

## 9. Out of scope (YAGNI)

- Không tạo endpoint `GET /classes/:id/available-teachers` (chưa có use case rõ ràng — web dropdown dùng list toàn trường; khi nào cần loại trừ homeroom/subject teachers hiện tại thì thêm)
- Không tạo endpoint riêng cho "available parents" (chưa có use case)
- Không thêm filter theo `gradeLevel` cho available-students (teacher dùng để add vào lớp, nên thấy tất cả HS trong trường)
- Không thay đổi endpoint `/users` admin-only hiện tại (giữ nguyên cho admin dùng)
- Không thêm bulk operations (teacher add từng em một hoặc dùng tab "Import New" đã có)
- Không thêm cache (list học sinh thay đổi thường xuyên theo import, không đáng cache)
- Không sửa mobile `create_edit_class_page.dart` (cũng gọi `getTeachers()` cho dropdown homeroom — sẽ làm trong đợt riêng nếu admin-only endpoint đó cũng fail)
