# Form Template Design

## Pham vi

Tinh nang nay chi xu ly buoc thiet ke bo khung bieu mau. Template khong luu gia tri nhap lieu, khong luu default value theo ky, va khong cau hinh tung cell trong ma tran.

Gia tri mac dinh, override theo phong ban, theo ky, hoac theo lan giao bao cao se duoc xu ly o buoc tao thuc the bao cao tu template.

## Mo hinh nghiep vu

Mot bieu mau gom hai cum cau hinh chinh:

1. Chi tieu
2. Thuoc tinh

Chi tieu va thuoc tinh deu co:

1. Phan cap bang `parentId`
2. Thu tu hien thi bang `sortOrder`
3. Metadata nhap lieu co ban

Khi hien thi preview, he thong tao ma tran doc tu danh sach chi tieu va ngang tu danh sach thuoc tinh. Cac cell trong ma tran chi la ket qua hien thi cua hai cum cau hinh, khong phai thuc the cau hinh rieng trong phase nay.

## Metadata cap node

Metadata duoc luu truc tiep tren chi tieu hoac thuoc tinh:

1. `dataType`: kieu du lieu mac dinh
2. `unit`: don vi tinh, ap dung cho chi tieu
3. `isRequired`: bat buoc nhap
4. `isReadonly`: chi doc
5. `validationRule`: rule co ban dang JSON

`validationRule` chi nen luu rule don gian, vi du:

```json
{
  "min": 0,
  "max": 100,
  "pattern": "^[0-9]+$",
  "message": "Gia tri khong hop le"
}
```

Khong nen luu default value o template, vi default value phu thuoc vao ky bao cao, don vi duoc giao, va ngu canh giao bao cao.

## Khong dung cell_config trong phase nay

Khong tao bang `cell_config` cho buoc thiet ke template vi:

1. Da so cell la nhap so.
2. Don vi tinh nam o cap chi tieu.
3. Thuoc tinh va chi tieu da du metadata de render input co ban.
4. Cau hinh tung cell lam tang do phuc tap cho ca BE, FE va UX.
5. Cac override chi tiet phu thuoc vao report instance, khong phu hop luu tren template tinh.

Neu sau nay phat sinh yeu cau cell dac thu theo giao diem chi tieu x thuoc tinh, co the bo sung sau bang mo hinh override:

`cell override > row rule > column rule > template default`

## API toi thieu

### List / detail form

`GET /forms`

Tra ve danh sach template va metadata chung.

`GET /forms/:id`

Tra ve:

1. Thong tin form
2. Danh sach `attributes`
3. Danh sach `indicators`

### Thuoc tinh

`GET /forms/:formId/attributes`

`POST /forms/:formId/attributes`

`PATCH /forms/:formId/attributes/:attributeId`

`DELETE /forms/:formId/attributes/:attributeId`

Payload chinh:

```json
{
  "parentId": null,
  "name": "Gia tri",
  "dataType": "number",
  "isRequired": true,
  "isReadonly": false,
  "sortOrder": 1,
  "validationRule": {
    "min": 0
  }
}
```

### Chi tieu

`GET /forms/:formId/indicators`

`POST /forms/:formId/indicators`

`PATCH /forms/:formId/indicators/:indicatorId`

`DELETE /forms/:formId/indicators/:indicatorId`

Payload chinh:

```json
{
  "parentId": null,
  "code": "CT001",
  "name": "Tong so",
  "unit": "Nguoi",
  "dataType": "number",
  "isRequired": true,
  "isReadonly": false,
  "sortOrder": 1,
  "validationRule": {
    "min": 0
  }
}
```

### Reorder

`POST /forms/:formId/attributes/reorder`

`POST /forms/:formId/indicators/reorder`

Payload:

```json
{
  "items": [
    {
      "id": "uuid",
      "parentId": null
    }
  ]
}
```

BE cap nhat lai `sortOrder` theo thu tu trong payload cho tung nhom cung `parentId`.

## FE behavior

Man hinh cau hinh template chi hien thi hai block:

1. Chi tieu
2. Thuoc tinh

Moi block ho tro:

1. Them node
2. Sua node
3. Xoa node
4. Keo tha doi thu tu trong cung cap
5. Doi cap cha khi thao tac reparent duoc UI cho phep

Preview khong nam trong layout chinh. FE cung cap nut `Xem preview` de mo dialog rieng, render ma tran tu state hien tai cua chi tieu va thuoc tinh.

## Buoc giao bao cao

Khi giao bao cao, he thong chon:

1. Template
2. Ky bao cao
3. Don vi phong ban
4. Pham vi chi tieu neu can

Luc nay moi tao report instance va cau hinh chi tiet:

1. Default value
2. Override readonly / required
3. Override validation
4. Pham vi duoc nhap lieu

Template luon giu vai tro bo khung dung chung.
