# QLDL — Cụm 1: Tổng quan + RBAC + Traceability

> File này gộp các tài liệu trước đây tách riêng:
> - `QLDL_SYSTEM_OVERVIEW.md`
> - `QLDL_RBAC_MATRIX.md`
> - `QLDL_TRACEABILITY_MATRIX.md`

---

## Phần A — Tổng quan hệ thống (chức năng / module / actor)

# QLDL — Tổng quan hệ thống (chức năng / module / actor)

## Danh sách chức năng (theo đặc tả v2.0)

### Nhóm I — Hệ thống chung

- Đăng nhập (kèm 2FA/OTP hoặc TOTP, khóa tạm sau N lần sai)
- Đăng xuất + session timeout
- Đổi mật khẩu / lấy lại mật khẩu

### Nhóm II — Quản trị hệ thống

- Quản lý đơn vị hành chính (CRUD, khóa/mở khóa, cấu trúc cây)
- Quản lý kỳ báo cáo
- Quản lý tài khoản người dùng (CRUD, import, reset password, trạng thái)
- Hồ sơ cá nhân (thông tin, prefs thông báo, locale/timezone)
- RBAC: nhóm quyền + quyền chi tiết (feature-level + data-scope)

### Nhóm III — Thiết kế báo cáo

- Thiết kế biểu mẫu (CRUD, copy, activate/deactivate, upload template)
- Thiết kế thuộc tính (CRUD, import Excel, sort, visible/required)
- Thiết kế chỉ tiêu (CRUD, import Excel, formula, sort/group, danh mục chỉ tiêu dùng chung)

### Nhóm IV — Nghiệp vụ gửi/nhận báo cáo

- Giao báo cáo (bulk theo đơn vị + kỳ + deadline, chống trùng, hủy giao, giao kỳ sau)
- Nhập liệu (grid, autosave, import excel, copy kỳ trước, history, export)
- Gửi báo cáo (submit DRAFT → PENDING)
- Duyệt báo cáo (approve/reject + export/read-only)
- Tổng hợp báo cáo (aggregate + recompute + rule cha–con/cộng dồn)
- Theo dõi trạng thái + reminder

### Nhóm V — Thông báo & phân tích

- Notifications đa kênh + prefs + retry log
- Dashboard KPI + charts + pivot + export

---

## Module backend đề xuất (để tổ chức code)

- `auth` / `iam`: login/2FA/refresh/logout/password
- `users`: quản lý user + profile
- `rbac`: role groups + permission catalog + gán nhóm
- `org`: organizations tree
- `report-periods`: kỳ báo cáo
- `form-designer`: forms + attributes + indicators (+ template file metadata)
- `assignments`: form_assignments
- `submissions`: report_submissions + report_data (+ history)
- `workflow`: submit transition + guards
- `approval`: approve/reject flows
- `consolidation`: report_summaries
- `monitoring`: tracking + reminders
- `notifications`: inbox + delivery status
- `analytics`: aggregates/pivot/export
- `audit` (cross-cutting): audit_logs

---

## Actor & quyền (RBAC — mức nghiệp vụ)

| Actor | Quyền chính (mức chức năng) |
| --- | --- |
| **System Admin** | Toàn bộ quản trị: org, period, user, RBAC; xem/giám sát toàn hệ thống |
| **Data Manager** | Thiết kế biểu mẫu; giao báo cáo; tổng hợp; theo dõi; dashboard/analytics (theo scope) |
| **Data Entry** | Nhập liệu/gửi báo cáo theo đơn vị; xem phản hồi; tra cứu phạm vi đơn vị |
| **Approver** | Duyệt/từ chối; xem chi tiết read-only; (tuỳ cấu hình) xem dashboard phạm vi |

> Chi tiết mapping role → API: xem **Phần B** trong cùng file này.

---

## Phần B — RBAC matrix (Role → API groups)

# QLDL — RBAC matrix (Role → API groups)

> Đây là ma trận **mặc định** theo đặc tả QLDL (Admin / Data Manager / Data Entry / Approver). Khi implement, nên map sang `role_groups.permissions` + data-scope (org-tree).

## Roles

- **System Admin**
- **Data Manager**
- **Data Entry**
- **Approver**
- **Public** (unauthenticated)

## Matrix

