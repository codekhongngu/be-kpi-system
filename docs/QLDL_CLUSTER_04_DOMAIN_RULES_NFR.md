# QLDL — Cụm 4: Luật nghiệp vụ (state + tổng hợp) + NFR/vận hành

> File này gộp các tài liệu trước đây tách riêng:
> - `QLDL_STATE_MACHINES.md`
> - `QLDL_CONSOLIDATION_RULES.md`
> - `QLDL_NFR_AND_OPS.md`

---

## Phần A — State machines (chuẩn hoá triển khai)

## QLDL — State machines (chuẩn hoá triển khai)

Tài liệu này “chốt” cách hiểu trạng thái giữa **Use case** và **DB v1.0**, tránh lệch khi code.

### 1) `report_submissions.status` (phiên nhập liệu / bản nộp)

#### Enum khuyến nghị (lưu DB)

- `DRAFT`: đang nhập / autosave
- `PENDING`: đã gửi chờ duyệt
- `APPROVED`: đã duyệt
- `REJECTED`: trả lại, cho phép sửa và gửi lại
- `OVERDUE` *(tuỳ chọn)*:
  - **Option A (khuyến nghị)**: **không lưu** `OVERDUE` trong DB; chỉ tính runtime từ `deadline_to` + `status in (DRAFT,REJECTED)` và/hoặc chưa submit
  - **Option B**: lưu `OVERDUE` bằng job cập nhật định kỳ (dễ query nhưng phải có job revert nếu nộp trễ được phép)

#### Transition cho phép

- `DRAFT -> PENDING` (submit)
- `PENDING -> APPROVED` (approve)
- `PENDING -> REJECTED` (reject)
- `REJECTED -> DRAFT` (mở lại để sửa; có thể auto khi reject hoặc qua endpoint “reopen”)
- `DRAFT/REJECTED -> DRAFT` (autosave)

#### Quyền chỉnh sửa theo trạng thái (rule nghiệp vụ)

- `DRAFT`, `REJECTED`: Data Entry **được** `PATCH /submissions/{id}/cells`
- `PENDING`: **read-only** đối với Data Entry; Approver **read-only** + hành động duyệt
- `APPROVED`: **read-only** mọi role (trừ quy trình điều chỉnh/versioning nếu có)

> Ghi chú: Use case có thể đề cập trạng thái tổng hợp `CONSOLIDATED/PUBLISHED` — đó là **tầng báo cáo tổng hợp** (`report_summaries`) hoặc “publication”, không nhất thiết là `report_submissions.status`.

### 2) “Được giao nhưng chưa nhập” vs DB `form_assignments`

DB v1.0 không có `assignment_status`. Khuyến nghị suy luận:

- **Đã giao**: tồn tại row `form_assignments` và `is_cancelled=false`
- **Chưa bắt đầu nhập**:
  - không có `report_submissions` **hoặc** có submission nhưng chưa có `report_data` (tuỳ rule “tạo submission sớm”)
- **Đang nhập**: có submission `status=DRAFT` (hoặc có cell changes)
- **Đã gửi**: submission `status=PENDING`

### 3) `report_summaries.status` (tổng hợp)

DB v1.0 đang dùng các giá trị kiểu: `DRAFT|SUMMARIZED|SUBMITTED|APPROVED` (theo data dictionary). Khuyến nghị chuẩn hoá lại cho đúng nghiệp vụ:

- `DRAFT`: đang soạn/tính tạm
- `FINALIZED` *(đổi tên từ `SUMMARIZED`)*: đã chốt tổng hợp
- `SUBMITTED_TO_LEADER` *(optional)*: đã trình lãnh đạo (nếu cần workflow riêng)
- `APPROVED`: lãnh đạo phê duyệt bản tổng hợp
- `PUBLISHED` *(optional)*: công bố

> Việc đổi enum cần migration; nếu muốn giữ DB cũ: map `SUMMARIZED` = `FINALIZED` ở tầng API.

### 4) Notifications delivery

Bảng `notifications.status`: `PENDING|SENT|FAILED` + `retry_count`.

Transition:

- `PENDING -> SENT` (delivery success)
- `PENDING -> FAILED` (delivery fail)
- retry policy ở worker (không nhất thiết là state machine phức tạp)

---

## Phần B — Consolidation rules (tổng hợp báo cáo)

## QLDL — Consolidation rules (tổng hợp báo cáo)

Tài liệu này bám theo phần mô tả nghiệp vụ trong **Đặc tả v2.0** (tổng hợp, đối soát sai lệch, chạy lại) và mapping DB hiện có (`report_summaries.summary_data` + nguồn `report_submissions/report_data`).

### Thuật ngữ

- **Biểu mẫu cha**: `forms.parent_form_id` trỏ tới biểu mẫu tổng (hoặc ngược lại — cần chốt hướng “parent/child” trong cấu hình; DB có `parent_form_id`).
- **Biểu mẫu con**: biểu mẫu được tách phần việc cho đơn vị/cá nhân.
- **Cộng dồn (cumulative)**: cùng một `forms` được giao cho nhiều `organizations`, tổng hợp theo `indicator.code`.

### Rule A — Biểu mẫu cha–con (split workload)

#### Nguyên tắc khóa định danh

- Khóa đồng bộ theo **`form_indicators.code`** (Indicator Code) giữa cha và con.

#### Luồng dữ liệu (chiều xuôi)

