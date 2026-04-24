# QLDL — Cụm 3: Mô hình dữ liệu (DB schema + mapping API ↔ DB)

> File này gộp các tài liệu trước đây tách riêng:
> - `QLDL_DB_SCHEMA.md`
> - `QLDL_API_DB_MAPPING.md`

---

## Phần A — Database schema (Postgres-first)

## QLDL — Database schema (Postgres-first)

Tài liệu này mô tả **bảng core theo `QLDL_CauTruc_Database_v1.0`** và các **bảng đề xuất** để đáp ứng đầy đủ API/nghiệp vụ (auth refresh/otp, import job, history ô, RBAC nhiều nhóm, prefs thông báo, catalog chỉ tiêu).

**Bổ sung triển khai backend (repo):** bảng **`field_categories`** (danh mục lĩnh vực nghiệp vụ) + cột **`forms.field_category_id`** (FK). Cột **`forms.field_category`** (chuỗi denormalized) **đã loại bỏ**; mã lĩnh vực chỉ còn trên `field_categories.code`, có thể join khi đọc API. Kiểu khóa chính/FK trong code migration dùng **UUID**; tài liệu bên dưới đã được cập nhật theo migration TypeORM trong repo.


**Triển khai repo (ngoài đếm 21 bảng gốc):** `field_categories` — danh mục lĩnh vực cho biểu mẫu; liên kết `forms.field_category_id` → `field_categories.id`.

Vai trò của từng nhóm bảng
Tổ chức & phân quyền

organizations: cây đơn vị hành chính, gán user/assignment theo đơn vị
users: tài khoản + trạng thái + khoá + 2FA metadata + FK tới org
(RBAC): dùng mô hình Nest RBAC (`roles`, `permissions`, `user_roles`, `role_permissions`) thay cho `role_groups` JSONB
Thiết kế biểu mẫu

forms: định nghĩa biểu mẫu (template), có thể phân cấp cha–con; tham chiếu lĩnh vực qua `field_category_id` → `field_categories`
field_categories (triển khai repo): danh mục lĩnh vực nghiệp vụ (`code`, `name`, …)
form_attributes: thuộc tính/metadata các cột/field
form_indicators: chỉ tiêu cần nhập/tính (có thể có công thức)
indicator_catalog (đề xuất): “từ điển chỉ tiêu” dùng chung để tái sử dụng giữa nhiều form
Kỳ báo cáo & giao việc

report_periods: kỳ tuần/tháng/quý/năm
form_assignments: giao form cho org theo kỳ + deadline + ai giao
Nhập liệu, nộp, duyệt

report_submissions: 1 lần nộp của assignment (draft/pending/approved/…)
report_data: dữ liệu chi tiết theo “ô” (submission + indicator + attribute)
report_data_history (đề xuất): lịch sử thay đổi từng ô (audit mức cell)
Tổng hợp & theo dõi

report_summaries: bảng tổng hợp/denormalized phục vụ dashboard, tiến độ, phê duyệt…
Thông báo & nhật ký

notifications: hộp thư thông báo + trạng thái gửi
user_notification_prefs (đề xuất): cấu hình nhận thông báo theo loại/kênh
audit_logs: nhật ký hành động (ai làm gì, trên bảng nào, khi nào)
Auth nâng cao

auth_refresh_tokens (đề xuất): refresh token rotation/revoke
auth_otp_challenges (đề xuất): challenge OTP/2FA
auth_password_resets (đề xuất): quên mật khẩu theo token hash + expiry
Import/ETL

import_jobs (đề xuất): theo dõi job import (status/summary)

