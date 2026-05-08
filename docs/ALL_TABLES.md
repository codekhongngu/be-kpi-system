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

### `users` (tài khoản người dùng)

- **id**: định danh nội bộ duy nhất của user.
- **username, email**: thông tin đăng nhập / liên hệ; email thường dùng cho OTP, khôi phục mật khẩu.
- **password_hash**: mật khẩu đã băm (không lưu plaintext).
- **full_name, phone**: hiển thị và liên hệ khi vận hành.
- **department_id**: gợi ý phòng/ban nội bộ (placeholder trong schema; chưa ràng buộc bảng departments).
- **status**: cho phép/khoá tài khoản mềm (ví dụ tạm ngưng).
- **last_login**: phục vụ audit và hiển thị “hoạt động gần đây”.
- **created_at, updated_at, deleted_at**: dấu vết thời gian và xóa mềm.
- **code**: mã nhân sự/mã tài khoản nội bộ (tra cứu, import/export); unique khi có giá trị.
- **org_id**: đơn vị (xã/phòng) user gắn mặc định — gợi ý phạm vi dữ liệu/UI.
- **avatar_url**: ảnh đại diện.
- **failed_login_attempts, locked_until**: chống brute-force (khóa tạm sau N lần sai).
- **totp_secret, totp_enabled**: bật 2FA TOTP nếu triển khai.
- **notify_channel**: kênh gửi thông báo mặc định (in-app/email/cả hai — giá trị cụ thể do app quy ước).
- **language, timezone**: tùy chọn hiển thị thời gian/ngôn ngữ.

---

## 3) Nest RBAC tables (nguồn phân quyền)

Các bảng này phục vụ “RBAC kiểu Nest” (roles/permissions) và là **nguồn phân quyền duy nhất** của hệ thống.

### `permissions`
- **id**: khóa quyền.
- **code**: mã quyền dùng trong code/policy (ví dụ `forms.manage`).
- **name, description**: nhãn và giải thích cho admin.
- **category**: gom nhóm quyền (admin / QLDL…).
- **created_at, updated_at, deleted_at**: vòng đời và xóa mềm định nghĩa quyền.

### `roles`
- **id**: khóa vai trò.
- **code, name, description**: mã và tên hiển thị vai trò (ví dụ `SUPER_ADMIN`).
- **is_system**: vai trò hệ thống — thường không cho xóa tay.
- **created_at, updated_at, deleted_at**: quản trị vai trò.

### `role_permissions`
- **role_id, permission_id**: vai trò có những quyền nào.

### `user_roles`
- **user_id, role_id**: user mang vai trò nào (gán nhiều vai trò được).

---

## 4) Template/Campaign tables (nghiệp vụ báo cáo/biểu mẫu - canonical)

### Nhóm tổ chức

### `organizations` (cây đơn vị hành chính / tổ chức)
- **id**: định danh đơn vị.
- **code**: mã đơn vị chuẩn hóa (tra cứu, import).
- **name**: tên hiển thị.
- **parent_id**: quan hệ cha–con (cấp trên / cấp dưới).
- **head_user_id**: người đứng đầu đơn vị (gợi ý chỉ định trách nhiệm).
- **level**: độ sâu/cấp trong cây (ví dụ xã, tổ, bộ phận).
- **is_active**: đơn vị còn dùng hay đã ngưng.
- **description**: mô tả/ghi chú.
- **created_at, updated_at, deleted_at**: dấu vết thời gian / ẩn đơn vị.

### Nhóm thiết kế template

### `field_categories` (nhóm lĩnh vực biểu mẫu)
- **id**: định danh nhóm.
- **code**: mã nhóm (chuẩn hóa, dùng tra cứu/hiển thị nhanh).
- **name**: tên nhóm hiển thị cho người dùng.
- **description**: mô tả/giải thích thêm.
- **sort_order**: thứ tự sắp xếp khi hiển thị danh sách.
- **is_active**: có cho dùng/gán vào biểu mẫu hay không.
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật gần nhất.

