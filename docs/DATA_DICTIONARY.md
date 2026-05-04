# Data Dictionary — Danh sách bảng & trường

Tài liệu này liệt kê **các table** và **ý nghĩa các trường** theo schema hiện tại (fresh DB, Nest RBAC-only).

---

## migrations (TypeORM migration history)

- **id**: khóa chính nội bộ.
- **timestamp**: mốc thời gian migration.
- **name**: tên migration đã chạy.

---

## users (tài khoản)

- **id**: khóa chính (UUID).
- **username**: tên đăng nhập (duy nhất).
- **email**: email (duy nhất).
- **password_hash**: mật khẩu băm.
- **full_name**: họ tên hiển thị.
- **phone**: số điện thoại.
- **department_id**: phòng/ban (UUID, nullable; hiện chưa FK trong migration).
- **status**: trạng thái (active|inactive|suspended).
- **last_login**: lần đăng nhập gần nhất.
- **created_at, updated_at, deleted_at**: thời gian tạo/cập nhật/xóa mềm.
- **code**: mã nhân sự/tài khoản (nullable; unique khi khác NULL).
- **org_id**: FK đến organizations (ON DELETE SET NULL).
- **avatar_url**: ảnh đại diện.
- **failed_login_attempts**: số lần đăng nhập sai.
- **locked_until**: khóa tạm tới thời điểm.
- **totp_secret**: secret 2FA (TOTP).
- **totp_enabled**: bật/tắt 2FA.
- **notify_channel**: kênh thông báo mặc định (both).
- **language**: ngôn ngữ UI.
- **timezone**: múi giờ.

---

## permissions (danh mục quyền — Nest RBAC)

- **id**: khóa chính (UUID).
- **code**: mã quyền (duy nhất).
- **name**: tên quyền.
- **description**: mô tả.
- **category**: nhóm quyền.
- **created_at, updated_at, deleted_at**: thời gian + xóa mềm.

---

## roles (vai trò hệ thống — Nest RBAC)

- **id**: khóa chính (UUID).
- **code**: mã vai trò (duy nhất, ví dụ SUPER_ADMIN).
- **name**: tên vai trò.
- **description**: mô tả.
- **is_system**: vai trò hệ thống hay không.
- **created_at, updated_at, deleted_at**: thời gian + xóa mềm.

---

## role_permissions (gán role ↔ permission)

- **role_id**: FK roles (ON DELETE CASCADE).
- **permission_id**: FK permissions (ON DELETE CASCADE).
- **PK kép**: (role_id, permission_id).

---

## user_roles (gán user ↔ role)

- **user_id**: FK users (ON DELETE CASCADE).
- **role_id**: FK roles (ON DELETE CASCADE).
- **PK kép**: (user_id, role_id).

---

## organizations (cây đơn vị hành chính)

- **id**: khóa chính (UUID).
- **code**: mã đơn vị (duy nhất), dùng định danh nghiệp vụ.
- **name**: tên đơn vị.
- **parent_id**: FK tự tham chiếu (ON DELETE SET NULL), tạo cấu trúc cây.
- **head_user_id**: FK users (ON DELETE SET NULL), user phụ trách/đứng đầu đơn vị.
- **level**: cấp trong cây.
- **is_active**: trạng thái hoạt động.
- **description**: mô tả thêm.
- **created_at, updated_at, deleted_at**: thời gian tạo/cập nhật/xóa mềm.

---

## kỳ báo cáo (period snapshot)

Không còn bảng `report_periods`. Kỳ báo cáo được lưu **snapshot** trên các bảng nghiệp vụ (ví dụ `form_assignments`, `report_summaries`) bằng các trường:

- **period_type**: loại kỳ (TUAN|THANG|QUY|NAM).
- **period_from, period_to**: khoảng thời gian kỳ (DATE).
- **period_code**: mã kỳ (nullable, phục vụ hiển thị).
- **period_name**: tên kỳ (nullable, phục vụ hiển thị).

---

## field_categories (danh mục lĩnh vực biểu mẫu)

- **id**: khóa chính (UUID).
- **code**: mã lĩnh vực (duy nhất, ví dụ kt_xh, yte…).
- **name**: tên lĩnh vực.
- **description**: mô tả.
- **sort_order**: thứ tự hiển thị.
- **is_active**: trạng thái.
- **created_at, updated_at**: thời gian.

---

## forms (định nghĩa biểu mẫu/template)

