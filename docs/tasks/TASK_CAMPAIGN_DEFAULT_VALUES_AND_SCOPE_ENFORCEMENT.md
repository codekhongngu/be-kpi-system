# TASK: Campaign DefaultValues + Template Scope Enforcement

> Task file cho AI thực hiện cập nhật logic nghiệp vụ.
> Tài liệu tham chiếu: `docs/PROJECT_ANALYSIS.md`

---

## Bối cảnh

Hệ thống KPI Report có 3 tầng: Template → Campaign → Assignment.

- **Template** = khung biểu mẫu, không có dữ liệu, chỉ có cấu trúc và quy tắc.
- **Campaign** = thực thể theo kỳ (tháng 1, tháng 2...), clone từ template, **có dữ liệu defaultValue**.
- **Assignment** = giao việc cho từng đơn vị trong campaign.

Hiện tại hệ thống **thiếu 2 tính năng**:
1. Enforce `templateType` (AGGREGATE/UNIQUE) ở mức template scope.
2. Bảng và API cho defaultValues ở mức campaign.

---

## Mục tiêu

Cập nhật backend NestJS để:
1. Ràng buộc `templateType` khi cấu hình scope ở template.
2. Tạo bảng `report_campaign_default_values` và API tương ứng.
3. Tích hợp defaultValues vào luồng nhập liệu (submission).

---

## Task 1: Enforce templateType tại template scope

### Mô tả
Khi `templateType = UNIQUE`, hàm `upsertTemplateScopes()` trong `TemplateManagementService` phải kiểm tra:
cùng 1 `(template_id, indicator_id)` không được gán cho 2 `org_id` khác nhau.

### File cần sửa
- `src/modules/template-management/form-designer.service.ts`
  - Hàm `upsertTemplateScopes()` (dòng ~1545)

### Logic cần thêm
```
1. Lấy form entity để biết templateType
2. Nếu templateType === 'UNIQUE':
   a. Với mỗi item trong dto.items, kiểm tra bảng form_template_indicator_org_rules:
      - Có tồn tại bản ghi nào với cùng (template_id, indicator_id) 
        nhưng KHÁC org_id và is_enabled = true không?
   b. Nếu có → throw ConflictException('UNIQUE_TEMPLATE_INDICATOR_CONFLICT')
3. Nếu templateType === 'AGGREGATE': không cần kiểm tra thêm (đã có unique constraint (template_id, org_id, indicator_id))
```

### Error code
- `UNIQUE_TEMPLATE_INDICATOR_CONFLICT`: "Biểu mẫu loại UNIQUE không cho phép gán cùng chỉ tiêu cho nhiều đơn vị"

### Test cases
- [x] AGGREGATE template: gán chỉ tiêu X cho org A và org B → thành công
- [x] UNIQUE template: gán chỉ tiêu X cho org A → thành công
- [x] UNIQUE template: gán chỉ tiêu X cho org B (đã có org A) → lỗi UNIQUE_TEMPLATE_INDICATOR_CONFLICT
- [x] UNIQUE template: gán chỉ tiêu Y cho org B (chỉ tiêu khác) → thành công

---

## Task 2: Tạo bảng report_campaign_default_values

### Mô tả
Tạo migration mới để thêm bảng `report_campaign_default_values`.

### File cần tạo
- `src/migrations/<timestamp>-add-report-campaign-default-values.ts`

### DDL

```sql
CREATE TABLE "report_campaign_default_values" (
    "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaign_id"   uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
    "indicator_id"  uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
    "attribute_id"  uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE RESTRICT,
    "value_text"    text NULL,
    "value_number"  numeric NULL,
    "created_at"    timestamptz NOT NULL DEFAULT now(),
    "updated_at"    timestamptz NULL,
    CONSTRAINT "UQ_campaign_default_values" UNIQUE ("campaign_id", "indicator_id", "attribute_id")
);

CREATE INDEX "IDX_campaign_default_values_campaign"
ON "report_campaign_default_values" ("campaign_id");
```

### Entity cần tạo
- `src/modules/report-campaign/entities/report-campaign-default-value.entity.ts`

Cấu trúc entity:
```
- id: uuid PK
- campaignId: uuid FK (campaign_id)
- indicatorId: uuid FK (indicator_id)
- attributeId: uuid FK (attribute_id)
- valueText: string | null (value_text)
- valueNumber: string | null (value_number, numeric)
- createdAt: Date
- updatedAt: Date | null
- Unique constraint: (campaignId, indicatorId, attributeId)
```

### Lưu ý
- **Không có cột `org_id`** — defaultValue chung cho toàn bộ campaign.
- Đăng ký entity mới trong `report-campaign.module.ts` (TypeOrmModule.forFeature).

---

## Task 3: API CRUD defaultValues cho campaign

### Mô tả
Thêm endpoints để quản lý defaultValues của campaign. Chỉ cho phép khi campaign ở trạng thái `DRAFT`.

### File cần sửa/tạo
- `src/modules/report-campaign/dto/upsert-campaign-default-values.dto.ts` (MỚI)
- `src/modules/report-campaign/report-campaign.service.ts` (thêm hàm)
- `src/modules/report-campaign/report-campaign.controller.ts` (thêm endpoints)

### API endpoints

#### GET /report-campaigns/:id/default-values
- Trả về danh sách defaultValues của campaign.
- Response: `{ items: [{ id, indicatorId, attributeId, valueText, valueNumber }] }`

