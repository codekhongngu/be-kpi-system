# TEMPLATE MANAGEMENT MODULE - SPEC & IMPLEMENTATION PLAN

## 1. Mục tiêu module
Module `template-management` quản lý vòng đời và cấu trúc Template làm đầu vào cho quy trình `Template -> Campaign -> Assignment -> Submission -> Summary` theo tài liệu [REPORT_SYSTEM_TECHNICAL_SPEC](./REPORT_SYSTEM_TECHNICAL_SPEC.md).

Mục tiêu chính:
- Quản lý template CRUD + clone.
- Quản lý cấu trúc form: attributes, indicators, cell config.
- Quản lý phạm vi mặc định org-indicator ở mức template.
- Khóa chỉnh sửa cấu trúc khi template đã phát sinh campaign/assignment.
- Cung cấp catalog chỉ tiêu và field category phục vụ thiết kế template.

## 2. Phạm vi tính năng
### 2.1 Template lifecycle
- Tạo template mới với `templateType`, `templateStatus`, `periodType`, `fieldCategory`.
- Danh sách/search/lọc template.
- Xem chi tiết template (gồm attributes/indicators/cellConfigs).
- Cập nhật metadata template.
- Activate/Deactivate template.
- Soft-delete template (khi đủ điều kiện).
- Clone template từ template gốc.
- Upload metadata file mẫu (`templateFile`).

### 2.2 Attribute management
- CRUD attribute theo form.
- Hỗ trợ cây cha-con qua `parentId`.
- Reorder attribute trong cùng mức cây.
- Bảo vệ attribute hệ thống (`isSystem=true`) khỏi xóa.

### 2.3 Indicator management
- CRUD indicator theo form.
- Hỗ trợ cây cha-con qua `parentId`.
- Reorder indicator trong cùng mức cây.
- Validate formula chỉ tiêu trước khi lưu.
- Ràng buộc unique code trong phạm vi form.

### 2.4 Cell config management
- Quản lý override cấu hình ô theo cặp `(indicatorId, attributeId)`.
- Xem danh sách override đã lưu.
- Xem `effective cell config` sau khi merge base + override.
- Rule: có formula thì ô luôn `readOnly=true`.

### 2.5 Template scope management
- Quản lý danh sách scope mặc định `(orgId, indicatorId)` cho template.
- Upsert scope hàng loạt.
- Xóa scope hàng loạt.
- Validate org active và indicator thuộc template.

### 2.6 Catalog & Field category
- `indicator-catalog`: CRUD danh mục chỉ tiêu dùng chung.
- `field-categories`: CRUD danh mục lĩnh vực template.

## 3. API đặc tả (theo code hiện tại)
Base permission cho tất cả endpoint: `forms.manage`.

### 3.1 Forms
- `GET /forms`: list templates.
- `POST /forms`: tạo template.
- `GET /forms/:id`: chi tiết template.
- `PATCH /forms/:id`: cập nhật template.
- `DELETE /forms/:id`: xóa template.
- `POST /forms/:id/activate`: kích hoạt template.
- `POST /forms/:id/deactivate`: ngừng kích hoạt template.
- `POST /forms/:id/copy`: clone template.
- `POST /forms/:id/template`: set tên file template upload.

### 3.2 Attributes
- `GET /forms/:formId/attributes`
- `POST /forms/:formId/attributes`
- `PATCH /forms/:formId/attributes/:attrId`
- `DELETE /forms/:formId/attributes/:attrId`
- `POST /forms/:formId/attributes/reorder`

### 3.3 Indicators
- `GET /forms/:formId/indicators`
- `POST /forms/:formId/indicators`
- `PATCH /forms/:formId/indicators/:indicatorId`
- `DELETE /forms/:formId/indicators/:indicatorId`
- `POST /forms/:formId/indicators/reorder`
- `POST /forms/:formId/indicators/formula/validate`

### 3.4 Cell configs
- `GET /forms/:formId/cell-configs`
- `GET /forms/:formId/cell-configs/effective`
- `POST /forms/:formId/cell-configs` (upsert bulk)
- `DELETE /forms/:formId/cell-configs` (delete bulk)

### 3.5 Template scopes
- `GET /forms/:formId/template-scopes`
- `POST /forms/:formId/template-scopes` (upsert bulk)
- `DELETE /forms/:formId/template-scopes` (delete bulk)

### 3.6 Indicator catalog
- `GET /indicator-catalog`
- `POST /indicator-catalog`
- `PATCH /indicator-catalog/:id`
- `DELETE /indicator-catalog/:id`

### 3.7 Field categories
- `GET /field-categories`
- `POST /field-categories`
- `PATCH /field-categories/:id`
- `DELETE /field-categories/:id`

## 4. Logic nghiệp vụ cốt lõi
### 4.1 Vòng đời Template
- `templateStatus`: `DRAFT | READY | IN_USE | ARCHIVED`.
- `templateType`: `AGGREGATE | UNIQUE`.
- Sau khi có campaign/assignment liên kết, template bị khóa chỉnh sửa cấu trúc.

### 4.2 Điều kiện khóa cấu trúc
Dùng `ensureTemplateStructureEditable(formId)` trước các thao tác cấu trúc:
- Nếu `templateStatus = IN_USE` -> lỗi `FORM_TEMPLATE_LOCKED_IN_USE`.
- Nếu đã có campaign/assignment -> lỗi `FORM_TEMPLATE_LOCKED_HAS_REPORTS`.