- **id**: khóa chính (UUID).
- **code**: mã biểu mẫu (duy nhất).
- **name**: tên biểu mẫu.
- **field_category_id**: FK field_categories (ON DELETE SET NULL).
- **description**: mô tả.
- **is_active**: trạng thái.
- **template_file**: đường dẫn/tên file template (nếu có).
- **parent_form_id**: FK tự tham chiếu forms (ON DELETE SET NULL) form cha–con.
- **created_by**: FK users (ON DELETE SET NULL), user tạo.
- **created_at, updated_at, deleted_at**: thời gian + xóa mềm.

---

## indicator_catalog (từ điển chỉ tiêu dùng chung)

- **id**: khóa chính (UUID).
- **code**: mã chỉ tiêu (duy nhất).
- **name**: tên chỉ tiêu.
- **unit**: đơn vị.
- **data_type**: kiểu dữ liệu.
- **created_by**: FK users (ON DELETE SET NULL).
- **created_at**: thời gian tạo.

---

## form_indicators (chỉ tiêu trong form)

- **id**: khóa chính (UUID).
- **form_id**: FK forms (ON DELETE CASCADE).
- **parent_id**: FK tự tham chiếu (ON DELETE SET NULL), tạo cấu trúc cây chỉ tiêu.
- **display_index**: chỉ mục hiển thị (ví dụ: 1, 1.1, 1.2.1...).
- **code**: mã chỉ tiêu (unique trong phạm vi 1 form).
- **name**: tên chỉ tiêu.
- **unit**: đơn vị tính.
- **data_type**: kiểu dữ liệu.
- **is_required**: bắt buộc nhập.
- **is_calculated**: chỉ tiêu tính toán hay nhập tay.
- **formula**: công thức (khi is_calculated=true).
- **group_name**: nhóm hiển thị/nhóm nghiệp vụ.
- **sort_order**: thứ tự.
- **min_value, max_value**: ràng buộc miền giá trị.
- **is_active**: trạng thái.
- **catalog_indicator_id**: FK indicator_catalog (ON DELETE SET NULL).
- **created_at**: thời gian tạo.
- **Ràng buộc**: UNIQUE(form_id, code).

---

## form_attributes (cột/thuộc tính kèm theo khi nhập liệu)

- **id**: khóa chính (UUID).
- **form_id**: FK forms (ON DELETE CASCADE).
- **parent_id**: FK tự tham chiếu (ON DELETE SET NULL), tạo cấu trúc cây thuộc tính.
- **name**: tên thuộc tính/cột.
- **data_type**: kiểu dữ liệu.
- **is_required**: bắt buộc.
- **is_visible**: có hiển thị không.
- **is_system**: thuộc tính hệ thống.
- **sort_order**: thứ tự.
- **options**: JSONB cấu hình.
- **created_at**: thời gian tạo.

---

## form_assignments (giao biểu theo đơn vị + kỳ)

- **id**: khóa chính (UUID).
- **form_id**: FK forms (ON DELETE RESTRICT).
- **org_id**: FK organizations (ON DELETE RESTRICT).
- **period_type**: loại kỳ (TUAN|THANG|QUY|NAM).
- **period_from, period_to**: khoảng thời gian kỳ (DATE).
- **period_code**: mã kỳ (nullable).
- **period_name**: tên kỳ (nullable).
- **deadline_from, deadline_to**: thời hạn thực hiện.
- **is_cancelled**: trạng thái hủy giao.
- **cancel_reason**: lý do hủy.
- **auto_assign**: giao tự động hay thủ công.
- **assigned_by**: FK users (ON DELETE SET NULL).
- **assigned_at**: thời điểm giao.
- **Ràng buộc**: UNIQUE(form_id, org_id, period_type, period_from, period_to).

---

## report_submissions (lần nộp báo cáo của một assignment)

- **id**: khóa chính (UUID).
- **code**: mã submission (duy nhất).
- **assignment_id**: FK form_assignments (ON DELETE RESTRICT).
- **status**: trạng thái luồng (DRAFT|PENDING|APPROVED|REJECTED|OVERDUE).
- **version**: phiên bản submission.
- **note**: ghi chú người nộp.
- **reject_reason**: lý do từ chối.
- **completion_pct**: % hoàn thành.
- **submitted_by, submitted_at**: FK users (ON DELETE SET NULL) / thời điểm nộp.
- **approved_by, approved_at**: FK users (ON DELETE SET NULL) / thời điểm duyệt.
- **created_at, updated_at**: thời gian.

---

## report_data (dữ liệu chi tiết theo “ô”)

- **id**: khóa chính (UUID).
- **submission_id**: FK report_submissions (ON DELETE CASCADE).
- **indicator_id**: FK form_indicators (ON DELETE RESTRICT).
- **attribute_id**: FK form_attributes (ON DELETE RESTRICT).
- **value**: giá trị dạng text.
- **value_numeric**: giá trị dạng số.
- **updated_by**: FK users (ON DELETE SET NULL).
- **updated_at**: thời điểm sửa.
- **Ràng buộc**: UNIQUE(submission_id, indicator_id, attribute_id).