#### `organizations` *(migration thực tế: UUID PK/FK + ON DELETE SET NULL)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `code VARCHAR(50) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `parent_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL`
- `head_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `level INT NOT NULL DEFAULT 1`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `description TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`

#### RBAC (Nest RBAC — nguồn quyết định cuối)

RBAC sử dụng mô hình chuẩn hoá:

- `roles` (vai trò)
- `permissions` (mã quyền)
- `user_roles` (N–N users ↔ roles)
- `role_permissions` (N–N roles ↔ permissions)

#### `users` *(bảng sẵn có; migration 0000 chỉ ALTER để thêm cột/FK UUID)*

- `id UUID PK` *(theo codebase hiện tại; không tạo mới trong migration này)*
- `code VARCHAR(20) NULL` *(unique khi khác NULL — partial unique index)*
- `username VARCHAR(100) NOT NULL UNIQUE`
- `email VARCHAR(255) NOT NULL UNIQUE`
- `password_hash VARCHAR(255) NOT NULL`
- `full_name VARCHAR(255) NULL`
- `phone VARCHAR(20) NULL`
- `avatar_url TEXT NULL`
- `org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `last_login_at TIMESTAMPTZ NULL`
- `failed_login_attempts INT NOT NULL DEFAULT 0`
- `locked_until TIMESTAMPTZ NULL`
- `totp_secret VARCHAR(100) NULL`
- `totp_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `notify_channel VARCHAR(20) NOT NULL DEFAULT 'both'`
- `language VARCHAR(10) NOT NULL DEFAULT 'vi'`
- `timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh'`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`

#### `report_periods` *(migration thực tế: UUID PK/FK + ON DELETE SET NULL cho created_by)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `code VARCHAR(30) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `period_type VARCHAR(10) NOT NULL` — `TUAN|THANG|QUY|NAM`
- `date_from DATE NOT NULL`
- `date_to DATE NOT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `field_categories` *(migration 0004: UUID PK + seed mặc định)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `code VARCHAR(50) NOT NULL UNIQUE` — mã ổn định (`kt_xh`, `yte`, …)
- `name VARCHAR(255) NOT NULL`
- `description TEXT NULL`
- `sort_order INT NOT NULL DEFAULT 0`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`

#### `forms` *(migration thực tế: UUID PK; đã drop `field_category` và `period_type`)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `code VARCHAR(20) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `field_category_id UUID NULL REFERENCES field_categories(id) ON DELETE SET NULL`
- `description TEXT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `template_file VARCHAR(500) NULL`
- `parent_form_id UUID NULL REFERENCES forms(id) ON DELETE SET NULL`
- `created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`
  - *(đã loại bỏ)* `field_category VARCHAR(...)` *(migration 0005)*
  - *(đã loại bỏ)* `period_type VARCHAR(10)` *(migration 0006)*

#### `indicator_catalog` *(migration thực tế: đã tạo và dùng được ngay)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `code VARCHAR(50) NOT NULL UNIQUE`
- `name VARCHAR(500) NOT NULL`
- `unit VARCHAR(100) NULL`
- `data_type VARCHAR(20) NOT NULL`
- `created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `form_indicators` *(migration thực tế: UUID PK/FK + thêm catalog_indicator_id)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE`
- `code VARCHAR(50) NOT NULL`
- `name VARCHAR(500) NOT NULL`
- `unit VARCHAR(100) NULL`
- `data_type VARCHAR(20) NOT NULL`
- `is_required BOOLEAN NOT NULL DEFAULT TRUE`
- `is_calculated BOOLEAN NOT NULL DEFAULT FALSE`
- `formula TEXT NULL`
- `group_name VARCHAR(255) NULL`
- `sort_order INT NOT NULL DEFAULT 0`
- `min_value NUMERIC NULL`
- `max_value NUMERIC NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `catalog_indicator_id UUID NULL REFERENCES indicator_catalog(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(form_id, code)`

#### `form_attributes` *(migration thực tế: UUID PK/FK)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE`
- `name VARCHAR(255) NOT NULL`
- `data_type VARCHAR(20) NULL`
- `is_required BOOLEAN NOT NULL DEFAULT FALSE`
- `is_visible BOOLEAN NOT NULL DEFAULT TRUE`
- `is_system BOOLEAN NOT NULL DEFAULT FALSE`
- `sort_order INT NOT NULL DEFAULT 0`
- `options JSONB NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `form_assignments` *(migration thực tế: UUID PK/FK; ON DELETE RESTRICT)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT`
- `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT`
- `period_id UUID NOT NULL REFERENCES report_periods(id) ON DELETE RESTRICT`
- `deadline_from DATE NOT NULL`
- `deadline_to DATE NOT NULL`
- `is_cancelled BOOLEAN NOT NULL DEFAULT FALSE`
- `cancel_reason TEXT NULL`
- `auto_assign BOOLEAN NOT NULL DEFAULT FALSE`
- `assigned_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(form_id, org_id, period_id)`