| Role | Được phép gọi (nhóm endpoint) | Ghi chú scope dữ liệu |
| --- | --- | --- |
| **Public** | `POST /auth/login`, `POST /auth/password/forgot`, `POST /auth/password/reset` | Không cần JWT |
| **System Admin** | Toàn bộ API quản trị + giám sát: `/users*`, `/role-groups*`, `/permissions`, `/orgs*`, `/report-periods*`, `/monitoring*`, `/query*`, `/notifications/logs`, đọc toàn bộ dữ liệu nghiệp vụ theo policy | Global |
| **Data Manager** | `/forms*`, `/assignments*`, `/summaries*`, `/monitoring*`, `/query*`, `/analytics*`, `/notifications`, `/me`, `/auth/*` | Theo scope (mặc định: toàn xã); có thể hạn chế org-tree nếu cấu hình |
| **Data Entry** | `/my/assignments`, `/submissions*`, `/query/reports*`, `/notifications`, `/me`, `/auth/*` | Chỉ đơn vị của user (org_id) |
| **Approver** | `/approvals*`, `/notifications`, `/me`, `/auth/*` + (tuỳ chọn) `GET` analytics read-only | Theo org được phê duyệt; có thể cho `GET /submissions/{id}` read-only khi `PENDING/APPROVED` |

## Gợi ý permission keys (để gán vào `role_groups.permissions`)

- `AUTH:*`
- `ADMIN_USERS:*`
- `ADMIN_ORGS:*`
- `ADMIN_PERIODS:*`
- `ADMIN_RBAC:*`
- `DESIGN_FORMS:*`
- `OPS_ASSIGNMENTS:*`
- `OPS_MONITORING:*`
- `QUERY_REPORTS:READ|EXPORT`
- `OPS_SUMMARIES:*`
- `ENTRY_SUBMISSIONS:*`
- `APPROVALS:*`
- `ANALYTICS:READ|EXPORT`
- `NOTIFICATIONS:READ`
- `AUDIT:READ` (chỉ admin)

> `*` có thể tách READ/WRITE/DELETE/EXPORT theo feature-level như đặc tả RBAC.

---

## Phần C — Traceability matrix (Use case / Mã chức năng → API → DB)

# QLDL — Traceability matrix (Use case / Mã chức năng → API → DB)

Mục tiêu: giúp BA/QA/Dev đối soát phạm vi triển khai và thiết kế test case theo “mã chức năng” trong tài liệu.

> Quy ước: API dưới đây là nhóm endpoint theo **Cụm 2** (`QLDL_CLUSTER_02_API_CONTRACTS.md`) (prefix `/api/v1`). DB là **core v1.0** + các bảng **đề xuất** trong **Cụm 3** (`QLDL_CLUSTER_03_DATA_MODEL.md`) (mục *Proposed additional tables*).

## Nhóm I — Hệ thống chung

| Mã | Tên | API chính | DB chính |
| --- | --- | --- | --- |
| SYS-01 | Đăng nhập (+2FA + forgot nếu có) | `POST /auth/login`, `POST /auth/2fa/verify`, `POST /auth/2fa/resend`, `POST /auth/password/forgot` | `users`, `audit_logs`, `auth_otp_challenges` (đề xuất) |
| SYS-02 | Đăng xuất / timeout | `POST /auth/logout`, `POST /auth/refresh` (rotate) | `auth_refresh_tokens` (đề xuất), `audit_logs` |
| SYS-03 | Đổi mật khẩu | `POST /auth/password/change` | `users`, `auth_refresh_tokens` (đề xuất revoke), `audit_logs` |

## Nhóm II — Quản trị

| Mã | Tên | API chính | DB chính |
| --- | --- | --- | --- |
| ORG-01 | Quản lý đơn vị | `GET/POST/PATCH/DELETE /orgs`, `POST /orgs/{id}/lock|unlock` | `organizations`, `users` (head), `audit_logs` |
| RPT-PRD-01 | Quản lý kỳ báo cáo | `GET/POST/PATCH/DELETE /report-periods` | `report_periods`, `form_assignments` (check ràng buộc), `audit_logs` |
| USR-01 | Quản lý user | `GET/POST/PATCH/DELETE /users`, `POST /users/{id}/reset-password`, `POST /users/import` | `users`, `role_groups`, `user_role_groups` (đề xuất), `import_jobs` (đề xuất), `audit_logs` |
| USR-02 | Hồ sơ cá nhân | `GET/PATCH /me` | `users`, `user_notification_prefs` (đề xuất), `audit_logs` |
| USR-03/04 | RBAC | `GET/POST/PATCH/DELETE /role-groups`, `GET /permissions` | `role_groups`, `users`, `user_role_groups` (đề xuất), `audit_logs` |

