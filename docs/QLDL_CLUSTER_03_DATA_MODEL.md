# QLDL — Cụm 3: Mô hình dữ liệu (DB schema + mapping API ↔ DB)

> File này gộp các tài liệu trước đây tách riêng:
> - `QLDL_DB_SCHEMA.md`
> - `QLDL_API_DB_MAPPING.md`

---

## Phần A — Database schema (Postgres-first)

## QLDL — Database schema (Postgres-first)

Tài liệu này mô tả **bảng core theo `QLDL_CauTruc_Database_v1.0`** và các **bảng đề xuất** để đáp ứng đầy đủ API/nghiệp vụ (auth refresh/otp, import job, history ô, RBAC nhiều nhóm, prefs thông báo, catalog chỉ tiêu).

### Core tables (v1.0)
13 bảng core (v1.0):

1) organizations
2) role_groups
3) users
4) report_periods
5) forms
6) form_indicators
7) form_attributes
8) form_assignments
9) report_submissions
10) report_data
11) report_summaries
12) notifications
13) audit_logs

8 bảng đề xuất (khuyến nghị): 14) user_role_groups
15) auth_refresh_tokens
16) auth_otp_challenges
17) auth_password_resets
18) import_jobs
19) report_data_history
20) user_notification_prefs
21) indicator_catalog

→ Tổng cộng: 21 bảng (13 core + 8 đề xuất).

Vai trò của từng nhóm bảng
Tổ chức & phân quyền

organizations: cây đơn vị hành chính, gán user/assignment theo đơn vị
role_groups: “nhóm quyền” dạng JSONB (RBAC cấp nghiệp vụ QLDL)
users: tài khoản + trạng thái + khoá + 2FA metadata + FK tới org/role_group
user_role_groups (đề xuất): N–N user ↔ role_groups (khi 1 user có nhiều nhóm)
Thiết kế biểu mẫu

forms: định nghĩa biểu mẫu (template), có thể phân cấp cha–con
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

#### `organizations`

- `id BIGSERIAL PK`
- `code VARCHAR(50) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `parent_id BIGINT NULL REFERENCES organizations(id)`
- `head_user_id BIGINT NULL REFERENCES users(id)`
- `level INT NOT NULL DEFAULT 1`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `description TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`

#### `role_groups`

- `id BIGSERIAL PK`
- `name VARCHAR(100) NOT NULL UNIQUE`
- `description TEXT NULL`
- `permissions JSONB NULL`
- `is_system BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`

#### `users`

- `id BIGSERIAL PK`
- `code VARCHAR(20) NOT NULL UNIQUE`
- `username VARCHAR(100) NOT NULL UNIQUE`
- `email VARCHAR(255) NOT NULL UNIQUE`
- `password_hash VARCHAR(255) NOT NULL`
- `full_name VARCHAR(255) NULL`
- `phone VARCHAR(20) NULL`
- `avatar_url TEXT NULL`
- `org_id BIGINT NULL REFERENCES organizations(id)`
- `role_group_id BIGINT NULL REFERENCES role_groups(id)` *(default/primary group nếu dùng multi-group)*
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

#### `report_periods`

- `id BIGSERIAL PK`
- `code VARCHAR(30) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `period_type VARCHAR(10) NOT NULL` — `TUAN|THANG|QUY|NAM`
- `date_from DATE NOT NULL`
- `date_to DATE NOT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_by BIGINT NULL REFERENCES users(id)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `forms`

- `id BIGSERIAL PK`
- `code VARCHAR(20) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `field_category VARCHAR(100) NULL`
- `period_type VARCHAR(10) NULL`
- `description TEXT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `template_file VARCHAR(500) NULL`
- `parent_form_id BIGINT NULL REFERENCES forms(id)`
- `created_by BIGINT NULL REFERENCES users(id)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`

#### `form_indicators`

- `id BIGSERIAL PK`
- `form_id BIGINT NOT NULL REFERENCES forms(id) ON DELETE CASCADE`
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
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(form_id, code)`