#### `report_submissions` *(migration thực tế: UUID PK/FK; assignment_id RESTRICT)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `code VARCHAR(25) NOT NULL UNIQUE`
- `assignment_id UUID NOT NULL REFERENCES form_assignments(id) ON DELETE RESTRICT`
- `status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'` — `DRAFT|PENDING|APPROVED|REJECTED|OVERDUE`
- `version INT NOT NULL DEFAULT 1`
- `note TEXT NULL`
- `reject_reason TEXT NULL`
- `completion_pct NUMERIC(5,2) NULL`
- `submitted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `submitted_at TIMESTAMPTZ NULL`
- `approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `approved_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`

#### `report_data` *(migration thực tế: UUID PK/FK; indicator/attribute RESTRICT)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `submission_id UUID NOT NULL REFERENCES report_submissions(id) ON DELETE CASCADE`
- `indicator_id UUID NOT NULL REFERENCES form_indicators(id) ON DELETE RESTRICT`
- `attribute_id UUID NOT NULL REFERENCES form_attributes(id) ON DELETE RESTRICT`
- `value TEXT NULL`
- `value_numeric NUMERIC NULL`
- `updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(submission_id, indicator_id, attribute_id)`

#### `report_summaries` *(migration thực tế: UUID PK/FK; FK RESTRICT)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT`
- `period_id UUID NOT NULL REFERENCES report_periods(id) ON DELETE RESTRICT`
- `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT`
- `status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'`
- `total_units INT NULL`
- `submitted_units INT NULL`
- `approved_units INT NULL`
- `summary_data JSONB NULL`
- `summarized_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `summarized_at TIMESTAMPTZ NULL`
- `approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `approved_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(form_id, period_id, org_id)`

#### `notifications` *(migration thực tế: UUID PK; user_id CASCADE)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `type VARCHAR(50) NOT NULL`
- `title VARCHAR(500) NULL`
- `body TEXT NULL`
- `channel VARCHAR(20) NOT NULL`
- `is_read BOOLEAN NOT NULL DEFAULT FALSE`
- `ref_table VARCHAR(100) NULL`
- `ref_id BIGINT NULL`
- `status VARCHAR(20) NOT NULL DEFAULT 'PENDING'`
- `retry_count INT NOT NULL DEFAULT 0`
- `sent_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `audit_logs` *(migration thực tế: UUID PK/FK; record_id vẫn BIGINT như doc)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `action VARCHAR(20) NOT NULL`
- `table_name VARCHAR(100) NOT NULL`
- `record_id BIGINT NULL`
- `old_value JSONB NULL`
- `new_value JSONB NULL`
- `ip_address VARCHAR(45) NULL`
- `user_agent TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

---

### Proposed additional tables (khuyến nghị)

*(đã loại bỏ)* `user_role_groups` — thay bằng `user_roles` (N–N users ↔ roles) trong Nest RBAC.