### `indicator_catalog` (danh mục chỉ tiêu chuẩn)
- **id**: định danh chỉ tiêu chuẩn.
- **code**: mã chỉ tiêu chuẩn.
- **name**: tên đầy đủ chỉ tiêu.
- **unit**: đơn vị đo (ví dụ %, người, nghìn đồng…).
- **data_type**: kiểu dữ liệu kỳ vọng của chỉ tiêu (để validate/format).
- **created_by**: ai tạo (tham chiếu users.id).
- **created_at**: thời điểm tạo.

### `form_templates` (template biểu mẫu)
- **id**: định danh template.
- **code**: mã template (duy nhất).
- **name**: tên template.
- **template_type**: kiểu template (ví dụ: `AGGREGATE` hoặc `UNIQUE` theo quy ước nghiệp vụ).
- **template_status**: trạng thái template (mặc định `DRAFT`).
- **period_type**: loại kỳ mà template dùng (tháng/quý/tuần… theo quy ước).
- **field_category_id**: lĩnh vực/nhóm mà template thuộc về (FK).
- **description**: mô tả/ghi chú cho template.
- **is_active**: còn bật để tạo campaign hay đã tắt.
- **template_file**: tham chiếu file mẫu (nếu có tích hợp).
- **parent_template_id**: kế thừa template (template cha) để override/clone scope.
- **created_by**: người tạo template.
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật.
- **deleted_at**: xóa mềm (nếu dùng soft-delete).

### `form_template_attributes` (thuộc tính ô trong template)
- **id**: định danh thuộc tính.
- **template_id**: thuộc template nào (FK).
- **parent_id**: kế thừa cấu trúc thuộc tính (cha trong cây, nếu có).
- **name**: nhãn thuộc tính/ô.
- **data_type**: kiểu dữ liệu (để validate & render).
- **is_required**: bắt buộc nhập khi dùng.
- **is_visible**: có hiển thị trên form nhập liệu hay không.
- **is_readonly**: khóa không cho sửa ở UI (trạng thái readonly).
- **is_system**: thuộc tính hệ thống (hạn chế chỉnh sửa tay).
- **sort_order**: thứ tự hiển thị.
- **options**: cấu hình dạng JSON cho các kiểu (ví dụ dropdown/ràng buộc).
- **validation_rule**: rule validate dạng JSON.
- **created_at**: thời điểm tạo.

### `form_template_indicators` (chỉ tiêu trong template)
- **id**: định danh chỉ tiêu.
- **template_id**: thuộc template nào (FK).
- **parent_id**: kế thừa chỉ tiêu theo cây (nếu có).
- **display_index**: vị trí hiển thị (để điều khiển thứ tự/nhóm).
- **code**: mã chỉ tiêu (unique theo template_id).
- **name**: tên chỉ tiêu hiển thị.
- **unit**: đơn vị đo.
- **data_type**: kiểu dữ liệu nhập.
- **is_required**: bắt buộc có giá trị.
- **is_readonly**: chỉ tiêu readonly (không cho nhập tay).
- **is_calculated**: có phải chỉ tiêu tính toán từ formula không.
- **formula**: biểu thức tính (nếu is_calculated = true).
- **group_name**: tên nhóm để gom trong UI.
- **sort_order**: thứ tự hiển thị trong template.
- **min_value, max_value**: giới hạn cho phép.
- **validation_rule**: rule validate dạng JSON.
- **is_active**: có còn dùng trong template/campaign hay không.
- **catalog_indicator_id**: liên kết tới chỉ tiêu chuẩn trong indicator_catalog.
- **created_at**: thời điểm tạo.

### `form_template_indicator_org_rules` (luật scope chỉ tiêu theo org trong template)
- **id**: định danh rule.
- **template_id**: thuộc template nào.
- **org_id**: tổ chức/đơn vị áp dụng rule.
- **indicator_id**: chỉ tiêu áp dụng rule.
- **is_enabled**: bật/tắt chỉ tiêu cho tổ chức đó.
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật.

### `form_template_cell_configs` (cấu hình cell chi tiết theo template)
- **id**: định danh cấu hình cell.
- **template_id**: thuộc template nào.
- **indicator_id**: cell thuộc chỉ tiêu nào.
- **attribute_id**: cell thuộc thuộc tính/ô nào.
- **is_editable**: cell cho phép sửa (phục vụ override theo campaign nếu có).
- **validation_rule**: rule validate cho riêng cell (JSON).
- **default_value**: giá trị mặc định của cell.
- **data_type**: kiểu dữ liệu cell.
- **is_required**: cell có bắt buộc không (có thể override theo scope).
- **formula**: công thức tính cho cell (nếu cell tính toán).
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật.

