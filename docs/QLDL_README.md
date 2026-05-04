# QLDL — Bộ tài liệu hệ thống (tổng hợp)

Tài liệu này tổng hợp các phân tích/đề xuất kỹ thuật cho **Hệ thống Quản lý Dữ liệu Điều hành Nội bộ cấp Xã (QLDL)** dựa trên:

- Đặc tả chức năng QLDL v2.0
- Use case chi tiết
- Cấu trúc Database v1.0 (14 bảng core)

> Lưu ý: Repo cũng có các tài liệu boilerplate tổng quát trong `docs/BACKEND_*`. Bộ `QLDL_*` ở đây là **đặc thù nghiệp vụ QLDL** và **không thay thế** các tài liệu boilerplate, nhưng là nguồn “source of truth” cho triển khai QLDL.

## Mục lục tài liệu (gộp theo 4 cụm)

1. `QLDL_CLUSTER_01_OVERVIEW_RBAC_TRACEABILITY.md` — tổng quan + RBAC + traceability
2. `QLDL_CLUSTER_02_API_CONTRACTS.md` — API spec + DTO + validate/errors + backend flows + query (QRY-01)
3. `QLDL_CLUSTER_03_DATA_MODEL.md` — DB schema + mapping API ↔ DB
4. `QLDL_CLUSTER_04_DOMAIN_RULES_NFR.md` — state machines + consolidation rules + NFR/ops

## Quy ước chung (để dev align)

- **Base path**: `/api/v1`
- **Auth header**: `Authorization: Bearer <accessToken>`
- **Envelope**:
  - Success: `{ data, meta?, error: null }`
  - Fail: `{ data: null, error: { code, message, details? } }`

## Trạng thái báo cáo (submission)

Theo tài liệu nghiệp vụ:

- `DRAFT` → `PENDING` → `APPROVED` / `REJECTED`
- `OVERDUE` là trạng thái/hiển thị theo hạn (tuỳ implement: lưu DB hay tính runtime)

## Ghi chú triển khai

- **Async email/notification**: nên queue ngoài DB; DB lưu `notifications` + retry metadata.
- **Audit**: ghi `audit_logs` cho các hành động nhạy cảm (login/logout/export/approve/reject/assignment changes/password).
- **Lĩnh vực biểu mẫu (backend repo)**: bảng `field_categories` + API `GET/POST/PATCH /field-categories`; tạo/sửa biểu mẫu dùng `fieldCategoryId` (UUID). Chi tiết DTO/endpoint trong **Cụm 2**; schema trong **Cụm 3**. Collection Postman gốc `postman.json` có nhóm request tương ứng.
