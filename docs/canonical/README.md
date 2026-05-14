# KPI System Canonical Docs

Bo tai lieu nay tong hop flow va data model hien tai cua he thong, dua tren:
- `docs/PROJECT_ANALYSIS.md`
- `docs/db/data-flow-guide.md`
- code thuc te trong `src/modules`

Muc tieu:
- Co mot bo tai lieu ngan gon, ro rang, de sua va de tach file.
- Mo ta dung cac tang nghiep vu, luong du lieu, va rang buoc du lieu.
- Lam co so de cap nhat lai `docs/db/*` ve sau.

## Cach doc
Doc theo thu tu sau:
1. `architecture.md` - tong quan kien truc va bounded contexts.
2. `flow.md` - vong doi Template -> Campaign -> Assignment -> Submission -> Summary.
3. `data-contracts.md` - phan biet 3 loai gia tri va quy tac merge.
4. `rules.md` - rang buoc nghiep vu, transaction, audit, idempotency.
5. `schema-map.md` - bang map nhanh giua module va table.
6. `implementation-notes.md` - cac diem code hien tai can luu y.

## Nguyen tac canon
- Template la khung, khong chua du lieu runtime.
- Campaign la ban sao theo ky, co scope va default values.
- Assignment la giao viec cho don vi.
- Submission la du lieu nhap lieu theo assignment.
- Summary la read model tong hop, khong la noi ghi chinh.
- Moi rule nghiep vu quan trong phai co noi enforce ro rang: app, DB, hay ca hai.

## Cau truc file
- Moi file doc dong vai tro rieng.
- Neu can mo rong, tao them file moi thay vi nhung het vao 1 file lon.
- Neu co thay doi lon ve flow, cap nhat `flow.md` va `rules.md` truoc.