### Nhóm campaign / giao việc / nộp / tổng hợp

### `report_campaigns` (campaign báo cáo: “đợt” tạo từ template)
- **id**: định danh campaign.
- **template_id**: campaign tạo từ template nào.
- **period_type**: loại kỳ của campaign.
- **period_code**: mã kỳ (ví dụ KBCT01, KBCQ02… theo quy ước hệ thống).
- **period_name**: tên kỳ hiển thị.
- **deadline_from**: từ ngày (bắt đầu khoảng hạn vận hành/nộp).
- **deadline_to**: đến ngày (kết thúc khoảng hạn).
- **status**: trạng thái campaign (mặc định DRAFT).
- **created_by**: người tạo campaign.
- **dispatched_by**: người “phát hành/dispatch” campaign (chuyển sang trạng thái giao việc).
- **dispatched_at**: thời điểm dispatch.
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật.

### `report_campaign_indicator_org_scopes` (scope chỉ tiêu theo tổ chức trong campaign)
- **id**: định danh scope.
- **campaign_id**: thuộc campaign nào.
- **org_id**: tổ chức áp dụng scope.
- **indicator_id**: chỉ tiêu được áp dụng cho org trong campaign.
- **source**: nguồn tạo scope (vd MANUAL nghĩa là do thao tác tay; có thể có loại khác trong tương lai).
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật.

### `report_assignments` (giao việc: giao campaign cho từng org)
- **id**: định danh assignment.
- **campaign_id**: thuộc campaign nào.
- **template_id**: template dùng trong assignment.
- **org_id**: đơn vị nhận giao việc.
- **period_type**: loại kỳ.
- **period_code**: mã kỳ.
- **period_name**: tên kỳ.
- **deadline_from**: từ ngày deadline.
- **deadline_to**: đến ngày deadline.
- **status**: trạng thái giao việc (mặc định ASSIGNED).
- **is_cancelled**: có bị hủy assignment không.
- **cancel_reason**: lý do hủy.
- **assigned_by**: ai thực hiện giao.
- **assigned_at**: thời điểm giao.

### `report_submissions_new` (bản nộp mới)
- **id**: định danh bản nộp.
- **code**: mã bản nộp (duy nhất).
- **assignment_id**: nộp cho assignment nào.
- **status**: trạng thái vòng đời bản nộp (mặc định DRAFT).
- **version**: phiên bản nộp (để resubmit).
- **note**: ghi chú của đơn vị khi nộp.
- **reject_reason**: lý do bị từ chối (khi reject).
- **completion_pct**: phần trăm hoàn thành (cho theo dõi tiến độ).
- **submitted_by**: ai đã submit.
- **submitted_at**: thời điểm submit.
- **approved_by**: ai duyệt.
- **approved_at**: thời điểm duyệt.
- **created_at**: thời điểm tạo.
- **updated_at**: thời điểm cập nhật.

### `report_submission_cells` (giá trị ô dữ liệu trong bản nộp)
- **id**: định danh cell.
- **submission_id**: thuộc bản nộp nào.
- **indicator_id**: cell thuộc chỉ tiêu nào.
- **attribute_id**: cell thuộc thuộc tính/ô nào.
- **value**: giá trị dạng text (đầu vào linh hoạt).
- **value_numeric**: giá trị dạng số (hỗ trợ tính toán/aggregate).
- **updated_by**: ai cập nhật ô gần nhất.
- **updated_at**: thời điểm cập nhật gần nhất.
- **(Ràng buộc unique)**: submission_id, indicator_id, attribute_id.

