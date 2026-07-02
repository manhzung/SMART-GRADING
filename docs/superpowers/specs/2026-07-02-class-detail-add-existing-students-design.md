# Web: Add Existing Students to Class Detail

**Ngày:** 2026-07-02
**Trạng thái:** Draft (chờ duyệt)
**Platform:** React web
**Phạm vi:** Bổ sung chức năng "Add existing student" trên trang chi tiết lớp, dựa trên endpoint backend đã có sẵn.

---

## 1. Bối cảnh & Vấn đề

### 1.1 Hiện trạng
Trang chi tiết lớp hiện có:
- **Add Student** → dùng `POST /classes/:id/students/import` để tạo mới hoặc import thủ công học sinh rồi thêm vào lớp.
- **Import from Excel** → nhập danh sách học sinh mới bằng file.

Nhưng chưa có chức năng **thêm học sinh đã tồn tại trong hệ thống** vào lớp một cách nhanh chóng.

### 1.2 Backend đã sẵn sàng
Các endpoint dưới đây đã tồn tại và có thể dùng trực tiếp:
- `GET /classes/:id/available-students`
- `POST /classes/:id/students` (`addStudents`)
- `GET /classes/:id/students/credentials`

Như vậy, phạm vi thay đổi ở **server là 0 endpoint mới**, chỉ tận dụng API hiện có.

---

## 2. Yêu cầu chốt

1. Trên web `ClassDetailPage`, thêm 1 chức năng mới **Add Existing Student** cạnh nút **Add Student** hiện tại.
2. Giao diện gọn: dùng **1 modal chung** với 2 tab:
   - **Search**: tìm kiếm nhanh theo tên / mã / email
   - **Select from list**: danh sách học sinh khả dụng, có phân trang, chọn nhiều
3. Chỉ thêm học sinh đã có trong hệ thống; không tạo user mới.
4. Sau khi thêm thành công → refresh danh sách lớp + thông báo.
5. Không sửa backend trong đợt này.

---

## 3. Frontend thay đổi

### 3.1 `client/web/src/pages/ClassDetailPage.tsx`

#### Thay đổi chính
- Thêm 1 nút **Add Existing Student** trong header actions.
- Thêm modal **Add Existing Student** với 2 tab: **Search** và **Select from list**.
- Trong cả 2 tab:
  - Load danh sách học sinh khả dụng qua `GET /classes/:id/available-students`
  - Cho phép chọn nhiều học sinh
  - Submit → gọi `POST /classes/:id/students` với mảng `studentIds`
  - Refresh class + đóng modal + thông báo thành công

#### State cần thêm
- `isExistingStudentModalOpen`
- `existingStudentTab` (`search` | `list`)
- `availableStudents`
- `availableSearchQuery`
- `availableSelectedIds`
- `availablePage`, `availableLimit`
- `availableTotal`, `availablePages`
- `availableLoading`, `availableError`

#### Luồng dữ liệu
1. Mở modal → load trang 1 danh sách học sinh khả dụng.
2. Tab **Search**:
   - Người dùng nhập từ khóa → gọi API với `search`.
   - Hiển thị kết quả dạng list + checkbox.
   - Người dùng tick chọn.
3. Tab **Select from list**:
   - Hiển thị danh sách có phân trang.
   - Người dùng tick chọn nhiều.
4. Submit:
   - Gọi `addExistingStudents(classId, selectedIds)`
   - Nếu thành công → `fetchClassById(id)` → đóng modal → toast success
   - Nếu lỗi → hiển thị `actionError`

### 3.2 `client/web/src/presentation/store/classStore.ts`

#### Thay đổi chính
Thêm 2 methods mới:

```ts
fetchAvailableStudents: (classId: string, query?: { search?: string; page?: number; limit?: number }) => Promise<{
  results: Array<{ _id: string; name: string; email: string; studentCode?: string; avatarUrl?: string; isActive?: boolean }>;
  page: number;
  limit: number;
  total: number;
  pages: number;
}>;

addExistingStudents: (classId: string, studentIds: string[]) => Promise<any>;
```

#### Chi tiết implementation
- `fetchAvailableStudents` gọi:
  - `GET /classes/${classId}/available-students`
  - Truyền `params` theo query search/page/limit
- `addExistingStudents` gọi:
  - `POST /classes/${classId}/students`
  - Body: `{ studentIds }`

### 3.3 `client/web/src/pages/ClassDetailPage.module.css`

#### Thay đổi chính
Thêm styles cho:
- Modal overlay + container
- Tab switcher
- Search input trong modal
- Available student list item + checkbox
- Pagination mini trong modal
- Empty state + loading state

---

## 4. API Contracts

### 4.1 `GET /classes/:id/available-students`

**Request:**
```
GET /api/v1/classes/:id/available-students?search=...&page=1&limit=20
Authorization: Bearer <jwt>
```

**Query params:**
- `search`: string, tìm theo `name`, `studentCode`, `email`
- `page`: integer ≥ 1, default 1
- `limit`: integer 1-100, default 20

**Response 200:**
```json
{
  "results": [
    {
      "_id": "65f0a1b2c3d4e5f6a7b8c9d0",
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

### 4.2 `POST /classes/:id/students`

**Request:**
```
POST /api/v1/classes/:id/students
Authorization: Bearer <jwt>
Body: { "studentIds": ["id1", "id2"] }
```

**Response 200:**
Trả về class detail sau khi cập nhật `studentIds`.

---

## 5. Error handling & Edge cases

| Tình huống | Hành vi frontend |
|---|---|
| Không có học sinh khả dụng | Hiện empty state với gợi ý dùng **Add Student** hoặc **Import from Excel** |
| Search không ra kết quả | Hiện "No students found" + gợi ý tạo mới |
| Thêm trùng học sinh đã có trong lớp | Backend đã chặn trùng, nhưng frontend ưu tiên ẩn những người đã có trong lớp hiện tại |
| API lỗi 403/404 | Hiện `actionError` rõ ràng |
| Pagination cuối trang | Disable nút Next |
| Chưa chọn học sinh nào | Disable nút submit |

---

## 6. Testing strategy

### 6.1 Web tests
- Unit test cho `classStore.fetchAvailableStudents`
- Unit test cho `classStore.addExistingStudents`
- Component test / behavior test cho modal chức năng mới

### 6.2 Test commands
```bash
# Web
cd client/web && npm test
```

---

## 7. Verification steps

1. `cd client/web && npm test` — test pass
2. Manual E2E:
   - Đăng nhập admin/teacher
   - Vào chi tiết lớp → click **Add Existing Student**
   - Tab Search: tìm kiếm học sinh → chọn → thêm thành công
   - Tab Select from list: phân trang + chọn nhiều → thêm thành công
   - Verify danh sách học sinh trong lớp được refresh
3. Negative:
   - Teacher không có quyền → không mở được chức năng
   - Thêm học sinh không hợp lệ → hiển thị lỗi rõ ràng

---

## 8. Out of scope

- Không tạo endpoint mới ở backend.
- Không thay đổi chức năng **Add Student** hiện tại.
- Không thay đổi chức năng **Import from Excel**.
- Không xử lý bulk remove hoặc bulk edit trong đợt này.
