# Form Template Design (v3 - Lock & Clone)

## Scope

Tai lieu nay chot mo hinh `template` la khuon mau, `report` la instance duoc tao tu template.

Quyet dinh nghiep vu da chot:
1. Template da phat sinh report thi KHONG cho sua cau truc.
2. Neu can thay doi, dung API `clone` de tao template moi.
3. Khong su dung `template_version` o giai doan hien tai.

## Khai niem

1. `form_template`
- Dung de thiet ke bo khung ma tran (indicators x attributes).
- Khong luu du lieu bao cao thuc te.
- Co the co `cell_config` mac dinh cho o dac thu.

2. `report`
- La dot bao cao su dung 1 template cu the.
- Duoc giao cho phong ban/don vi.
- Co du lieu nhap lieu, phe duyet, audit.

## Template workflow

1. Tao template (`DRAFT`).
2. Cau hinh chi tieu, thuoc tinh, cong thuc, cell override (neu can).
3. Chuyen sang `READY`.
4. Khi admin tao dot bao cao dau tien tu template -> template chuyen `IN_USE`.
5. Template `IN_USE` bi khoa sua cau truc.
6. Neu can doi cau truc:
- `POST /forms/{id}/clone`
- Sua tren template clone.

## Template status

1. `DRAFT`
- Dang thiet ke, cho phep sua/xoa.

2. `READY`
- Da du dieu kien su dung, cho phep tao report.

3. `IN_USE`
- Da co report phat sinh, khoa sua cau truc.
- Cho phep clone.

4. `ARCHIVED`
- Ngung su dung cho dot moi.

## Rule chinh

1. Tao report chi tu template `READY` hoac `IN_USE` (neu van cho phep tai su dung).
2. Template da co report:
- Cam sua indicators/attributes/cell-config cau truc.
- Cam reorder cau truc.
- Cho phep doi trang thai va clone.

3. Data type hien tai
- `number`
- `text`

4. Formula
- Ho tro `+ - * /` va ngoac.
- Validate syntax/reference/cycle truoc khi luu.

## Cell config strategy

Mac dinh config den tu indicator + attribute.

Chi khi can logic dac biet moi tao override cell.

Thu tu uu tien resolve:
`cell override > indicator/attribute default > system default`

## API chinh

### Template
- `GET /forms`
- `GET /forms/{id}`
- `POST /forms`
- `PATCH /forms/{id}` (chi khi template chua bi khoa)
- `POST /forms/{id}/clone`
- `POST /forms/{id}/activate|deactivate`

### Indicators/Attributes
- CRUD + reorder (chi khi template chua bi khoa)

### Cell configs
- `GET /forms/{id}/cell-configs`
- `GET /forms/{id}/cell-configs/effective`
- `POST /forms/{id}/cell-configs` (upsert batch)
- `DELETE /forms/{id}/cell-configs` (batch)

### Formula
- `POST /forms/{id}/indicators/formula/validate`

## FE notes

1. Form tao indicator/attribute
- Khong nhap `sortOrder` tay.
- Parent selector co search.

2. Cell config
- Cau hinh o man hinh preview (chon 1 cell hoac nhieu cell).
- To mau nhom override giong nhau de de quan sat.

3. Template lock UX
- Hien badge `Da phat sinh bao cao - chi duoc clone`.
- An/disable nut sua cau truc.