---

## report_data_history (lịch sử thay đổi theo ô)

- **id**: khóa chính (UUID).
- **submission_id**: FK report_submissions (ON DELETE CASCADE).
- **indicator_id**: FK form_indicators (ON DELETE RESTRICT).
- **attribute_id**: FK form_attributes (ON DELETE RESTRICT).
- **old_value, new_value**: trước/sau.
- **changed_by**: FK users (ON DELETE SET NULL).
- **changed_at**: đổi lúc nào.

---

## report_summaries (tổng hợp phục vụ dashboard/tiến độ)

- **id**: khóa chính (UUID).
- **form_id, org_id**: FK forms/organizations (ON DELETE RESTRICT).
- **period_type**: loại kỳ (TUAN|THANG|QUY|NAM).
- **period_from, period_to**: khoảng thời gian kỳ (DATE).
- **period_code**: mã kỳ (nullable).
- **period_name**: tên kỳ (nullable).
- **status**: trạng thái tổng hợp (DRAFT).
- **total_units**: tổng số đơn vị mục tiêu (tùy cách tính).
- **submitted_units**: số đơn vị đã nộp.
- **approved_units**: số đơn vị đã duyệt.
- **summary_data**: JSONB dữ liệu tổng hợp.
- **summarized_by, summarized_at**: FK users (ON DELETE SET NULL) / thời điểm.
- **approved_by, approved_at**: FK users (ON DELETE SET NULL) / thời điểm.
- **created_at**: thời gian tạo.
- **Ràng buộc**: UNIQUE(form_id, org_id, period_type, period_from, period_to).

---

## notifications (hộp thư thông báo)

- **id**: khóa chính (UUID).
- **user_id**: FK users (ON DELETE CASCADE) người nhận.
- **type**: loại thông báo.
- **title**: tiêu đề.
- **body**: nội dung.
- **channel**: kênh.
- **is_read**: đã đọc chưa.
- **ref_table**: bảng tham chiếu (string).
- **ref_id**: id tham chiếu (BIGINT, nullable).
- **status**: trạng thái gửi (PENDING…).
- **retry_count**: số lần retry.
- **sent_at**: thời điểm gửi.
- **created_at**: thời gian tạo.

---

## audit_logs (nhật ký hành động)

- **id**: khóa chính (UUID).
- **user_id**: FK users (ON DELETE SET NULL, nullable).
- **action**: hành động.
- **table_name**: bảng bị tác động.
- **record_id**: id bản ghi (BIGINT, nullable).
- **old_value, new_value**: JSONB trước/sau.
- **ip_address**: IP.
- **user_agent**: user agent.
- **created_at**: thời gian ghi log.

---

## auth_refresh_tokens (refresh token)

- **id**: khóa chính (UUID).
- **user_id**: FK users (ON DELETE CASCADE).
- **token_hash**: hash refresh token (duy nhất).
- **expires_at**: hết hạn.
- **revoked_at**: thu hồi lúc nào.
- **created_at**: tạo lúc nào.
- **ip_address, user_agent**: metadata phiên.

---

## auth_otp_challenges (OTP / 2FA challenge)

- **id**: challengeId (PK dạng chuỗi).
- **user_id**: FK users (ON DELETE CASCADE).
- **channel**: kênh gửi OTP.
- **otp_hash**: hash OTP.
- **expires_at**: hết hạn.
- **consumed_at**: đã dùng lúc nào.
- **retry_count**: số lần thử.
- **created_at**: tạo lúc nào.

---

## auth_password_resets (quên mật khẩu)

- **id**: khóa chính (UUID).
- **user_id**: FK users (ON DELETE CASCADE).
- **token_hash**: hash token reset (duy nhất).
- **expires_at**: hết hạn.
- **used_at**: đã dùng lúc nào.
- **created_at**: tạo lúc nào.

---

## import_jobs (theo dõi job import)

- **id**: khóa chính (UUID).
- **type**: loại import.
- **status**: trạng thái job.
- **created_by**: FK users (ON DELETE SET NULL).
- **created_at**: tạo lúc nào.
- **finished_at**: xong lúc nào.
- **summary**: JSONB tổng kết (ok/fail/lỗi…).

---

## user_notification_prefs (cấu hình nhận thông báo)

- **user_id**: FK users (ON DELETE CASCADE).
- **type**: loại thông báo.
- **in_app_enabled**: bật in-app.
- **email_enabled**: bật email.
- **updated_at**: cập nhật lúc nào.
- **PK kép**: (user_id, type).

