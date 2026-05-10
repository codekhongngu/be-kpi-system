# PLAN INDEX — Kế Hoạch Triển Khai Các Module Còn Lại

> Tạo ngày: 2026-05-10
> Trạng thái: Template + Campaign đã hoàn thành ✅

---

## Tổng Quan Thứ Tự Thực Hiện

```
plan-01-submission-module.md  ← LÀM TRƯỚC (bottleneck)
        ↓
plan-02-approval-module.md    ← LÀM SAU khi Submission xong
        ↓
plan-03-admin-monitoring.md   ← LÀM SONG SONG với Approval
        ↓
plan-04-analytics-module.md   ← LÀM CUỐI (cần có data thật)
```

---

## Tóm Tắt Từng Plan

| File | Module | Ưu tiên | BE | FE | Mô tả |
|------|--------|---------|----|----|-------|
| `plan-01` | Submission (Nhập liệu) | 🔴 HIGHEST | ✅ Done | ❌ Todo | Trang giao việc + trang nhập liệu ma trận + auto-save + nộp báo cáo |
| `plan-02` | Approval (Phê duyệt) | 🟡 HIGH | ✅ Done | ❌ Todo | Danh sách chờ duyệt + xem dữ liệu + approve/reject |
| `plan-03` | Admin Monitoring | 🟡 HIGH | ✅ Done | ❌ Todo | Tab "Tiến độ" trong Campaign Details + drawer xem dữ liệu đơn vị |
| `plan-04` | Analytics (Tổng hợp) | 🟢 LOW | ⚠️ Partial | ❌ Todo | Dashboard KPI + bản tổng hợp + tra cứu + export |

---

## Hướng Dẫn Cho AI Thực Thi

Mỗi file plan chứa:
- **Mục tiêu** — Ai dùng, dùng để làm gì
- **UI/UX đề xuất** — Layout ASCII + mapping trạng thái
- **Cấu trúc file** — Danh sách file cần tạo + vị trí
- **Types** — TypeScript interfaces cần định nghĩa
- **API Calls** — Wrapper functions với đúng endpoint BE
- **Logic quan trọng** — Code mẫu cho phần phức tạp
- **Bảng DB** — Bảng nào được tác động
- **Checklist** — Danh sách task checkbox
- **Lưu ý** — Edge cases quan trọng

---

## Context Chung Cho Tất Cả Plans

### Tech Stack FE
- React + TypeScript
- React Query (`@tanstack/react-query`) cho data fetching
- `apiClient` từ `@/lib/api-client` (axios wrapper)
- Shadcn/UI components
- Sonner cho toast notifications

### Patterns Hiện Có (Tái Sử Dụng)
- `TemplateMatrixGrid` — Grid ma trận chỉ tiêu × thuộc tính
  - Path: `src/features/form-management/components/shared/template-matrix-grid`
- `formManagementApi` — API calls cho template
  - Path: `src/features/form-management/api/template-management-api`
- `reportCampaignApi` — API calls cho campaign
  - Path: `src/features/report-management/api/report-management-api`

### Backend Base URL
```
/api/v1  (đã configured trong apiClient)
```

### Endpoints Tổng Hợp

| Plan | Endpoint | Method |
|------|----------|--------|
| 01 | `/my/assignments` | GET |
| 01 | `/submissions` | POST |
| 01 | `/submissions/:id` | GET |
| 01 | `/submissions/:id/cells` | PATCH |
| 01 | `/submissions/:id/submit` | POST |
| 02 | `/approvals/pending` | GET |
| 02 | `/approvals/:id/approve` | POST |
| 02 | `/approvals/:id/reject` | POST |
| 03 | `/query/reports` | GET |
| 04 | `/analytics/kpis` | GET |
| 04 | `/summaries` | GET, POST |
| 04 | `/summaries/:id` | GET |
| 04 | `/summaries/:id/recompute` | POST |