## Nhóm III — Thiết kế báo cáo

| Mã | Tên | API chính | DB chính |
| --- | --- | --- | --- |
| FM-01 | Thiết kế biểu mẫu | `GET/POST/PATCH/DELETE /forms`, `POST /forms/{id}/activate|deactivate`, `POST /forms/{id}/copy`, `POST /forms/{id}/template` | `forms`, `audit_logs` (+ object storage cho file) |
| FM-02 | Thuộc tính | `/forms/{id}/attributes*` + import | `form_attributes`, `import_jobs` (đề xuất), `audit_logs` |
| FM-03 | Chỉ tiêu | `/forms/{id}/indicators*` + import + reorder | `form_indicators`, `report_data` (check delete), `import_jobs` (đề xuất), `indicator_catalog` (đề xuất), `audit_logs` |

## Nhóm IV — Nghiệp vụ gửi/nhận

| Mã | Tên | API chính | DB chính |
| --- | --- | --- | --- |
| ASGN-01 | Giao báo cáo | `GET/POST /assignments`, `POST /assignments/{id}/cancel`, `POST /assignments/next-period` | `form_assignments`, `forms`, `organizations`, `report_periods`, `notifications`, `audit_logs` |
| DM-01 | Nhập liệu | `GET /my/assignments`, `POST /submissions`, `GET/PATCH /submissions/{id}(/cells)`, import/copy/history/export | `report_submissions`, `report_data`, `report_data_history` (đề xuất), `form_assignments`, `import_jobs` (đề xuất), `notifications`, `audit_logs` |
| SUBM-01 | Gửi báo cáo | `POST /submissions/{id}/submit` | `report_submissions`, `notifications`, `audit_logs` |
| APPR-01 | Duyệt báo cáo | `GET /approvals/pending`, `POST /approvals/{id}/approve|reject`, `PATCH .../reject-note` | `report_submissions`, `notifications`, `audit_logs` |
| SUM-01 | Tổng hợp | `GET/POST /summaries`, `POST /summaries/{id}/recompute` | `report_summaries`, reads `report_submissions/report_data`, `audit_logs` |
| MON/TRK | Theo dõi / nhắc nhở | `GET /monitoring/reports`, `POST /monitoring/reminders` | `form_assignments`, `report_submissions`, `notifications`, `audit_logs` |
| QRY-01 | Tra cứu | `GET /query/reports`, `GET /query/reports/{submissionId}`, `GET /query/reports/{submissionId}/export` (xem mục “Query / Tra cứu” trong **Cụm 2**) | reads: `report_submissions`, `form_assignments`, joins `forms/report_periods/organizations` (+ `audit_logs` khi export) |

## Nhóm V — Thông báo & phân tích

| Mã | Tên | API chính | DB chính |
| --- | --- | --- | --- |
| NT-01/02 | Thông báo & cài đặt | `GET /notifications`, `POST /notifications/{id}/read`, `GET /notifications/logs`, prefs trong `PATCH /me` | `notifications`, `users`, `user_notification_prefs` (đề xuất) |
| STAT | Thống kê | `GET /analytics/*`, `POST /analytics/pivot` | read aggregates trên các bảng nghiệp vụ (+ optional materialized views — ngoài phạm vi DB v1.0) |

## Ghi chú “lệch tài liệu” cần chốt khi implement

- **Multi-role**: đặc tả có “user thuộc nhiều nhóm”; DB v1.0 chỉ có `users.role_group_id` → cần `user_role_groups` (đề xuất) hoặc đổi model.
- **ASSIGNED vs assignment row**: một số tài liệu mô tả trạng thái “được giao”; DB v1.0 không có `assignment_status` → thường suy ra từ tồn tại `report_submissions` + deadline (xem **Cụm 4**).
