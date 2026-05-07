# REPORT CAMPAIGN - BUSINESS FINALIZATION (v1)

## Muc tieu
Tai lieu nay chot 2 diem nghiep vu:
1. Co ke thua phan bo don vi + chi tieu tu template sang campaign, va cho phep dieu chinh rieng theo campaign.
2. Chot thoi diem sinh assignment: chi sinh sau buoc user confirm cau hinh campaign.

---

## 1) Tra loi cau hoi 1

### Cau hoi
"Template da co phan bo don vi + chi tieu => report_campaign se ke thua va cap nhat rieng cho campaign (neu can)?"

### Tra loi chot
Co. Campaign phai ke thua tu template theo co che snapshot, sau do cho phep override trong pham vi campaign truoc khi xac nhan giao bao cao.

### Ly do
- Template la rule mac dinh dung lai cho nhieu ky.
- Moi ky/campaign co ngoai le thuc te (thay doi don vi tham gia, thay doi pham vi chi tieu).
- Neu khong cho override campaign, user phai sua template, gay anh huong cac ky sau.
- Snapshot campaign giu tinh bat bien lich su, truy vet de audit.

### Ket luan danh gia tai lieu cu
- Huong mo ta truoc da dung y lon (ke thua + co override),
- NHUNG chua chot ro co che snapshot + pham vi duoc override + thoi diem khoa.
Tai lieu nay bo sung day du 3 diem do.

---

## 2) Tra loi cau hoi 2

### Cau hoi
"Sinh assignment khi nao? Can user confirm het cau hinh report_campaign roi moi giao bao cao"

### Tra loi chot
Dung. Assignment chi duoc sinh khi user bam xac nhan giao bao cao (confirm dispatch).

### Danh gia flow nghiep vu
Flow nay tot hon viec sinh assignment som vi:
- Tranh tao assignment rac trong luc user dang chinh campaign.
- Dam bao assignment sinh ra phu hop 100% voi cau hinh da chot.
- De quan tri thay doi (campaign draft cho phep sua, campaign dispatched thi khoa).

---

## 3) Flow nghiep vu chot

1. Tao campaign (status `DRAFT`)
- Chon template + period + deadline + metadata.
- Campaign tu dong ke thua rule phan bo don vi/chi tieu tu template vao bang snapshot campaign.

2. Cau hinh campaign (`DRAFT`)
- User co the them/bot don vi tham gia campaign.
- User co the override pham vi chi tieu theo tung don vi cho campaign nay.
- Rule `UNIQUE`/`AGGREGATE` duoc validate ngay khi sua.

3. Xac nhan giao bao cao (action `CONFIRM_DISPATCH`)
- He thong validate lan cuoi campaign config.
- Neu hop le: sinh assignments hang loat.
- Campaign chuyen status `DISPATCHED` (hoac `ACTIVE` tuy convention).
- Khoa cac truong cau hinh anh huong phan cong (org scope, indicator scope).

4. Don vi nhap lieu / nop / duyet / tong hop
- Theo luong da chot truoc: submission `DRAFT -> PENDING -> APPROVED/REJECTED`.

---

## 4) Thiet ke DB chi tiet cho buoc ke thua + override

## 4.1 Template-level default rule
`form_template_indicator_org_rules`
- `id` (uuid)
- `template_id` (fk -> form_templates)
- `org_id` (fk -> organizations)
- `indicator_id` (fk -> form_template_indicators)
- `is_enabled` (bool, default true)
- `created_at`, `updated_at`
- unique: (`template_id`, `org_id`, `indicator_id`)

Y nghia:
- Rule mac dinh: org nao duoc nhap indicator nao khi tao campaign tu template nay.

## 4.2 Campaign snapshot rule
`report_campaign_indicator_org_scopes`
- `id` (uuid)
- `campaign_id` (fk -> report_campaigns)
- `org_id` (fk -> organizations)
- `indicator_id` (fk -> form_template_indicators)
- `source` (enum: `TEMPLATE_DEFAULT`, `CAMPAIGN_OVERRIDE`, `MANUAL`)
- `created_at`, `updated_at`
- unique: (`campaign_id`, `org_id`, `indicator_id`)

