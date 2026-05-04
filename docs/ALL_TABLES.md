# Danh sách tất cả các bảng (tables)

Tài liệu này tổng hợp **tất cả các bảng** có thể xuất hiện sau khi bạn **drop database** và chạy lại migrations trong repo này.

> Nguồn tổng hợp:
> - `src/migrations/1745230799999-init-users-table.ts`
> - `src/migrations/1745230800000-qldd-schema-from-documentation.ts`
> - `src/migrations/1745230800001-seed-sample-admin-rbac-and-periods.ts`
> - `src/migrations/1745230800004-drop-report-periods.ts` *(drop `report_periods`)*
> - `src/migrations/1745230800004-field-categories-and-forms-fk.ts`
>
> Lưu ý: các file seed khác (`0002`, `0003`, `0005`, `0006`) chủ yếu **insert/alter/drop** nên không tạo thêm bảng mới (ngoại trừ các bảng đã liệt kê bên dưới).

---

## 1) System tables (TypeORM tự tạo)

Các bảng này **không thuộc nghiệp vụ**, nhưng sẽ xuất hiện trong DB khi chạy migrations bằng TypeORM.

- **`migrations`**: TypeORM dùng để lưu lịch sử migrations đã chạy (insert 1 row mỗi migration).
- **`typeorm_metadata`** *(có thể có/không tùy cấu hình & tính năng TypeORM)*: TypeORM dùng để lưu metadata một số đối tượng (view/generated columns/…).

---

## 2) Base / Starter tables

### `users`

- **Tạo bởi**: `1745230799999-init-users-table.ts`
- **Mục đích**: bảng user nền tảng; các migration QLDL/Nest RBAC tham chiếu `users(id)` qua FK.

---

## 3) Nest RBAC tables (nguồn phân quyền)

Các bảng này phục vụ “RBAC kiểu Nest” (roles/permissions) và là **nguồn phân quyền duy nhất** của hệ thống.

### `permissions`
- **Tạo bởi**: `1745230800001-seed-sample-admin-rbac-and-periods.ts`

### `roles`
- **Tạo bởi**: `1745230800001-seed-sample-admin-rbac-and-periods.ts`

### `role_permissions`
- **Tạo bởi**: `1745230800001-seed-sample-admin-rbac-and-periods.ts`
- **Ghi chú**: bảng N–N giữa `roles` và `permissions`.

### `user_roles`
- **Tạo bởi**: `1745230800001-seed-sample-admin-rbac-and-periods.ts`
- **Ghi chú**: bảng N–N giữa `users` và `roles`.

---

## 4) QLDL tables (nghiệp vụ báo cáo/biểu mẫu)

### Nhóm tổ chức (QLDL)

### `organizations`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### Nhóm kỳ báo cáo

Không còn bảng `report_periods`. Kỳ báo cáo được lưu snapshot trên `form_assignments`/`report_summaries`.

### Nhóm thiết kế biểu mẫu

### `forms`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `field_categories`
- **Tạo bởi**: `1745230800004-field-categories-and-forms-fk.ts`

### `indicator_catalog`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `form_attributes`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `form_indicators`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### Nhóm giao việc

### `form_assignments`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### Nhóm nộp báo cáo & dữ liệu nhập

### `report_submissions`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `report_data`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `report_data_history`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### Nhóm tổng hợp

### `report_summaries`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### Nhóm thông báo & audit

### `notifications`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `audit_logs`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

---

## 5) Auth nâng cao / Import (QLDL - hỗ trợ)

### `auth_refresh_tokens`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `auth_otp_challenges`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `auth_password_resets`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

### `import_jobs`
- **Tạo bởi**: `1745230800000-qldd-schema-from-documentation.ts`

---

## 6) Ghi chú quan trọng

- **Bạn sẽ luôn thấy** bảng `migrations` sau khi chạy migrations (TypeORM tracking).
- Ngoài “tables”, DB còn có thể có **extensions** và **enum types** (ví dụ `pgcrypto`, `uuid-ossp`, `users_status_enum`) nhưng chúng **không phải table**.
- Nếu bạn muốn danh sách “tất cả tables đang có trong DB thật” tại runtime (bao gồm mọi module khác ngoài QLDL nếu sau này thêm), cách chính xác nhất là query từ `information_schema.tables`.

