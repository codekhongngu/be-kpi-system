# Data Contracts

## 1. Ba loai gia tri can phan biet

### 1.1 Template cell config
Bang: `form_template_cell_configs`

Vai tro:
- Dinh nghia quy tac cua 1 o.
- Cho biet o co editable khong, validate nhu the nao.
- Ap dung chung cho moi campaign va moi don vi.

Quan diem:
- Khong phai du lieu runtime.
- Khong gan theo `org_id`.

### 1.2 Campaign default value
Bang: `report_campaign_default_values`

Vai tro:
- Gia tri dien san do nguoi tao campaign cung cap.
- Ap dung chung cho toan bo campaign.
- Khong co `org_id`.

Quan diem:
- O co default value se bi lock o runtime.
- Default value co uu tien cao hon submission cell trong summary.

### 1.3 Submission cell
Bang: `report_submission_cells`

Vai tro:
- Gia tri thuc te do don vi nhap.
- Gan voi `submission_id`.
- La du lieu cap nhat lien tuc trong qua trinh nhap lieu.

Quan diem:
- Chi cho phep ghi khi submission con o trang thai mo.
- Phai validate theo cell config va scope.
- Khong duoc ghi de len o da bi default value lock.

## 2. Merge order

Thu tu su dung du lieu trong summary:
1. Lay submission cells hop le da duyet.
2. Cong don neu la numeric.
3. Overlay default values cua campaign len tren neu o nao co gia tri dien san.

Neu co default value:
- Gia tri co san luon win.
- Khong cho submission ghi de.

## 3. Validation contract

### Template cell config
- `dataType` quyet dinh kieu value.
- `isRequired` quyet dinh bat buoc nhap.
- `validationRule` quyet dinh range / pattern / other business checks.

### Campaign default value
- Validate theo `dataType` cua cell config.
- Luon validate o level campaign, khong dua vao org.

### Submission cell
- Validate theo scope + cell config + trang thai submission.
- Neu o da co default value thi reject.

## 4. Scope contract

### Template scope
- Dinh nghia bo mac dinh org-indicator.
- Dung de snapshot sang campaign.

### Campaign scope
- La scope that su dung khi dispatch va nhap lieu.
- Co the override khi campaign con `DRAFT`.
- Sau dispatch thi khong con duoc sua.

## 5. Numeric and text model
- `value_text` dung cho text.
- `value_number` dung cho so.
- Cac bang can luu ca 2 truong neu co the phat sinh luu so.
- Khi tinh tong hop, numeric phai uu tien numeric projection thay vi parse text.

## 6. Implementation rule
- Template khong luu runtime value.
- Campaign luu shared default value.
- Submission luu per-org fact value.
- Summary luu derived read model.