Y nghia:
- Snapshot su dung thuc te cua campaign.
- Duoc copy ban dau tu template rules.
- Cho phep them/xoa/sua trong campaign `DRAFT`.

## 4.3 Campaign master
`report_campaigns`
- `id` (uuid)
- `template_id` (fk)
- `period_type`, `period_code`, `period_name`
- `deadline_from`, `deadline_to`
- `status` (enum: `DRAFT`, `DISPATCHED`, `CLOSED`, `CANCELLED`)
- `dispatched_at`, `dispatched_by`
- `created_at`, `created_by`, `updated_at`
- unique: (`template_id`, `period_type`, `period_code`)

## 4.4 Assignment sau confirm
`report_assignments`
- `id` (uuid)
- `campaign_id` (fk)
- `template_id` (fk, de query nhanh)
- `org_id` (fk)
- `period_type`, `period_code`, `period_name` (snapshot)
- `deadline_from`, `deadline_to` (snapshot)
- `status` (enum: `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`)
- `assigned_at`, `assigned_by`
- unique: (`campaign_id`, `org_id`)

Ghi chu:
- Chi sinh khi campaign confirm dispatch.
- Neu can truy van scope nhanh o cap assignment, co the them bang `report_assignment_indicators` copy tu campaign scope.

---

## 5) Quy tac status va khoa sua

## 5.1 Template
- `DRAFT`, `READY`: cho sua cau truc.
- `IN_USE`: khoa sua cau truc; cho clone.
- `ARCHIVED`: khong tao campaign moi.

## 5.2 Campaign
- `DRAFT`: cho sua org scope, indicator scope, deadline.
- `DISPATCHED`: da sinh assignment, khoa sua scope.
- `CLOSED`: ket thuc ky bao cao.
- `CANCELLED`: huy campaign.

## 5.3 Rule khoa sau confirm
Sau khi `CONFIRM_DISPATCH`:
- Cam sua `report_campaign_indicator_org_scopes`.
- Cam them/bot org tham gia campaign.
- Cam doi `template_id`, `period_type`, `period_code`.
- Cho phep sua metadata nhe (ghi chu) neu can.

---

## 6) Rule theo loai bieu mau

## 6.1 `AGGREGATE`
- Mot indicator co the xuat hien o nhieu org trong cung campaign.

## 6.2 `UNIQUE`
- Mot indicator chi duoc gan cho toi da 1 org trong cung campaign.
- Constraint nghiep vu: unique (`campaign_id`, `indicator_id`) tren bang scope.
- Khi save campaign scope phai validate conflict ngay.

---

## 7) API de xuat (toi thieu)

## 7.1 Campaign
- `POST /report-campaigns` tao DRAFT + snapshot tu template.
- `GET /report-campaigns/:id`
- `PATCH /report-campaigns/:id` (chi DRAFT)

## 7.2 Scope theo campaign
- `GET /report-campaigns/:id/scopes`
- `POST /report-campaigns/:id/scopes` (upsert, chi DRAFT)
- `DELETE /report-campaigns/:id/scopes` (chi DRAFT)

## 7.3 Confirm dispatch
- `POST /report-campaigns/:id/confirm-dispatch`
- Hanh vi:
  1. Validate campaign + scope.
  2. Sinh `report_assignments`.
  3. Update campaign status `DISPATCHED` + `dispatched_at`.
  4. Tao notification cho don vi (neu bat).

---

## 8) Tieu chi chap nhan

1. Tao campaign tu template se copy scope mac dinh vao snapshot campaign.
2. Campaign DRAFT cho phep override scope theo ky.
3. Assignment chua ton tai truoc khi confirm.
4. Sau confirm dispatch, assignment duoc sinh day du theo org scope.
5. Sau confirm, campaign scope bi khoa sua.
6. Rule `UNIQUE` duoc enforce dung.
7. Lich su campaign khong bi anh huong boi sua template ve sau.

---

## 9) Khuyen nghi implementation

1. Giai doan 1
- Bo sung bang scope template + scope campaign.
- Bo sung endpoint confirm dispatch va logic sinh assignment.

2. Giai doan 2
- Them audit event cho cac action: snapshot, override, confirm dispatch.
- Them lich su thay doi scope (neu can compliance).

3. Giai doan 3
- Toi uu tong hop KPI tu assignment/submission den summary.
