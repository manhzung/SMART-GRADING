# Upcoming Exams Endpoint cho Mobile Home Screen

**Ngày:** 2026-06-14
**Trạng thái:** Draft (đã duyệt qua 4 phần brainstorming)
**Platform:** Flutter mobile client + Node.js backend
**Phạm vi:** Thêm endpoint backend mới + sửa Mobile dashboard để hiển thị "Upcoming Exams" từ state BLoC riêng thay vì filter từ `getAll`

---

## 1. Bối cảnh & Vấn đề

### 1.1 Luồng hiện tại

**Mobile dashboard** (`dashboard_view.dart`):
- Khi load dashboard, `ExamBloc` dispatch `ExamLoadRequested` → gọi `GET /v1/exams` (`getAll`) với `limit=10, page=1`
- Method `_buildUpcomingExams` filter từ list đó: chỉ lấy exam có `examDate >= now` (đã publish), sort theo `examDate ASC`, lấy 3 cái đầu
- Hiển thị trong card "Upcoming Exams" trên dashboard

**Backend** (`exam.service.js → getAll`):
- Trả về TẤT Cẩ exams của teacher (cả draft, đã qua, sắp tới) — phân trang
- Filter + sort do client xử lý

### 1.2 Vấn đề

1. **Tốn băng thông & thời gian:** Mobile phải tải toàn bộ exam chỉ để lấy 3 cái sắp tới
2. **Logic filter rải rác ở client** → khó test, dễ sai khi đổi logic
3. **Backend thiếu endpoint chuyên dụng** cho dashboard → phải tự filter
4. **Không có sort đúng từ server** → nếu backend sort theo `createdAt DESC` thì client phải sort lại, dễ bug
5. **Pull-to-refresh phải load lại toàn bộ** exam list chỉ để cập nhật 1 card

### 1.3 Yêu cầu chốt (từ user)

1. Thêm endpoint mới `GET /v1/exams/upcoming` (teacher chỉ thấy exam của mình)
2. Mobile `ExamBloc` có event/state riêng cho upcoming exams
3. Tận dụng kết quả để render "Upcoming Exams" card trên dashboard
4. Pull-to-refresh chỉ refresh upcoming (không cần load lại list đầy đủ)
5. Quick scan BẮT BUỘC chọn class vẫn là flow riêng (không liên quan feature này)

---

## 2. Luồng mới

```
Mobile HomePage (initState)
   ├── ExamLoadRequested (giữ nguyên, dùng cho tab Exams, Analytics)
   ├── ClassesLoadRequested (giữ nguyên)
   ├── StudentsLoadRequested (giữ nguyên)
   └── UpcomingExamsLoadRequested(limit: 5)  ← MỚI
        ↓ ExamBloc
        ↓ ExamService.getUpcomingExams(limit: 5)
        ↓ GET /v1/exams/upcoming?limit=5
        ↓ Backend: filter examDate >= now, sort ASC, limit
        ↓ Response: { results, limit, count }
        ↓ ExamBloc emit ExamUpcomingLoaded
        ↓ Dashboard render "Upcoming Exams" card (lấy 3 đầu)
```

**Pull-to-refresh trên dashboard:**
```
onRefresh:
   ├── UpcomingExamsLoadRequested(limit: 5)  ← CHỈ REFRESH UPCOMING
   └── (giữ nguyên 2 dispatch hiện tại nếu có)
```

---

## 3. Trách nhiệm từng thành phần

### 3.1 Backend Route (SỬA)

**File:** `server/src/routes/v1/exam.route.js`

**Thay đổi:**
- Thêm route mới (đặt TRƯỚC `/:examId` để tránh conflict):
```js
router.get('/upcoming', auth(), validate(examValidation.getUpcoming), examController.getUpcoming);
```

### 3.2 Backend Controller (SỬA)

**File:** `server/src/controllers/exam.controller.js`

**Thay đổi:**
- Thêm function `getUpcoming(req, res, next)`:
```js
const getUpcoming = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const exams = await examService.getUpcomingExams(req.user, limit);
    res.status(httpStatus.OK).json({
      results: exams,
      limit,
      count: exams.length,
    });
  } catch (error) {
    next(error);
  }
};
```

### 3.3 Backend Service (SỬA)

**File:** `server/src/services/exam.service.js`

**Thay đổi:**
- Thêm function `getUpcomingExams(user, limit)`:
```js
const getUpcomingExams = async (user, limit) => {
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
};
```