#### POST /report-campaigns/:id/default-values (upsert bulk)
- Chỉ cho phép khi campaign.status === 'DRAFT'.
- Request body:
```json
{
  "items": [
    {
      "indicatorId": "uuid",
      "attributeId": "uuid",
      "valueText": "string | null",
      "valueNumber": "number | null"
    }
  ]
}
```
- Validation:
  - Campaign phải ở trạng thái DRAFT → nếu không: `CAMPAIGN_NOT_EDITABLE`
  - `indicatorId` phải thuộc template của campaign → nếu không: `INVALID_INDICATORS`
  - `attributeId` phải thuộc template của campaign → nếu không: `INVALID_ATTRIBUTES`
  - Validate `valueText`/`valueNumber` theo `dataType` của cell_config tương ứng:
    - Nếu cell_config.dataType = 'number' → `valueNumber` phải có giá trị hợp lệ
    - Nếu cell_config.dataType = 'text' → `valueText` phải có giá trị
  - Upsert: nếu đã tồn tại (campaign_id, indicator_id, attribute_id) → update giá trị

#### DELETE /report-campaigns/:id/default-values (delete bulk)
- Chỉ cho phép khi campaign.status === 'DRAFT'.
- Request body:
```json
{
  "items": [
    { "indicatorId": "uuid", "attributeId": "uuid" }
  ]
}
```

### Test cases
- [x] Upsert defaultValue khi campaign DRAFT → thành công
- [x] Upsert defaultValue khi campaign DISPATCHED → lỗi CAMPAIGN_NOT_EDITABLE
- [x] Upsert với indicatorId không thuộc template → lỗi INVALID_INDICATORS
- [x] Upsert với attributeId không thuộc template → lỗi INVALID_ATTRIBUTES
- [x] List defaultValues → trả về đúng items
- [x] Delete defaultValues khi DRAFT → thành công

---

## Task 4: Tích hợp defaultValues vào luồng nhập liệu

### Mô tả
Khi đơn vị nhập liệu, hệ thống cần:
1. Trả về defaultValues cùng với dữ liệu biểu mẫu.
2. Chặn nhập liệu vào ô đã có defaultValue.

### File cần sửa
- `src/modules/submission/submission.service.ts`

### 4a. API trả về defaultValues khi xem submission

Sửa hàm `findOne()` để trả thêm defaultValues:

```
1. Từ submission → lấy assignment → lấy campaign_id
2. Query report_campaign_default_values WHERE campaign_id = ?
3. Trả về trong response:
   {
     ...existing fields...,
     defaultValues: [
       { indicatorId, attributeId, valueText, valueNumber }
     ]
   }
```

### 4b. Chặn patchCells vào ô có defaultValue

Sửa hàm `patchCells()`:

```
1. Từ assignment → lấy campaign_id (đã có: a.batchId)
2. Query report_campaign_default_values WHERE campaign_id = a.batchId
3. Tạo Set<string> defaultValueKeys = set("indicatorId:attributeId")
4. Với mỗi change trong dto.changes:
   - Nếu "change.indicatorId:change.attributeId" nằm trong defaultValueKeys:
     → thêm vào validationErrors với code 'CELL_LOCKED_BY_DEFAULT_VALUE'
     → skip, không lưu
```

### Error code
- `CELL_LOCKED_BY_DEFAULT_VALUE`: "Ô này đã có giá trị mặc định từ đợt báo cáo, không được chỉnh sửa"

### Test cases
- [x] Xem submission → response có chứa defaultValues
- [x] patchCells vào ô bình thường → thành công
- [x] patchCells vào ô có defaultValue → lỗi CELL_LOCKED_BY_DEFAULT_VALUE
- [x] patchCells với mix ô bình thường + ô locked → ô bình thường được lưu, ô locked bị skip + trả lỗi

---

## Task 5: Tích hợp defaultValues vào luồng tổng hợp

### Mô tả
Khi tổng hợp dữ liệu, cần merge defaultValues (campaign) + submission_cells (đơn vị nhập).

### File cần sửa
- `src/modules/summary-analytics/summary-analytics-query.service.ts`
- `src/modules/summary-analytics/summary-analytics-summary.service.ts`

### Logic
```
1. Lấy defaultValues từ report_campaign_default_values
2. Lấy submission_cells từ report_submission_cells (chỉ submissions APPROVED)
3. Merge:
   - Ô có defaultValue → dùng giá trị từ campaign
   - Ô có submission_cell → dùng giá trị từ đơn vị
   - Ô có cả hai → defaultValue ưu tiên (vì ô này locked, đơn vị không nhập được)
4. Tổng hợp theo template indicators/attributes
```

### Test cases
- [x] Tổng hợp campaign không có defaultValues → dùng toàn bộ submission_cells
- [x] Tổng hợp campaign có defaultValues → merge đúng, defaultValue ưu tiên

---

## Thứ tự thực hiện

```
Task 1 (template scope enforcement)
  ↓
Task 2 (tạo bảng + entity)
  ↓
Task 3 (API CRUD defaultValues)
  ↓
Task 4 (tích hợp vào submission)
  ↓
Task 5 (tích hợp vào tổng hợp)
```

Task 1 và Task 2 có thể thực hiện song song (không phụ thuộc nhau).
Task 3 phụ thuộc Task 2 (cần bảng + entity).
Task 4 và Task 5 phụ thuộc Task 3 (cần API hoạt động).

---

## Tham chiếu

- Tài liệu phân tích: `docs/PROJECT_ANALYSIS.md`
- Technical spec: `docs/form_template/REPORT_SYSTEM_TECHNICAL_SPEC.md`
- DB ERD: `docs/db/erd.md`
- Campaign business rules: `docs/form_template/REPORT_CAMPAIGN_BUSINESS_FINALIZATION.md`
- Template management spec: `docs/form_template/TEMPLATE_MANAGEMENT_SPEC_AND_PLAN.md`
