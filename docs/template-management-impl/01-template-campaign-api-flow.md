# Hướng Dẫn Sử Dụng Luồng API Template & Campaign

Tài liệu này mô tả chi tiết luồng nghiệp vụ API (API Flow) khi thiết kế biểu mẫu (Template) và tạo đợt thu thập số liệu (Campaign), đặc biệt nhấn mạnh vào cấu hình `templateType` và `defaultValues` theo bản cập nhật mới nhất.

## 1. Vòng Đời Thiết Kế Template (Form Designer)

### Bước 1: Khởi tạo Template
- **API**: `POST /api/v1/forms`
- **Mô tả**: Tạo mới một biểu mẫu. Ở bước này cần lưu ý thuộc tính `templateType`:
  - `AGGREGATE`: Cho phép gán cùng 1 chỉ tiêu cho nhiều đơn vị (thường dùng để tổng hợp số liệu lên cấp trên).
  - `UNIQUE`: Ràng buộc 1 chỉ tiêu chỉ được giao cho duy nhất 1 đơn vị (thường dùng cho các KPI đặc thù riêng biệt).

### Bước 2: Thiết lập Cấu trúc (Indicators & Attributes)
- **Indicators (Dòng)**: `POST /api/v1/forms/{formId}/indicators`
- **Attributes (Cột)**: `POST /api/v1/forms/{formId}/attributes`
- **Mô tả**: Xây dựng cấu trúc ma trận của biểu mẫu. Các API này cho phép tạo cấu trúc phân cấp (có `parentId`).

### Bước 3: Cấu hình dữ liệu ô (Cell Configs)
- **API**: `POST /api/v1/forms/{formId}/cell-configs`
- **Body**: Truyền danh sách cấu hình `{ indicatorId, attributeId, dataType, required, readOnly, formula }`.
- **Mô tả**: Thiết lập kiểu dữ liệu (text/number), tính bắt buộc và công thức tính toán. Không bao gồm giá trị mặc định ở bước này.

### Bước 4: Phân bổ phạm vi (Template Scopes)
- **API**: `POST /api/v1/forms/{formId}/template-scopes`
- **Body**: Truyền danh sách `{ orgId, indicatorId }`.
- **Ràng buộc quan trọng**: 
  - Nếu Template đang có `templateType = UNIQUE`, hệ thống sẽ chặn không cho phép gán cùng `indicatorId` cho đơn vị thứ 2. 
  - Sẽ trả về lỗi `UNIQUE_TEMPLATE_INDICATOR_CONFLICT` (HTTP 409) nếu vi phạm.

### Bước 5: Chốt Template
- **API**: `POST /api/v1/forms/{formId}/mark-ready`
- **Mô tả**: Khóa cấu trúc và biến Template thành trạng thái có thể được dùng cho việc tạo Campaign.

---

## 2. Vòng Đời Triển Khai Campaign & Default Values

### Bước 1: Khởi tạo Campaign
- **API**: `POST /api/v1/report-campaigns`
- **Body**: Cần truyền `formId`, `periodType`, `periodCode`, khoảng thời gian `deadlineFrom`, `deadlineTo`.
- **Hệ thống tự động**: Snapshot (sao chép) toàn bộ cấu trúc (indicators, attributes, cell_configs) và danh sách phân bổ (scopes) từ Template sang hệ thống Campaign ở trạng thái `DRAFT`.

### Bước 2: Bổ sung/Chỉnh sửa Scopes (Tùy chọn)
- **API**: `POST /api/v1/report-campaigns/{campaignId}/scopes`
- **Mô tả**: Cán bộ quản lý có thể thêm/bớt đơn vị nhận chỉ tiêu cho kỳ này. Ràng buộc `UNIQUE` (nếu có ở Template) vẫn sẽ được áp dụng tự động.

### Bước 3: Cấu hình Giá trị mặc định (Default Values)
- **API**: `POST /api/v1/report-campaigns/{campaignId}/default-values`
- **Body**: Truyền mảng cấu hình các ô cần điền sẵn.
  ```json
  {
    "items": [
      {
        "indicatorId": "uuid-1",
        "attributeId": "uuid-2",
        "valueText": null,
        "valueNumber": 1000000
      }
    ]
  }
  ```
- **Ràng buộc**:
  - Chỉ được thiết lập khi Campaign ở trạng thái `DRAFT`.
  - Phải tuân thủ `dataType` đã định nghĩa tại Cell Configs của template (nếu ô quy định `dataType = number`, bắt buộc phải có `valueNumber`).
- **Lưu ý**: Các ô đã được cấu hình giá trị mặc định sẽ hiển thị dưới dạng **đọc (read-only/locked)** ở phía Client trong bước nhập liệu.

### Bước 4: Phát hành Đợt báo cáo (Dispatch)
- **API**: `POST /api/v1/report-campaigns/{campaignId}/confirm-dispatch`
- **Mô tả**: Chuyển trạng thái Campaign thành `DISPATCHED`. Lúc này hệ thống tự động sinh các `Assignments` (Bản giao việc) cho từng đơn vị. Sau bước này, không thể sửa đổi `scopes` hay `defaultValues` được nữa.

---

## 3. Tác động của Default Values ở phía Submission & Summary

### 3.1. Nhập liệu (Submission)
- Khi gọi API lấy chi tiết `GET /api/v1/submissions/{submissionId}`, response trả về danh sách `cells` (giá trị người dùng đã nhập) VÀ `defaultValues` (mảng các ô bị khóa).
- **Hành vi API Patch Cells** (`PATCH /api/v1/submissions/{submissionId}/cells`): Nếu đơn vị cố ý gửi lên payload sửa một ô nằm trong danh sách có `defaultValue`, API sẽ từ chối lưu ô đó và trả về lỗi `CELL_LOCKED_BY_DEFAULT_VALUE` trong mảng `validationErrors` của kết quả. Các ô bình thường khác vẫn được lưu.

### 3.2. Tổng hợp báo cáo (Summary Analytics)
- Khi gọi `POST /api/v1/summaries/{summaryId}/recompute`, hệ thống sẽ lấy ra toàn bộ các bản nhập đã được `APPROVED` cộng với bộ `defaultValues`.
- **Nguyên tắc Merge**:
  - Dữ liệu ở `defaultValues` mang tính chỉ định (không cho người dùng sửa), nên nó được đặt mức độ ưu tiên cao nhất, đè lên bất kỳ giá trị ảo nào có thể bị lọt vào DB do lỗ hổng kỹ thuật (nếu có).
  - Dữ liệu rỗng ở `defaultValues` sẽ được lắp đầy bằng tổng (sum) các submission_cells hợp lệ của các đơn vị con.