#### `form_attributes`

- `id BIGSERIAL PK`
- `form_id BIGINT NOT NULL REFERENCES forms(id) ON DELETE CASCADE`
- `name VARCHAR(255) NOT NULL`
- `data_type VARCHAR(20) NULL`
- `is_required BOOLEAN NOT NULL DEFAULT FALSE`
- `is_visible BOOLEAN NOT NULL DEFAULT TRUE`
- `is_system BOOLEAN NOT NULL DEFAULT FALSE`
- `sort_order INT NOT NULL DEFAULT 0`
- `options JSONB NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `form_assignments`

- `id BIGSERIAL PK`
- `form_id BIGINT NOT NULL REFERENCES forms(id)`
- `org_id BIGINT NOT NULL REFERENCES organizations(id)`
- `period_id BIGINT NOT NULL REFERENCES report_periods(id)`
- `deadline_from DATE NOT NULL`
- `deadline_to DATE NOT NULL`
- `is_cancelled BOOLEAN NOT NULL DEFAULT FALSE`
- `cancel_reason TEXT NULL`
- `auto_assign BOOLEAN NOT NULL DEFAULT FALSE`
- `assigned_by BIGINT NULL REFERENCES users(id)`
- `assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(form_id, org_id, period_id)`

#### `report_submissions`

- `id BIGSERIAL PK`
- `code VARCHAR(25) NOT NULL UNIQUE`
- `assignment_id BIGINT NOT NULL REFERENCES form_assignments(id)`
- `status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'` — `DRAFT|PENDING|APPROVED|REJECTED|OVERDUE`
- `version INT NOT NULL DEFAULT 1`
- `note TEXT NULL`
- `reject_reason TEXT NULL`
- `completion_pct NUMERIC(5,2) NULL`
- `submitted_by BIGINT NULL REFERENCES users(id)`
- `submitted_at TIMESTAMPTZ NULL`
- `approved_by BIGINT NULL REFERENCES users(id)`
- `approved_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NULL`

#### `report_data`

