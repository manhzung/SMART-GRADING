# Design: Extend School Seed Data with Vietnamese Universities

**Date:** 2026-07-01
**Status:** Approved
**Owner:** Backend

## Goal

Mở rộng `server/src/seeds/school.seeds.js` — giữ nguyên 4 trường hiện có, bổ sung thêm **8 trường đại học** dùng thông tin thực tế tại Việt Nam, để phục vụ demo và test trên hệ thống.

## Scope

- **In scope:**
  - Thêm 8 trường đại học vào file `school.seeds.js`
  - Dùng thông tin thực tế (tên, địa chỉ, SĐT, email, hiệu trưởng)
  - Đảm bảo idempotent (chạy nhiều lần không lỗi duplicate key)
- **Out of scope:**
  - Trường phổ thông (THPT/THCS/Tiểu học)
  - Seed user/teacher gắn với các trường mới
  - Trường có `registrationStatus: 'pending'`
  - Thay đổi schema `school.model.js`

## Schools to Add

| # | code | name | city | principalName |
|---|------|------|------|---------------|
| 1 | HCMUT | Trường Đại học Bách Khoa — ĐHQG TP.HCM | TP.HCM | PGS.TS. Nguyễn Trung Kiên |
| 2 | VNUHCM | Trường Đại học Quốc gia TP.HCM | TP.HCM | PGS.TS. Nguyễn Xuân Hùng |
| 3 | HNUE | Trường Đại học Sư phạm Hà Nội | Hà Nội | GS.TS. Nguyễn Văn Minh |
| 4 | FTU | Trường Đại học Ngoại thương | Hà Nội | PGS.TS. Phạm Thu Hương |
| 5 | HCMUTE | Trường Đại học Sư phạm Kỹ thuật TP.HCM | TP.HCM | PGS.TS. Nguyễn Lan Hương |
| 6 | DND | Trường Đại học Đà Nẵng | Đà Nẵng | PGS.TS. Lê Quang Sơn |
| 7 | HUE | Trường Đại học Huế | Huế | PGS.TS. Đỗ Thị Xuân Dung |
| 8 | CTU | Trường Đại học Cần Thơ | Cần Thơ | GS.TS. Nguyễn Thanh Phương |

Tổng cộng file sẽ chứa **12 trường** (4 cũ + 8 mới).

## Schema per School (per `school.model.js`)

```js
{
  name, code, schoolType: 'university', gradeLevels: [],
  address: { street, ward, district, city },
  phone, email, website, principalName,
  settings: {
    maxScore: 10, passingScore: 5,
    gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 }
  },
  isActive: true, registrationStatus: 'approved',
}
```

## Implementation

- Append 8 objects mới vào mảng `seedSchools` trong `server/src/seeds/school.seeds.js`.
- Giữ nguyên function `seedSchoolsData()` — logic idempotent (`School.findOne({ code })`) đã đủ xử lý.
- Cập nhật header comment: "12 trường (3 ĐH HN, 5 ĐH TP.HCM, 1 THPT, 1 ĐH Đà Nẵng, 1 ĐH Huế, 1 ĐH Cần Thơ)".
- KHÔNG cần sửa `seeds/index.js` — file này tự chạy qua `runAllSeeds()`.

## Verification

```bash
cd server
node src/seeds/school.seeds.js   # hoặc node src/seeds/index.js
```

Acceptance:
- Lần đầu chạy: in "Created school" cho 8 trường mới + "already exists, skipping" cho 4 trường cũ.
- Lần chạy thứ 2: in "already exists, skipping" cho cả 12 trường, không lỗi.
- MongoDB `schools` collection có đủ 12 documents với các `code` đúng như bảng trên.

## Risks

- **Hiệu trưởng thay đổi theo thời gian thực tế** — chấp nhận được vì đây là seed demo. Có thể chỉnh sửa sau.
- **Địa chỉ/sđt/email có thể đã thay đổi** — dùng thông tin phổ biến, dễ nhận biết với người dùng Việt.

## Future

- Nếu cần seed THPT/THCS/Tiểu học, tạo file `school.k12.seeds.js` riêng để dễ bảo trì.