**Đặc điểm:**
- Filter `createdBy = user.id` → chỉ teacher thấy exam của mình
- `examDate >= now` → bỏ exam đã qua
- `examDate: { $ne: null }` → defensive guard cho data lỗi
- Sort `examDate ASC` (gần nhất trước)
- Limit mặc định 5 (max 10 theo validation)
- Populate `classIds` (name, code) + `primaryClassId` (name, code) — KHÔNG populate `omrTemplateId`, `questionIds`, `versions` để response nhẹ

### 3.4 Backend Validation (SỬA)

**File:** `server/src/validations/exam.validation.js`

**Thay đổi:**
- Thêm schema `getUpcoming`:
```js
const getUpcoming = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(10).default(5),
  }),
};
```

### 3.5 Mobile Service (SỬA)

**File:** `client/mobile/lib/core/network/exam_service.dart`

**Thay đổi:**
- Thêm method:
```dart
Future<UpcomingExams> getUpcomingExams({int limit = 5}) {
  return _apiClient.get<UpcomingExams>(
    '${ApiConstants.exams}/upcoming',
    queryParameters: {'limit': limit},
    parser: (data) => UpcomingExams.fromJson(data as Map<String, dynamic>),
  );
}
```

- Thêm class `UpcomingExams` ngay sau `PaginatedExams`:
```dart
class UpcomingExams {
  final List<Exam> results;
  final int limit;
  final int count;

  UpcomingExams({required this.results, required this.limit, required this.count});

  factory UpcomingExams.fromJson(Map<String, dynamic> json) {
    return UpcomingExams(
      results: (json['results'] as List)
          .map((e) => Exam.fromJson(e as Map<String, dynamic>))
          .toList(),
      limit: json['limit'] as int,
      count: json['count'] as int,
    );
  }
}
```

### 3.6 Mobile BLoC (SỬA)

**File:** `client/mobile/lib/presentation/blocs/exam/exam_bloc.dart`

**Thay đổi:**

**Event mới:**
```dart
class UpcomingExamsLoadRequested extends ExamEvent {
  final int limit;
  const UpcomingExamsLoadRequested({this.limit = 5});
  @override
  List<Object?> get props => [limit];
}
```

**State mới:**
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

**Handler:**
```dart
Future<void> _onUpcomingExamsLoadRequested(
  UpcomingExamsLoadRequested event,
  Emitter<ExamState> emit,
) async {
  emit(ExamUpcomingLoading());
  try {
    final result = await examService.getUpcomingExams(limit: event.limit);
    emit(ExamUpcomingLoaded(result.results, result.count));
  } catch (e) {
    emit(ExamError(e.toString()));
  }
}
```

### 3.7 Mobile UI (SỬA)

**File:** `client/mobile/lib/presentation/pages/dashboard_view.dart`

**Thay đổi:**

**Trong `HomePage` `initState` (parent của `DashboardView`):**
- Sau các dispatch hiện tại, thêm:
```dart
context.read<ExamBloc>().add(const UpcomingExamsLoadRequested(limit: 5));
```

**Trong `DashboardView.build`:**
- Thay vì filter từ `ExamLoaded`, watch thêm state mới:
```dart
final examState = context.watch<ExamBloc>().state;
List<Exam> upcomingExams = [];
bool isLoadingUpcoming = false;
if (examState is ExamUpcomingLoading) {
  isLoadingUpcoming = true;
} else if (examState is ExamUpcomingLoaded) {
  upcomingExams = examState.exams;
}
```

**Trong `onRefresh`:**
- Thêm (giữ nguyên 2 dispatch hiện tại nếu có):
```dart
context.read<ExamBloc>().add(const UpcomingExamsLoadRequested(limit: 5));
```

**Logic hiển thị trong `_buildUpcomingExams` (sửa):**
- Loading: hiển thị skeleton 1 card placeholder
- Empty (count = 0): giữ nguyên "No upcoming exams" hiện tại
- Có data: hiển thị list (lấy tối đa 3 từ list, dù backend đã limit 5)

**Lý do tách event/state thay vì dùng lại `ExamLoadRequested`:**
- Endpoint `upcoming` có logic riêng (chỉ teacher, có limit, sort ASC), không trùng với `getAll`
- Có thể refresh độc lập
- Test riêng được
- UX: loading chỉ hiển thị skeleton upcoming, không chặn các stat card khác

---