- `id BIGSERIAL PK`
- `submission_id BIGINT NOT NULL REFERENCES report_submissions(id) ON DELETE CASCADE`
- `indicator_id BIGINT NOT NULL REFERENCES form_indicators(id)`
- `attribute_id BIGINT NOT NULL REFERENCES form_attributes(id)`
- `value TEXT NULL`
- `value_numeric NUMERIC NULL`
- `updated_by BIGINT NULL REFERENCES users(id)`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(submission_id, indicator_id, attribute_id)`

#### `report_summaries`

- `id BIGSERIAL PK`
- `form_id BIGINT NOT NULL REFERENCES forms(id)`
- `period_id BIGINT NOT NULL REFERENCES report_periods(id)`
- `org_id BIGINT NOT NULL REFERENCES organizations(id)`
- `status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'`
- `total_units INT NULL`
- `submitted_units INT NULL`
- `approved_units INT NULL`
- `summary_data JSONB NULL`
- `summarized_by BIGINT NULL REFERENCES users(id)`
- `summarized_at TIMESTAMPTZ NULL`
- `approved_by BIGINT NULL REFERENCES users(id)`
- `approved_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Unique**: `UNIQUE(form_id, period_id, org_id)`

#### `notifications`

- `id BIGSERIAL PK`
- `user_id BIGINT NOT NULL REFERENCES users(id)`
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

#### `audit_logs`

- `id BIGSERIAL PK`
- `user_id BIGINT NULL REFERENCES users(id)`
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

#### `user_role_groups` (N–N user ↔ role_groups)

- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `role_group_id BIGINT NOT NULL REFERENCES role_groups(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **PK**: `(user_id, role_group_id)`

#### `auth_refresh_tokens`

- `id BIGSERIAL PK`
- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `token_hash VARCHAR(128) NOT NULL UNIQUE`
- `expires_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `ip_address VARCHAR(45) NULL`
- `user_agent TEXT NULL`

#### `auth_otp_challenges` (OTP email / challengeId)

- `id VARCHAR(64) PRIMARY KEY`
- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `channel VARCHAR(20) NOT NULL`
- `otp_hash VARCHAR(128) NOT NULL`
- `expires_at TIMESTAMPTZ NOT NULL`
- `consumed_at TIMESTAMPTZ NULL`
- `retry_count INT NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `auth_password_resets`

- `id BIGSERIAL PK`
- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `token_hash VARCHAR(128) NOT NULL UNIQUE`
- `expires_at TIMESTAMPTZ NOT NULL`
- `used_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `import_jobs`

- `id BIGSERIAL PK`
- `type VARCHAR(30) NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `created_by BIGINT NULL REFERENCES users(id)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `finished_at TIMESTAMPTZ NULL`
- `summary JSONB NULL`

#### `report_data_history` (history theo ô)

- `id BIGSERIAL PK`
- `submission_id BIGINT NOT NULL REFERENCES report_submissions(id) ON DELETE CASCADE`
- `indicator_id BIGINT NOT NULL REFERENCES form_indicators(id)`
- `attribute_id BIGINT NOT NULL REFERENCES form_attributes(id)`
- `old_value TEXT NULL`
- `new_value TEXT NULL`
- `changed_by BIGINT NULL REFERENCES users(id)`
- `changed_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `user_notification_prefs`

- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `type VARCHAR(50) NOT NULL`
- `in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `email_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **PK**: `(user_id, type)`

#### `indicator_catalog`

- `id BIGSERIAL PK`
- `code VARCHAR(50) NOT NULL UNIQUE`
- `name VARCHAR(500) NOT NULL`
- `unit VARCHAR(100) NULL`
- `data_type VARCHAR(20) NOT NULL`
- `created_by BIGINT NULL REFERENCES users(id)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

> Optional: thêm `catalog_indicator_id BIGINT NULL REFERENCES indicator_catalog(id)` vào `form_indicators`.

---

### Quan hệ tóm tắt (FK graph)

- `organizations` self `parent_id`
- `users.org_id` → `organizations`
- `users.role_group_id` → `role_groups` (+ `user_role_groups` nếu bổ sung)
- `forms` self `parent_form_id`
- `form_indicators/form_attributes.form_id` → `forms`
- `form_assignments(form_id, org_id, period_id)` → `forms`, `organizations`, `report_periods`
- `report_submissions.assignment_id` → `form_assignments`
- `report_data(submission_id, indicator_id, attribute_id)` → `report_submissions`, `form_indicators`, `form_attributes`
- `report_summaries(form_id, period_id, org_id)` → `forms`, `report_periods`, `organizations`
- `notifications.user_id` → `users`
- `audit_logs.user_id` → `users` (nullable)

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

- **Tables**: `users` (**R/C/U** soft delete), `organizations` (**R** FK), `role_groups` (**R**), `user_role_groups` (**C/U/D** nếu có), `audit_logs` (**C**)

#### `POST /users/import` + `GET /users/import/{jobId}`

- **Tables**: `import_jobs` (**C/U**), `users` (**C/U**), `user_role_groups` (**C**), `audit_logs` (**C**)

#### `GET/PATCH /me`

- **Tables**: `users` (**R/U**), `user_notification_prefs` (**R/U** nếu có), `audit_logs` (**C**)

---

### RBAC

#### `GET/POST/PATCH/DELETE /role-groups*`

- **Tables**: `role_groups` (**R/C/U/D**), `users`/`user_role_groups` (**R** check references), `audit_logs` (**C**)

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

#### `GET/POST/PATCH/DELETE /forms*`

- **Tables**: `forms` (**R/C/U** soft delete), `audit_logs` (**C**)

#### `POST /forms/{id}/copy`

- **Tables**: `forms` (**C**), `form_attributes` (**C**), `form_indicators` (**C**), `audit_logs` (**C**)

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
