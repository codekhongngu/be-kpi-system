# Form Template Design (v2)

## Scope

Tai lieu nay cap nhat thiet ke end-to-end cho tinh nang tao bieu mau + tao report instance + nhap lieu.

Muc tieu:
1. Chuan hoa workflow Admin/Manager/Staff/System.
2. Gioi han data type trong phase hien tai: `number` va `text`.
3. Ho tro cong thuc o muc co ban: `+ - * /` (co ngoac).
4. Co `template_version` de snapshot, tranh vo du lieu cu khi template bi sua.
5. Ho tro `CellConfig` cho mot so o dac biet.

## Workflow nghiep vu

1. Admin (thiet ke template)
- Dinh nghia cau truc `X x Y`:
  - Hang: `indicators`
  - Cot: `attributes`
- Cau hinh metadata co ban cho indicator/attribute (`dataType`, `validation`).
- Cau hinh cong thuc cho cac o tinh toan (neu co).
- Publish thanh mot `template_version`.

2. Manager (tao report instance)
- Chon `template_id` + `template_version` de tao instance.
- Nhap `default_value` theo ky/lan giao bao cao.
- Khoa cell can khoa (`is_editable = false`).
- Override validation cho cell dac thu (neu can).

3. Staff (Xa)
- Nhap lieu vao cac cell con editable.
- Submit bao cao.

4. System
- Validate type + rule + required.
- Tinh cong thuc theo dependency graph.
- Luu lich su thay doi cell (audit trail).
- Bao toan snapshot theo `template_version` cua instance.

## Boundary giua Template va Instance

1. Template layer
- Dinh nghia bo khung dung chung.
- Luu cong thuc mac dinh va metadata mac dinh.
- Khong luu gia tri thuc te theo ky.

2. Report instance layer
- Luu default value theo dot giao bao cao.
- Luu lock/editable theo dot.
- Luu override validation theo dot.
- Luu du lieu nhap lieu + history.

Nguyen tac uu tien khi resolve config:
`instance cell override > template cell default > row/column metadata default`

## Data type va validation

1. Data type cho phase hien tai
- `number`
- `text`

2. Validation support
- `min`, `max`: ap dung cho `number`
- `regex`: ap dung cho `text` (co the allow cho number text mode neu can)
- `required`: co the dat o row/column va override o cell

## CellConfig

Interface chuan:

```ts
interface CellConfig {
  indicator_id: string
  attribute_id: string
  is_editable: boolean
  validation?: {
    min?: number
    max?: number
    regex?: string
  }
  default_value: string | null
}
```

Khuyen nghi mo rong nhe de du dung:

```ts
interface CellConfigExt extends CellConfig {
  data_type?: "number" | "text"
  is_required?: boolean
  formula?: string
}
```

## Formula engine (simple)

1. Syntax
- Chi ho tro `+ - * /` va ngoac.
- Khong ho tro function nang cao trong phase nay.

2. Reference
- Formula tham chieu bang `cell_key` (`indicator_id + attribute_id`) hoac alias map sang key.
- Khong su dung `eval` string truc tiep.

3. Rules
- Cam cycle (A phu thuoc B, B phu thuoc A).
- O cong thuc mac dinh `is_editable = false`.
- Chia 0 => tra error `FORMULA_DIV_BY_ZERO`.
- Thieu operand => tra `FORMULA_MISSING_OPERAND`.

4. Recompute
- Recompute incremental theo dependency graph khi cell input thay doi.
- Co cache graph theo `template_version`.

## Template versioning va snapshot

1. Bang/chung tu can co
- `forms` + `form_template_versions`
- `form_version_indicators`
- `form_version_attributes`
- `form_version_cell_configs` (neu co)

2. Quy tac
- Moi lan publish tao version moi (v1, v2, ...).
- Assignment/report instance phai tro den 1 version cu the.
- Khong doc dynamic theo latest khi mo submission cu.

3. Loi ich
- Bao cao cu khong vo khi template thay doi.
- De truy vet va audit.

## API de xuat (BE)

### Form designer

- `POST /forms/{id}/publish`
  - Tao `template_version` moi.

- `GET /forms/{id}/versions`
  - Liet ke cac version.

- `GET /forms/{id}/versions/{version}`
  - Detail snapshot version.

### Indicator/Attribute CRUD

- `POST /forms/{id}/indicators`
- `PATCH /forms/{id}/indicators/{indicatorId}`
- `POST /forms/{id}/attributes`
- `PATCH /forms/{id}/attributes/{attributeId}`

Rule UI/BE cho `sortOrder`:
- Khong nhap tay `sortOrder` tren form tao moi.
- BE tu gan `sortOrder = max(sibling.sortOrder) + 1` khi create.
- Reorder van dung endpoint rieng.

### Cell config + formula

- `PUT /forms/{id}/cell-configs` (template default)
- `POST /forms/{id}/formula/validate`
  - Validate syntax + reference + cycle preview.

### Assignment/instance

- `POST /assignments`
  - Bat buoc truyen `templateVersion`.

- `POST /submissions`
  - Snapshot config tu assignment.

- `PATCH /submissions/{id}/cells`
  - Validate + recompute formula + save history.

- `GET /submissions/{id}/history`
  - Tra audit trail o muc cell.

## Backend processing requirements

1. Khi tao indicator/attribute
- Validate `parentId` cung form.
- Tu sinh `sortOrder`.

2. Khi validate formula
- Parse expression.
- Check referenced cell ton tai trong ma tran.
- Build dependency graph + detect cycle.

3. Khi patch cells
- Check editable.
- Check datatype + validation.
- Upsert `report_data`.
- Insert `report_data_history`.
- Recompute formula cells phu thuoc.
- Tang `submission.version`.

4. Khi submit
- Validate required truoc transition `DRAFT/REJECTED -> PENDING`.

## Frontend requirements

1. Form tao Chi tieu/Thuoc tinh
- Khong hien field `sortOrder`.
- `sortOrder` do BE cap khi submit.

2. Field `parent`
- Dung searchable select (typeahead) de tim nhanh node cha.
- Hien thi label dang cay de tranh trung ten.

3. Formula UX
- O nhap formula co helper syntax (`+ - * / ()`).
- Co danh sach cell co the chen nhanh vao expression.
- Nut `Preview validate` goi API validate truoc khi luu.
- Hien thi loi theo nhom:
  - syntax error
  - missing reference
  - cyclic dependency
  - divide by zero risk (neu detect duoc)

4. Preview ma tran
- Dialog preview render theo state hien tai.
- Hien thi badge:
  - editable / locked
  - has formula
  - data type

## Error code toi thieu

- `FORMULA_INVALID_SYNTAX`
- `FORMULA_REFERENCE_NOT_FOUND`
- `FORMULA_CYCLE_DETECTED`
- `FORMULA_DIV_BY_ZERO`
- `CELL_NOT_EDITABLE`
- `CELL_VALIDATION_ERROR`
- `SUBMISSION_VERSION_MISMATCH`
- `TEMPLATE_VERSION_REQUIRED`

## Migration strategy

1. Phase 1
- Add `template_version` support.
- Add API publish/list version.
- Enforce assignment phai co version.

2. Phase 2
- Add `cell_config` table (template default + instance override).
- Add formula validate API.

3. Phase 3
- Add recompute engine + dependency cache + monitoring.

## Non-goals (phase hien tai)

- Khong ho tro function nang cao (SUMIF, IF, LOOKUP...).
- Khong ho tro script formula tu do.
- Khong ho tro data type khac ngoai `number`, `text`.