1. Biểu mẫu con được nhập và gửi duyệt như submission thông thường.
2. Khi submission con ở trạng thái `APPROVED`, hệ thống cập nhật các ô tương ứng trên biểu mẫu cha:
   - ghi vào `report_data` của submission cha (read-only cells) **hoặc** vào `report_summaries.summary_data` (tuỳ cách triển khai)
3. Ô trên cha phải hiển thị **read-only** + metadata nguồn (tên biểu mẫu con / submission id).

#### Điều kiện “cha được duyệt”

- Tất cả biểu mẫu con liên quan đã hoàn tất theo rule (thường: đã `APPROVED` hoặc đã nộp đủ theo danh mục chỉ tiêu được phân).

#### Khóa dữ liệu sau đồng bộ

- Sau khi giá trị đã được sync vào cha, các bản ghi nguồn (con) nên ở trạng thái **không cho sửa trực tiếp**; nếu phải sửa: quy trình **reject/rollback** theo cấp (mức policy).

### Rule B — Cộng dồn đa đơn vị (same form, many orgs)

#### Nguyên tắc tổng hợp

- Với mỗi `indicator.code`, giá trị tổng là tổng đại số các giá trị cùng code từ các đơn vị thành phần.

#### “Tạm tính” vs “chốt”

- **Tạm tính (preview)**: có thể hiển thị khi có đơn vị ở `PENDING` (theo đặc tả có nhắc tạm tính khi có nộp nhưng chưa duyệt — cần chốt UI/permission).
- **Chốt chính thức**: chỉ gồm đơn vị `APPROVED` (theo đặc tả) trước khi `FINALIZED/SUMMARIZED`.

#### Sai lệch / bất thường

- Phát hiện:
  - đơn vị chưa nộp / trễ hạn
  - biến động vượt ngưỡng so với kỳ trước (theo cấu hình cảnh báo)
- Hành động:
  - gắn flag vào `summary_data` (JSON) + tạo `notifications` nhắc nhở
  - cho phép `recompute` sau khi đơn vị nộp muộn

### API ↔ DB mapping (tổng hợp)

- `POST /summaries`:
  - reads: `form_assignments`, `report_submissions`, `report_data`, `form_indicators` (code/type/formula)
  - writes: `report_summaries` (`summary_data`, counters, status, timestamps)
- `POST /summaries/{id}/recompute`:
  - reads lại nguồn mới nhất + rewrite `summary_data`

### Gợi ý triển khai `summary_data` (JSON)

Lưu tối thiểu:

- `indicators: { [code]: { value, agg: "sum", sources: [{orgId, submissionId, value, status}] } }`
- `issues: [{ type:"MISSING_ORG"|"ANOMALY", orgId?, message, severity }]`

### Việc cần chốt với BA (để tránh hiểu nhầm)

- “Tạm tính gồm PENDING” có được **xuất báo cáo chính thức** không, hay chỉ màn hình preview?
- `parent_form_id` trong DB đang trỏ cha hay con? (cần 1 quy ước duy nhất)

---

## Phần C — Non-functional requirements (NFR) & vận hành

## QLDL — Non-functional requirements (NFR) & vận hành

Tài liệu này tổng hợp các yêu cầu **phi chức năng** trong **Đặc tả v2.0** (hiệu năng, bảo mật, tin cậy, mở rộng) + các hạng mục vận hành thường gặp khi triển khai backend.

### Hiệu năng (Performance)

- **API latency**: mục tiêu p95 < 500ms cho request thông thường (theo đặc tả).
- **Dashboard**: KPI load < 3s với dữ liệu ~12 tháng (theo đặc tả).
- **Concurrency**: hỗ trợ tối thiểu ~100 user đồng thời (theo đặc tả).
- **Import Excel**: 10k dòng < 30s (theo đặc tả) → cần worker + batch insert + index hợp lý.

**Gợi ý kỹ thuật**

- Read replica / caching cho analytics
- Partition `report_data`, `audit_logs` theo thời gian (theo DB doc)
- Tránh N+1 khi load grid: bulk fetch `report_data` theo `submission_id`

### Bảo mật (Security)

- **TLS**: HTTPS TLS 1.2+ (theo đặc tả)
- **Password**: bcrypt cost >= 12 (theo đặc tả + use case)
- **JWT**: access TTL ~1h, refresh TTL ~7d (theo đặc tả) → cần bảng refresh token nếu revoke/rotation
- **OWASP**: SQLi/XSS/CSRF mitigations (theo đặc tả)
- **Rate limit**: 1000 req/phút/IP (theo đặc tả) + rate limit riêng cho login/OTP
- **Secrets**: không commit secrets; dùng secret manager

### Tin cậy & sẵn sàng (Reliability)

- **Uptime**: >= 99.5% (theo đặc tả)
- **Backup**: daily backup, giữ >= 30 ngày (theo đặc tả)
- **RPO/RTO**: RPO <= 24h, RTO <= 4h (theo đặc tả)

### Khả năng mở rộng (Scalability)

- Horizontal scale app tier (theo đặc tả)
- Queue workers cho email/notification/import

### Observability (khuyến nghị bổ sung để vận hành)

- Structured logging (requestId/userId/orgId)
- Metrics: latency, error rate, queue lag, DB slow queries
- Tracing (OpenTelemetry) nếu hệ thống lớn

### Tuân thủ dữ liệu / pháp lý (tuỳ triển khai thực tế)

- Audit trail cho thay đổi dữ liệu nhạy cảm (`audit_logs`)
- Retention policy cho logs/exports