## 4. API Contract

### 4.1 `GET /v1/exams/upcoming`

**Request:**
```
GET /api/v1/exams/upcoming?limit=5
Authorization: Bearer <token>
```

**Query parameters:**
| Param | Type | Required | Default | Constraint | Mô tả |
|-------|------|----------|---------|------------|-------|
| `limit` | int | No | 5 | 1-10 | Số exam tối đa trả về |

**Response 200 OK:**
```json
{
  "results": [
    {
      "_id": "6650abc123...",
      "title": "Kiểm tra 15 phút - Chương 3",
      "description": "...",
      "examDate": "2026-06-20T07:00:00.000Z",
      "startTime": "07:00",
      "duration": 60,
      "totalScore": 10,
      "status": "published",
      "classIds": [
        { "_id": "6640...", "name": "10A1", "code": "10A1" }
      ],
      "primaryClassId": { "_id": "6640...", "name": "10A1", "code": "10A1" },
      "createdAt": "2026-06-10T03:00:00.000Z"
    }
  ],
  "limit": 5,
  "count": 1
}
```

**Response 401 Unauthorized:** Token không hợp lệ/thiếu

**Đặc điểm response shape:**
- Trả về object với 3 field thay vì paginated list đầy đủ (vì endpoint này có giới hạn cứng)
- Field `count` là số thực tế trả về (≤ limit)
- Chỉ populate `classIds` (name, code) và `primaryClassId` (name, code) — giống `getAll`
- Không populate `omrTemplateId`, `questionIds`, `versions` (vì dashboard không cần) → response nhẹ hơn
- Sort: `examDate ASC` (gần nhất trước)

**Validation errors (Joi):**
- `limit` không phải số 1-10 → 400 với message validation chuẩn

**Edge cases:**
- Teacher chưa tạo exam nào → `{ results: [], count: 0, limit: 5 }`
- Tất cả exam đã qua → empty list
- `examDate = null` (data lỗi) → bỏ qua (filter `$ne: null`)

---

## 5. Error Handling

### 5.1 Mobile
- Service throw → BLoC emit `ExamError` → dashboard hiển thị "No upcoming exams" (graceful degradation)
- Offline: service throw, giống như error
- Network timeout: giống error

### 5.2 Server
- Token hết hạn → 401 (middleware xử lý)
- `limit` invalid → 400 với message validation
- Database timeout → 500, mobile hiển thị error
- Nhiều user role (student) gọi endpoint này → trả empty (vì `createdBy = user.id` không match exam nào) — KHÔNG 403

---

## 6. Testing Strategy

### 6.1 Backend (Jest)

**Unit test** `tests/unit/services/exam.service.test.js` (sửa/thêm):
- `getUpcomingExams(user, limit=5)`:
  - ✅ Trả về exam `createdBy = user.id` có `examDate >= now`
  - ✅ Sắp xếp theo `examDate ASC` (gần nhất trước)
  - ✅ KHÔNG trả về exam của teacher khác
  - ✅ KHÔNG trả về exam đã `examDate < now` (đã qua)
  - ✅ Trả về tất cả status (draft, published, in_progress)
  - ✅ Respect `limit` parameter
  - ✅ Populate `classIds` và `primaryClassId`

**Validation test** `tests/unit/validations/exam.validation.test.js` (sửa):
- `getUpcoming`:
  - ✅ `limit = 5` → pass
  - ✅ `limit = 10` → pass
  - ✅ `limit = 0` → fail
  - ✅ `limit = 11` → fail
  - ✅ `limit = "abc"` → fail
  - ✅ Không có `limit` → pass (default 5)

**Integration test** `tests/integration/exam.route.test.js` (mới hoặc sửa):
- `GET /v1/exams/upcoming`:
  - ✅ 200 với teacher token, trả về list đúng
  - ✅ 401 không có token
  - ✅ 400 với `limit` invalid
  - ✅ Teacher A không thấy exam của Teacher B
  - ✅ Response có shape `{ results, limit, count }`

### 6.2 Mobile (flutter_test)

**Service test** `test/core/network/exam_service_test.dart` (nếu chưa có, tạo mới):
- `getUpcomingExams(limit: 5)`: gọi đúng URL `exams/upcoming?limit=5`, parse đúng response
- Default limit = 5 khi không truyền

