# Report Management Design (v1)

## Muc tieu

Thiet ke phan report theo mo hinh:
1. Template la khuon mau.
2. Report la instance theo ky, theo dot giao.
3. Phan quyen theo role: Admin/Manager/Staff.

## Cau truc du lieu de xuat

1. `reports`
- Header cua dot bao cao.
- Truong chinh: `id`, `code`, `template_id`, `period_type`, `period_from`, `period_to`, `deadline_from`, `deadline_to`, `status`, `created_by`.

2. `report_assignments`
- Giao report cho tung don vi/phong ban.
- Truong chinh: `id`, `report_id`, `org_id`, `assignee_scope`, `status`, `assigned_at`.

3. `report_submissions`
- Bai nop cua don vi.
- Truong chinh: `id`, `assignment_id`, `status`, `version`, `submitted_by`, `submitted_at`, `approved_by`, `approved_at`, `reject_reason`.

4. `report_submission_cells`
- Du lieu chi tiet tung o.
- Truong chinh: `submission_id`, `indicator_id`, `attribute_id`, `value`, `value_numeric`, `updated_by`, `updated_at`.

5. `report_submission_cell_history`
- Lich su thay doi tung o.

6. `report_aggregates` (optional)
- Snapshot tong hop theo report de phuc vu dashboard/query nhanh.

## Khi nao tao report

B1. Admin tao dot report (row trong `reports`) tu 1 template.

B2. Admin chon danh sach don vi va thao tac `Giao bao cao`.
- He thong tao `report_assignments`.
- Moi assignment sinh `report_submission` ban dau o trang thai `NOT_STARTED`.

## Trang thai report

### 1) Trang thai dot (`reports.status`)

1. `DRAFT`
- Moi tao dot, chua giao.

2. `ASSIGNED`
- Da giao it nhat 1 don vi.

3. `IN_PROGRESS`
- Da co submission dang nhap hoac da nop.

4. `APPROVAL_IN_PROGRESS`
- Co submission dang cho phe duyet.

5. `COMPLETED`
- Tat ca submission da ket thuc (approved/locked theo policy).

6. `CANCELLED`
- Huy dot.

### 2) Trang thai bai nop (`report_submissions.status`)

1. `NOT_STARTED`
2. `DRAFT`
3. `SUBMITTED`
4. `UNDER_REVIEW`
5. `APPROVED`
6. `REJECTED`
7. `OVERDUE`
8. `LOCKED`

## Rule giao bao cao

Chi cho phep giao khi:
1. Report dang `DRAFT`.
2. Template dang `READY` hoac `IN_USE`.
3. Co ky bao cao + han nop hop le.
4. Co it nhat 1 don vi nhan giao.

## Rule nop/phe duyet

1. Staff duoc sua khi submission o `DRAFT` hoac `REJECTED`.
2. Submit -> `SUBMITTED`.
3. Nguoi phe duyet mo xu ly -> `UNDER_REVIEW`.
4. Approve -> `APPROVED`.
5. Reject -> `REJECTED` + ly do.
6. Qua han va chua nop -> `OVERDUE`.

## FE menu va pages

Menu cha duy nhat: `Quan ly bao cao`

Co 1 trang list chung, tach theo tab hoac submenu logic:
- `Tat ca`
- `Chua nop`
- `Cho duyet`
- `Da duyet`
- `Bi tra lai`
- `Qua han`

### Phan quyen hien thi tab

1. Admin
- Thay tat ca tabs.
- Scope toan he thong hoac pham vi duoc cap.

2. Manager/Approver
- Thay: `Tat ca`, `Cho duyet`, `Da duyet`, `Bi tra lai`, `Qua han`.
- Co the an `Chua nop` neu khong can theo doi nhap lieu chi tiet.

3. Staff
- Thay: `Tat ca`, `Chua nop`, `Bi tra lai`, `Qua han`, `Da duyet` (read-only ket qua).
- `Cho duyet` co the an vi khong phai vai tro phe duyet.

## Cac page con va noi dung hien thi

### A. Page list chung (tat ca tabs)

Cot co ban:
1. Ma report / ten report
2. Don vi
3. Ky bao cao
4. Han nop
5. Trang thai submission
6. Muc do hoan thanh
7. Nguoi cap nhat cuoi
8. Updated at
9. Actions

Filter chung:
1. Ky
2. Template
3. Don vi
4. Trang thai
5. Tu khoa

### B. Action theo role tren list

1. Admin
- `Tao dot bao cao`
- `Giao bao cao`
- `Thu hoi giao` (neu cho phep)
- `Mo khoa/Chot dot`
- `Xem chi tiet`
- `Phe duyet` (neu kiem nhiem)

2. Manager/Approver
- `Xem chi tiet`
- `Phe duyet`
- `Tra lai`
- `Xem lich su thay doi`

3. Staff
- `Nhap bao cao`
- `Luu nhap`
- `Nop bao cao`
- `Xem ly do tra lai`
- `Xem lich su`

## UX de xuat cho tabs

1. Su dung 1 route chung: `/reports`.
2. Trang thai tab map vao query string: `?tab=cho-duyet`.
3. Moi role co default tab:
- Admin: `tat-ca`
- Approver: `cho-duyet`
- Staff: `chua-nop`

4. Header action context-aware:
- Khi tab `cho-duyet` => uu tien nut phe duyet nhanh.
- Khi tab `chua-nop` (staff) => uu tien nut nhap bao cao.

## Khuyen nghi thuc te

1. Gop 1 page + tabs la cach phu hop nhieu du an vi:
- Don gian dieu huong.
- Giam trung lap page.
- De quan ly filter/saved view theo role.

2. Khong nen tach qua nhieu menu nho, de tranh nguoi dung bi lac.

3. Van can RBAC o backend cho moi action, khong chi an/hien tren FE.