Áp dụng cho:
- Delete form.
- CRUD/reorder attributes.
- CRUD/reorder indicators.
- Upsert/delete cell configs.
- Upsert/delete template scopes.

### 4.3 Seed dữ liệu mặc định khi tạo form
Khi tạo mới form, hệ thống seed 4 system attributes:
- `Thứ tự`, `Mã chỉ tiêu`, `Tên chỉ tiêu`, `Đơn vị tính`.

### 4.4 Logic cấu hình ô (cell config)
- Base cell config suy ra từ indicator + attribute.
- Override cho phép thay đổi `dataType`, `required`, `readOnly`, `formula` theo từng ô.
- Nếu có formula (từ indicator hoặc override), `readOnly` bị ép `true`.

### 4.5 Tree & reorder rules
Cho cả attributes và indicators:
- `parentId` phải thuộc cùng form.
- Cấm tự tham chiếu và cấm vòng lặp.
- Reorder hỗ trợ đổi `sortOrder` và đổi parent trong 1 giao dịch.

### 4.6 Template scope rules
- Mỗi item scope gồm `(orgId, indicatorId)`.
- `indicatorId` phải thuộc form.
- `orgId` phải tồn tại và active trong bảng `organizations`.
- Upsert nhiều bản ghi trong transaction.

## 5. Ràng buộc và lỗi nghiệp vụ chính
- `FORM_CODE_DUPLICATE`: trùng mã template.
- `FORM_TEMPLATE_TYPE_LOCKED`: cấm đổi `templateType` nếu đã phát sinh campaign/assignment.
- `FORM_DEACTIVATE_BLOCKED_HAS_REPORTS`: cấm deactivate template đã dùng.
- `FORM_DELETE_BLOCKED`: cấm xóa template có assignment.
- `ATTRIBUTE_SYSTEM_PROTECTED`: cấm xóa attribute hệ thống.
- `INDICATOR_CODE_DUPLICATE`: trùng mã chỉ tiêu trong form.
- `INDICATOR_DELETE_HAS_DATA`: cấm xóa indicator đã có dữ liệu nộp.
- `CATALOG_ENTRY_IN_USE`: cấm xóa catalog entry đang được dùng.
- `FIELD_CATEGORY_IN_USE`: cấm xóa field category đang được tham chiếu.

## 6. Khoảng cách so với REPORT_SYSTEM_TECHNICAL_SPEC
Đối chiếu nhanh theo tài liệu gốc:
- Đã có: CRUD/clone template, template scope default, `template_type`, `template_status`, lock sửa cấu trúc khi đã dùng.
- Đã có nền tảng: cell config formula read-only, transaction cho thao tác batch.
- Cần hoàn thiện thêm ở biên module/cross-module:
  - Chuẩn hóa state transition endpoint cho template (ví dụ `mark_ready`, `archive`) theo state diagram.
  - Tăng mức audit log cho hành động chuyển trạng thái/chỉnh cấu trúc quan trọng.
  - Bổ sung optimistic lock/version cho thao tác patch template/scope.
  - Rà soát enforce rule `UNIQUE` xuyên suốt khi campaign snapshot/override scope.

## 7. Kế hoạch triển khai (Implementation plan)
### Phase 1 - Chuẩn hóa contract & state (ưu tiên cao)
- Chốt API transition template status:
  - `POST /forms/:id/mark-ready`
  - `POST /forms/:id/archive`
- Cứng hóa validation state transition đúng sơ đồ trạng thái.
- Bổ sung test e2e cho state transition và lock hành vi.

### Phase 2 - Cứng hóa ràng buộc nghiệp vụ
- Bổ sung optimistic lock (`version` hoặc `updatedAt` precondition) cho:
  - patch form
  - upsert/delete template scope
  - upsert/delete cell config
- Rà soát và chuẩn hóa unique constraints DB:
  - template scope: `(template_id, org_id, indicator_id)`.
- Thống nhất mã lỗi nghiệp vụ và mapping HTTP status.

### Phase 3 - Auditability & idempotency
- Thêm audit log cho các hành vi quan trọng:
  - create/patch/delete/copy form
  - sửa attributes/indicators
  - sửa template scopes/cell configs
  - đổi trạng thái template
- Thiết kế correlation/idempotency metadata cho các thao tác batch có thể retry.

### Phase 4 - Tối ưu tích hợp Campaign
- Review luồng snapshot scope từ template sang campaign để đảm bảo:
  - đầy đủ dữ liệu
  - transaction boundary rõ ràng
  - tương thích rule `templateType=UNIQUE`.
- Viết integration test giữa `template-management` và `report-campaign`.

### Phase 5 - Hardening & vận hành
- Thêm chỉ số quan sát: số lần lỗi rule, tỉ lệ conflict, thời gian xử lý batch.
- Bổ sung migration/index còn thiếu theo truy vấn thực tế.
- Hoàn thiện tài liệu API examples + runbook xử lý lỗi nghiệp vụ.

## 8. Đề xuất test checklist cho module
- Tạo form thành công và auto-seed system attributes.
- Không sửa cấu trúc được khi template đã có campaign/assignment.
- Reorder không tạo cycle.
- Formula cell luôn readOnly trong `effective` response.
- Upsert scope reject org không active hoặc indicator không thuộc form.
- Không deactivate/delete được template đã phát sinh report data.