**BLoC test** `test/presentation/blocs/exam_bloc_test.dart` (sửa):
- `UpcomingExamsLoadRequested`:
  - ✅ Loading → emit `ExamUpcomingLoading`
  - Service success → emit `ExamUpcomingLoaded(exams, count)`
  - Service throw → emit `ExamError(message)`
  - Giữ nguyên `ExamLoaded` state cũ (không bị clear)

**Widget test** `test/presentation/pages/dashboard_view_test.dart` (sửa):
- ✅ Hiển thị 3 exam đầu tiên từ state `ExamUpcomingLoaded`
- ✅ Hiển thị skeleton khi `ExamUpcomingLoading`
- ✅ Hiển thị "No upcoming exams" khi `count = 0`
- ✅ Pull-to-refresh dispatch lại `UpcomingExamsLoadRequested`

### 6.3 Verification Checklist
- [ ] Tất cả backend test pass: `cd server && npm test`
- [ ] Tất cả mobile test pass: `cd client/mobile && flutter test`
- [ ] Manual test: gọi `GET /v1/exams/upcoming` qua Postman/curl với token teacher → trả đúng shape
- [ ] Manual test: chạy mobile app, dashboard hiển thị "Upcoming Exams" với data thật
- [ ] Lint pass: `cd server && npm run lint` + `cd client/mobile && flutter analyze`
- [ ] Không có regression: dashboard vẫn hiển thị stat cards (Classes, Exams, Students, Papers) như cũ

---

## 7. Files thay đổi

### Backend (Node.js)
| File | Loại | Mô tả |
|------|------|-------|
| `server/src/routes/v1/exam.route.js` | SỬA | Thêm 1 dòng route `GET /upcoming` |
| `server/src/controllers/exam.controller.js` | SỬA | Thêm function `getUpcoming` |
| `server/src/services/exam.service.js` | SỬA | Thêm method `getUpcomingExams` |
| `server/src/validations/exam.validation.js` | SỬA | Thêm schema `getUpcoming` |
| `server/tests/unit/services/exam.service.test.js` | SỬA | Tests cho `getUpcomingExams` |
| `server/tests/unit/validations/exam.validation.test.js` | SỬA | Tests cho schema `getUpcoming` |
| `server/tests/integration/exam.route.test.js` | SỬA/MỚI | Integration test endpoint |

### Mobile (Flutter)
| File | Loại | Mô tả |
|------|------|-------|
| `client/mobile/lib/core/network/exam_service.dart` | SỬA | Thêm method `getUpcomingExams` + class `UpcomingExams` |
| `client/mobile/lib/presentation/blocs/exam/exam_bloc.dart` | SỬA | Thêm 1 event + 2 state + 1 handler |
| `client/mobile/lib/presentation/pages/dashboard_view.dart` | SỬA | Dispatch event mới + watch state mới + render |
| `client/mobile/test/core/network/exam_service_test.dart` | MỚI | Service test |
| `client/mobile/test/presentation/blocs/exam_bloc_test.dart` | SỬA | BLoC test |
| `client/mobile/test/presentation/pages/dashboard_view_test.dart` | SỬA | Widget test |

---

## 8. YAGNI & Out of scope

**Không làm trong feature này:**
- Không thêm filter theo `status` (vd chỉ lấy `published`) — tất cả status đều trả về
- Không thêm filter theo class (vd exam của class cụ thể)
- Không thêm pagination (vì đã có limit cứng, dashboard chỉ cần 3-5)
- Không thêm cache ở mobile (dùng BLoC state làm cache tạm)
- Không thay đổi UI ở web client
- Không thay đổi `ExamSelectionPage` hay các flow khác

---

## 9. Rủi ro & Giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Backend quá strict với limit | Validation cho phép 1-10, default 5 |
| Mobile gọi sai endpoint | Service test cover URL đúng |
| Regression: dashboard mất data khi `ExamLoadRequested` fail | Tách state riêng, `ExamLoaded` cũ vẫn chạy độc lập |
| Pull-to-refresh làm refetch toàn bộ | Chỉ dispatch `UpcomingExamsLoadRequested`, không touch `ExamLoadRequested` |
| `examDate = null` gây crash | Filter `$ne: null` ở backend |

---

## 10. Checklist triển khai (preview)

Sẽ được chi tiết trong `writing-plans` skill output. Tổng quan:
1. Server: route + controller + service + validation
2. Server: unit + integration tests
3. Mobile: service + BLoC + UI
4. Mobile: service + BLoC + widget tests
5. Manual test trên thiết bị thật
