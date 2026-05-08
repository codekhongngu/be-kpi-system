# 02. API contract và quy ước migration

## 1. Nguồn sự thật
- Nguồn tham chiếu là `postman.json`.
- `mock-form-management-api.ts` chỉ là trạng thái tạm.
- Sau khi hoàn tất migration, file mock phải bị loại bỏ hoặc thay bằng file API thật.

## 2. Các nhóm API cần dùng
### 2.1 Forms
- `GET /forms?page=1&limit=20`
- `POST /forms`
- `GET /forms/:id`
- `PATCH /forms/:id`
- `POST /forms/:id/mark-ready`
- `POST /forms/:id/archive`
- `POST /forms/:id/activate`
- `POST /forms/:id/deactivate`
- `POST /forms/:id/copy`
- `DELETE /forms/:id`

### 2.2 Indicators
- `GET /forms/:formId/indicators`
- `POST /forms/:formId/indicators`
- `PATCH /forms/:formId/indicators/:indicatorId`
- `DELETE /forms/:formId/indicators/:indicatorId`
- `POST /forms/:formId/indicators/reorder`
- `POST /forms/:formId/indicators/formula/validate`

### 2.3 Attributes
- `GET /forms/:formId/attributes`
- `POST /forms/:formId/attributes`
- `PATCH /forms/:formId/attributes/:attrId`
- `DELETE /forms/:formId/attributes/:attrId`
- `POST /forms/:formId/attributes/reorder`

### 2.4 Cell configs
- `GET /forms/:formId/cell-configs`
- `GET /forms/:formId/cell-configs/effective`
- `POST /forms/:formId/cell-configs`
- `DELETE /forms/:formId/cell-configs`

### 2.5 Template scopes
- `GET /forms/:formId/template-scopes`
- `POST /forms/:formId/template-scopes`
- `DELETE /forms/:formId/template-scopes`

### 2.6 Catalog
- `GET /field-categories?isGetAll=true`
- `GET /indicator-catalog?page=1&limit=50`

## 3. Tên file API sau migration
### Bắt buộc
- Không dùng tên file có chữ `mock`.
- Tên file phải phản ánh chức năng thật.

### Đề xuất
- `api/template-management-api.ts`
- `api/catalog-queries.ts`
- `api/types.ts`

## 4. Quy ước map dữ liệu
### 4.1 Template list
FE phải map tối thiểu:
- `id`
- `code`
- `name`
- `description`
- `fieldCategoryId`
- `fieldCategoryName`
- `periodType`
- `templateType`
- `status`
- `isActive`
- `updatedAt`

### 4.2 Template detail
FE phải lấy:
- metadata
- indicators
- attributes
- cell configs
- template scopes

### 4.3 Cell config effective
- Preview và cell config tab không được render chỉ từ dữ liệu thô nếu BE đã có `effective`.
- Khi có endpoint `effective`, ưu tiên dùng `effective` để render.

## 5. Quy ước lỗi nghiệp vụ
FE phải chuẩn bị mapping theo business code.

Các mã lỗi cần xử lý tối thiểu:
- `FORM_TEMPLATE_LOCKED_STATUS`
- `FORM_TEMPLATE_LOCKED_HAS_REPORTS`
- `FORM_INVALID_STATUS_TRANSITION`
- `FORM_DEACTIVATE_BLOCKED_HAS_REPORTS`
- `INDICATOR_CODE_DUPLICATE`
- `ATTRIBUTE_SYSTEM_PROTECTED`

Quy ước UI:
- Hiển thị toast ngắn gọn, rõ nghĩa.
- Nếu thao tác bị khóa, giữ nguyên local state.
- Nếu lỗi thuộc phạm vi một tab, ưu tiên inline alert trong tab đó.

## 6. Quy ước mutation
- Sau create/patch/delete/reorder/upsert, refetch detail hoặc danh sách liên quan.
- Với list page, invalidate query nhóm `form-management`.
- Với detail page, refetch query của template hiện tại.
- Với tabs, refetch lại dữ liệu tab sau mutation thành công.