#### `auth_refresh_tokens` *(migration thực tế: UUID PK/FK)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `token_hash VARCHAR(128) NOT NULL UNIQUE`
- `expires_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `ip_address VARCHAR(45) NULL`
- `user_agent TEXT NULL`

#### `auth_otp_challenges` (OTP email / challengeId) *(migration thực tế: user_id UUID)*

- `id VARCHAR(64) PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `channel VARCHAR(20) NOT NULL`
- `otp_hash VARCHAR(128) NOT NULL`
- `expires_at TIMESTAMPTZ NOT NULL`
- `consumed_at TIMESTAMPTZ NULL`
- `retry_count INT NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `auth_password_resets` *(migration thực tế: UUID PK/FK)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `token_hash VARCHAR(128) NOT NULL UNIQUE`
- `expires_at TIMESTAMPTZ NOT NULL`
- `used_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `import_jobs` *(migration thực tế: UUID PK; created_by ON DELETE SET NULL)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `type VARCHAR(30) NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `finished_at TIMESTAMPTZ NULL`
- `summary JSONB NULL`

#### `report_data_history` (history theo ô) *(migration thực tế: UUID PK/FK; indicator/attribute RESTRICT)*

- `id UUID PK DEFAULT gen_random_uuid()`
- `submission_id UUID NOT NULL REFERENCES report_submissions(id) ON DELETE CASCADE`
- `indicator_id UUID NOT NULL REFERENCES form_indicators(id) ON DELETE RESTRICT`
- `attribute_id UUID NOT NULL REFERENCES form_attributes(id) ON DELETE RESTRICT`
- `old_value TEXT NULL`
- `new_value TEXT NULL`
- `changed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
- `changed_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `user_notification_prefs` *(migration thực tế: UUID FK)*

- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `type VARCHAR(50) NOT NULL`
- `in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `email_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **PK**: `(user_id, type)`

*(đã triển khai)* `indicator_catalog` — xem ở phần Core tables phía trên (migration 0000).

> Đã triển khai: `form_indicators.catalog_indicator_id UUID NULL REFERENCES indicator_catalog(id) ON DELETE SET NULL`.

---

### Quan hệ tóm tắt (FK graph)

- `organizations.parent_id` → `organizations.id` *(ON DELETE SET NULL)*
- `organizations.head_user_id` → `users.id` *(ON DELETE SET NULL)*
- `users.org_id` → `organizations.id` *(ON DELETE SET NULL)*
- (RBAC) `user_roles.user_id` → `users.id` *(ON DELETE CASCADE)*
- (RBAC) `user_roles.role_id` → `roles.id` *(ON DELETE CASCADE)*
- (RBAC) `role_permissions.role_id` → `roles.id` *(ON DELETE CASCADE)*
- (RBAC) `role_permissions.permission_id` → `permissions.id` *(ON DELETE CASCADE)*
- `report_periods.created_by` → `users.id` *(ON DELETE SET NULL)*
- `forms.parent_form_id` → `forms.id` *(ON DELETE SET NULL)*
- `forms.created_by` → `users.id` *(ON DELETE SET NULL)*
- `forms.field_category_id` → `field_categories.id` *(ON DELETE SET NULL)*
- `indicator_catalog.created_by` → `users.id` *(ON DELETE SET NULL)*
- `form_indicators.form_id` → `forms.id` *(ON DELETE CASCADE)*
- `form_indicators.catalog_indicator_id` → `indicator_catalog.id` *(ON DELETE SET NULL)*
- `form_attributes.form_id` → `forms.id` *(ON DELETE CASCADE)*
- `form_assignments.form_id` → `forms.id` *(ON DELETE RESTRICT)*
- `form_assignments.org_id` → `organizations.id` *(ON DELETE RESTRICT)*
- `form_assignments.period_id` → `report_periods.id` *(ON DELETE RESTRICT)*
- `form_assignments.assigned_by` → `users.id` *(ON DELETE SET NULL)*
- `report_submissions.assignment_id` → `form_assignments.id` *(ON DELETE RESTRICT)*
- `report_submissions.submitted_by/approved_by` → `users.id` *(ON DELETE SET NULL)*
- `report_data.submission_id` → `report_submissions.id` *(ON DELETE CASCADE)*
- `report_data.indicator_id` → `form_indicators.id` *(ON DELETE RESTRICT)*
- `report_data.attribute_id` → `form_attributes.id` *(ON DELETE RESTRICT)*
- `report_data.updated_by` → `users.id` *(ON DELETE SET NULL)*
- `report_data_history.submission_id` → `report_submissions.id` *(ON DELETE CASCADE)*
- `report_data_history.indicator_id` → `form_indicators.id` *(ON DELETE RESTRICT)*
- `report_data_history.attribute_id` → `form_attributes.id` *(ON DELETE RESTRICT)*
- `report_data_history.changed_by` → `users.id` *(ON DELETE SET NULL)*
- `report_summaries.form_id/period_id/org_id` → `forms.id`/`report_periods.id`/`organizations.id` *(ON DELETE RESTRICT)*
- `report_summaries.summarized_by/approved_by` → `users.id` *(ON DELETE SET NULL)*
- `notifications.user_id` → `users.id` *(ON DELETE CASCADE)*
- `audit_logs.user_id` → `users.id` *(ON DELETE SET NULL, nullable)*

---

## Phần B — Mapping API → DB tables → CRUD

## QLDL — Mapping API → DB tables → CRUD

> Mục tiêu: dev implement service/repository biết đụng bảng nào, thao tác gì, side-effect gì (notify/audit).

### Legend

- **C/R/U/D**: Create/Read/Update/Delete
- **Soft delete**: `UPDATE ... SET deleted_at` (không hard delete)
- **Side effects**:
  - **AUDIT**: insert `audit_logs`
  - **NOTI**: insert `notifications` + enqueue email/SMS worker (ngoài DB)

---

### Auth

#### `POST /auth/login`

- **Tables**: `users` (**R/U** failed attempts/lock), `audit_logs` (**C**)
- **Optional**: `auth_otp_challenges` (**C**) nếu EMAIL OTP flow

#### `POST /auth/2fa/verify|resend`

- **Tables**: `auth_otp_challenges` (**R/U/C**), `users` (**R**), `audit_logs` (**C**)

#### `POST /auth/refresh|logout`

- **Tables**: `auth_refresh_tokens` (**R/U** revoke), `audit_logs` (**C** logout)

#### `POST /auth/password/forgot|reset|change`

- **Tables**: `auth_password_resets` (**C/U**), `users` (**R/U** password), `auth_refresh_tokens` (**U** revoke), `audit_logs` (**C**)

---

### Users / Me

#### `GET/POST/PATCH/DELETE /users*`

- **Tables**: `users` (**R/C/U** soft delete), `organizations` (**R** FK), `roles`/`permissions` (**R**), `user_roles`/`role_permissions` (**C/U/D** khi gán quyền), `audit_logs` (**C**)

#### `POST /users/import` + `GET /users/import/{jobId}`

- **Tables**: `import_jobs` (**C/U**), `users` (**C/U**), `user_roles` (**C/U**), `audit_logs` (**C**)

#### `GET/PATCH /me`

- **Tables**: `users` (**R/U**), `user_notification_prefs` (**R/U** nếu có), `audit_logs` (**C**)

---

### RBAC

#### `GET/POST/PATCH/DELETE /role-groups*`

- **(đã thay đổi)**: quản trị RBAC dùng `roles`/`permissions` (Nest RBAC).

#### `GET /permissions`

- **Tables**: none (static) **hoặc** `permission_defs` (nếu sau này tách bảng)

---

### Organizations

#### `GET/POST/PATCH/DELETE /orgs*`

- **Tables**: `organizations` (**R/C/U** soft delete), `users` (**R** head), `audit_logs` (**C**)

#### `POST /orgs/{id}/lock|unlock`

- **Tables**: `organizations` (**U** `is_active`), optional `users` (**U** deactivate), `audit_logs` (**C**)

---

### Report periods

#### `GET/POST/PATCH/DELETE /report-periods*`

- **Tables**: `report_periods` (**R/C/U/D**), `form_assignments` (**R** để chặn delete), `audit_logs` (**C**)

---

### Forms / attributes / indicators

#### `GET/POST/PATCH /field-categories*`

- **Tables**: `field_categories` (**R/C/U**), `audit_logs` (**C** tuỳ policy)

#### `GET/POST/PATCH/DELETE /forms*`

- **Tables**: `forms` (**R/C/U** soft delete), `field_categories` (**R** khi validate/set `field_category_id`), `audit_logs` (**C**)

#### `POST /forms/{id}/copy`

- **Tables**: `forms` (**C**), `form_attributes` (**C**), `form_indicators` (**C**), `field_categories` (**R** nếu đổi `field_category_id`), `audit_logs` (**C**)

#### `POST /forms/{id}/template`

- **Tables**: `forms` (**U** `template_file`) + object storage file

#### `/forms/{id}/attributes*`

- **Tables**: `form_attributes` (**R/C/U/D**), `audit_logs` (**C**)

#### `/forms/{id}/indicators*`

- **Tables**: `form_indicators` (**R/C/U/D**), `report_data` (**R** chặn delete nếu đã có data), `audit_logs` (**C**)

#### import attributes/indicators

- **Tables**: `import_jobs` + target tables (**C/U**)

#### `POST /indicator-catalog` (optional)

- **Tables**: `indicator_catalog` (**C/U**), optional update `form_indicators.catalog_indicator_id`

---

### Assignments

#### `GET /assignments`

- **Tables**: `form_assignments` (**R** + joins), aggregates từ `report_submissions`

#### `POST /assignments`

- **Tables**: `form_assignments` (**C** bulk), `notifications` (**C**), `audit_logs` (**C**)

#### `POST /assignments/{id}/cancel`

- **Tables**: `form_assignments` (**U** cancel flags), `report_submissions` (**R** check), `notifications` (**C**), `audit_logs` (**C**)

#### `POST /assignments/next-period`

- **Tables**: `form_assignments` (**R** old + **C** new), `notifications` (**C**), `audit_logs` (**C**)

---

### My assignments / submissions

#### `GET /my/assignments`

- **Tables**: `users` (**R** org), `form_assignments` (**R**), `report_submissions` (**R** optional)

#### `POST /submissions`

- **Tables**: `report_submissions` (**C**), `audit_logs` (**C**)

#### `GET /submissions/{id}`

- **Tables**: `report_submissions` (**R**), `report_data` (**R**), `form_indicators/attributes` (**R**)

#### `PATCH /submissions/{id}/cells` (+ autosave)

- **Tables**: `report_data` (**C/U** upsert), `report_submissions` (**U** version/completion), `report_data_history` (**C** nếu có), `notifications` (**C** optional alert), `audit_logs` (**C** optional)

#### import/copy/submit/export

- **import**: `import_jobs` + `report_data` + `report_submissions`
- **copy-previous**: read old `report_data` (**R**) + write new (**C/U**)
- **submit**: `report_submissions` (**U**), `notifications` (**C**), `audit_logs` (**C**)
- **export**: read tables (**R**) + `audit_logs` (**C** EXPORT)

---

### Approvals

#### `GET /approvals/pending`

- **Tables**: `report_submissions` (**R**), joins assignment/org/form/period

#### approve/reject/patch reject note

- **Tables**: `report_submissions` (**U**), `notifications` (**C**), `audit_logs` (**C**)
- **Optional downstream**: update parent form sync fields trong `report_data`/`report_summaries` theo rule cha–con

---

### Summaries

#### `GET/POST/GET /summaries*`, `POST /summaries/{id}/recompute`

- **Tables**: `report_summaries` (**R/C/U**), reads `report_submissions/report_data/form_assignments` (**R**), `audit_logs` (**C**)

---

### Monitoring / reminders

#### `GET /monitoring/reports`

- **Tables**: `form_assignments`, `report_submissions`, joins

#### `POST /monitoring/reminders`

- **Tables**: `notifications` (**C** bulk), `audit_logs` (**C**)

---

### Query / Tra cứu (QRY-01)

#### `GET /query/reports`

- **Tables**: `report_submissions` (**R**), `form_assignments` (**R**), joins `forms`, `report_periods`, `organizations`

#### `GET /query/reports/{submissionId}`

- **Tables**: như trên (**R**)

#### `GET /query/reports/{submissionId}/export`

- **Tables**: reads như export submission
- **Side effects**: `audit_logs` (**C** EXPORT)

---

### Notifications inbox / logs

#### `GET /notifications`, `POST /notifications/{id}/read`, `GET /notifications/logs`

- **Tables**: `notifications` (**R/U**)

---

### Analytics / export

#### `GET /analytics/*`, `POST /analytics/pivot`, `GET /analytics/export`

- **Tables**: read-only joins trên `form_assignments`, `report_submissions`, `report_data`, `report_summaries`, `organizations`, `report_periods`, `forms`
- **export**: `audit_logs` (**C** EXPORT)