### `report_summaries_new` (tổng hợp theo campaign)
- **id**: định danh bản tổng hợp.
- **campaign_id**: tổng hợp cho campaign nào.
- **template_id**: dùng template nào.
- **org_id**: đơn vị được tổng hợp cho phạm vi đó.
- **period_type**: loại kỳ.
- **period_code**: mã kỳ.
- **period_name**: tên kỳ.
- **status**: trạng thái tổng hợp (mặc định DRAFT).
- **total_units**: tổng số đơn vị con/đối tượng tham gia (phục vụ thống kê).
- **submitted_units**: số đơn vị đã submit.
- **approved_units**: số đơn vị đã được duyệt.
- **summary_data**: dữ liệu tổng hợp dạng JSON (định dạng linh hoạt).
- **summarized_by**: người tổng hợp.
- **summarized_at**: thời điểm tổng hợp.
- **approved_by**: người duyệt tổng hợp.
- **approved_at**: thời điểm duyệt.
- **created_at**: thời điểm tạo.
- **(Unique)**: campaign_id, org_id.

### Nhóm thông báo & audit

### `notifications` (thông báo cho user)
- **id**: khóa thông báo.
- **user_id**: người nhận.
- **type**: loại sự kiện (hạn nộp, duyệt, từ chối…).
- **title, body**: tiêu đề và nội dung.
- **channel**: gửi qua gì (in-app/email/sms — tùy triển khai).
- **is_read**: đã đọc hay chưa.
- **ref_table, ref_id**: tham chiếu tới bản ghi nguồn (để mở chi tiết); lưu ý ref_id là bigint trong schema.
- **status, retry_count, sent_at**: trạng thái gửi và retry (job/hàng đợi).
- **created_at**: thời điểm tạo thông báo.

### `audit_logs` (nhật ký hệ thống / thao tác nhạy cảm)
- **id**: khóa log.
- **user_id**: ai thực hiện (nullable nếu job hệ thống).
- **action**: kiểu thao tác (CREATE/UPDATE/DELETE… quy ước app).
- **table_name, record_id**: bảng và bản ghi bị tác động.
- **old_value, new_value**: diff JSON để điều tra.
- **ip_address, user_agent**: bối cảnh truy cập.
- **created_at**: thời điểm ghi log.

---

## 5) Auth nâng cao / Import (QLDL - hỗ trợ)

### `auth_refresh_tokens` (phiên đăng nhập kéo dài)
- **id**: khóa bản ghi token lưu DB.
- **user_id**: chủ token.
- **token_hash**: hash của refresh token (không lưu nguyên văn).
- **expires_at, revoked_at**: hết hạn và thu hồi.
- **created_at**: khi cấp token.
- **ip_address, user_agent**: bối cảnh cấp token (bảo mật/kiểm tra).

### `auth_otp_challenges` (OTP một lần — đăng nhập/xác minh)
- **id**: khóa phiên OTP.
- **user_id**: ai nhận OTP.
- **channel**: email/SMS…
- **otp_hash**: hash mã OTP (không lưu plaintext).
- **expires_at, consumed_at**: hết hạn và đã dùng.
- **retry_count**: số lần thử sai/thử lại.
- **created_at**: khi phát hành thách thức.

### `auth_password_resets` (liên kết đặt lại mật khẩu)
- **id**: khóa yêu cầu reset.
- **user_id**: tài khoản được reset.
- **token_hash**: hash token trong email (bảo mật).
- **expires_at, used_at**: hết hạn và đã dùng một lần.
- **created_at**: khi gửi yêu cầu.

### `import_jobs` (tác vụ import hàng loạt)
- **id**: khóa job.
- **type**: loại import (user, chỉ tiêu…).
- **status**: trạng thái xử lý (queued/running/done/failed…).
- **created_by, created_at**: ai tạo và khi nào.
- **finished_at**: khi hoàn tất.
- **summary**: JSON kết quả (thành công/lỗi dòng…).

### `user_notification_prefs` (tùy chọn thông báo theo loại)
- **user_id, type**: user + loại thông báo (khóa composite).
- **in_app_enabled, email_enabled**: bật/tắt theo kênh.
- **updated_at**: lần chỉnh sở thích gần nhất.

---

## 6) Ghi chú quan trọng

- **Bạn sẽ luôn thấy** bảng `migrations` sau khi chạy migrations (TypeORM tracking).
- Ngoài “tables”, DB còn có thể có **extensions** và **enum types** (ví dụ `pgcrypto`, `uuid-ossp`, `users_status_enum`) nhưng chúng **không phải table**.
- Nếu bạn muốn danh sách “tất cả tables đang có trong DB thật” tại runtime, cách chính xác nhất là query từ `information_schema.tables`.

