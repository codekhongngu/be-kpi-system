# PLAN 02 — MODULE APPROVAL (Phê Duyệt)

> **Ưu tiên: HIGH** — Làm sau khi Module Submission hoàn thành.
> Backend API: ✅ Sẵn sàng. Frontend: ❌ Chưa có.

---

## 1. Mục Tiêu

Xây dựng giao diện cho **người phê duyệt (Approver role)** tại đơn vị:
1. Xem danh sách bản nộp đang chờ duyệt (`GET /api/v1/approvals/pending`)
2. Xem chi tiết dữ liệu bản nộp (read-only grid)
3. Duyệt báo cáo (`POST /api/v1/approvals/:id/approve`)
4. Từ chối báo cáo với lý do (`POST /api/v1/approvals/:id/reject`)

---

## 2. UI/UX

### 2.1 Trang "Danh sách phê duyệt" — Route: `/approvals`

**Layout:** Table với bộ lọc

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ Phê Duyệt Báo Cáo                                       │
│  Lọc theo: [Đơn vị ▼] [Biểu mẫu ▼] [Kỳ ▼]                 │
├──────┬───────────────┬──────────┬────────────┬──────────────┤
│ Đơn vị│ Biểu mẫu     │ Kỳ       │ Ngày nộp  │ Hành động    │
├──────┼───────────────┼──────────┼────────────┼──────────────┤
│ Xã A │ Thu thuế      │ T5/2026  │ 20/05/2026 │ [Xem] [Duyệt]│
│ Xã B │ Thu thuế      │ T5/2026  │ 22/05/2026 │ [Xem] [Duyệt]│
│ Xã C │ Dân số        │ T5/2026  │ 18/05/2026 │ [Xem] [Duyệt]│
└──────┴───────────────┴──────────┴────────────┴──────────────┘
│ Hiển thị 3/3 bản chờ duyệt                                  │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.2 Trang "Chi tiết phê duyệt" — Route: `/approvals/:submissionId`

**Layout:** Split view hoặc full view với action bar sticky

```
┌─────────────────────────────────────────────────────────────┐
│ ← Quay lại  |  Thu thuế — Xã A — Tháng 5/2026             │
│             |  Ngày nộp: 20/05/2026  |  [ĐANG CHỜ DUYỆT] │
├─────────────────────────────────────────────────────────────┤
│  📊 DỮ LIỆU BÁO CÁO (READ-ONLY)                           │
├──────────────┬────────────┬────────────┬────────────────────┤
│ Chỉ tiêu     │ KH Năm 🔒  │ Tháng TH   │ Lũy kế            │
├──────────────┼────────────┼────────────┼────────────────────┤
│ I. Thu nhập  │            │            │                    │
│  1. Khẩu     │  500,000   │  120,000   │  620,000           │
│  2. Nội địa  │  300,000   │   80,000   │  380,000           │
└──────────────┴────────────┴────────────┴────────────────────┘
│  📝 Ghi chú của đơn vị: "Số liệu tháng 5 bao gồm..."      │
├─────────────────────────────────────────────────────────────┤
│  [✗ Từ chối (nhập lý do)]        [✓ Phê duyệt báo cáo]    │ ← sticky
└─────────────────────────────────────────────────────────────┘
```

**Dialog "Từ chối":**
```
┌──────────────────────────────────┐
│ ✗ Từ Chối Báo Cáo               │
│ Lý do từ chối *                  │
│ [_____________________________]  │
│ [_____________________________]  │
│              [Hủy] [Xác nhận ✗] │
└──────────────────────────────────┘
```

---

## 3. Cấu Trúc File Cần Tạo

```
src/features/approval/
├── api/
│   ├── types.ts                 # TS types
│   └── approval-api.ts          # API wrapper
├── hooks/
│   ├── use-pending-approvals.ts # React Query list
│   └── use-approval-detail.ts   # Detail submission
├── pages/
│   ├── approvals-list-page.tsx  # Danh sách chờ duyệt
│   └── approval-detail-page.tsx # Chi tiết + hành động
├── components/
│   ├── pending-approval-table.tsx    # Table danh sách
│   ├── approval-action-bar.tsx       # Thanh sticky Duyệt/Từ chối
│   ├── reject-dialog.tsx             # Dialog nhập lý do từ chối
│   └── submission-readonly-grid.tsx  # Grid xem dữ liệu (read-only)
└── index.tsx
```

---

## 4. Types (`approval/api/types.ts`)

```typescript
// Item trong danh sách pending
export type PendingApprovalItem = {
  submissionId: string
  submittedAt: string | null
  org: { id: string; code: string; name: string }
  form: { id: string; code: string; name: string }
  period: { type: string; code: string; name: string }
}

// Chi tiết bản nộp để xem khi phê duyệt
// Tái sử dụng SubmissionDetail từ submission module
export type { SubmissionDetail, DefaultValueCell, SubmissionCell } from '@/features/submission/api/types'

export type ApproveResult = {
  status: 'APPROVED'
  approvedAt: string
}

export type RejectResult = {
  status: 'REJECTED'
}
```

---

## 5. API Calls (`approval/api/approval-api.ts`)

```typescript
import { apiClient } from '@/lib/api-client'
import type { PendingApprovalItem, ApproveResult, RejectResult } from './types'

export const approvalApi = {
  // GET /api/v1/approvals/pending
  listPending: (params?: {
    orgId?: string; formId?: string
    periodType?: string; periodCode?: string
    page?: number; limit?: number
  }) =>
    apiClient.get<{ items: PendingApprovalItem[]; meta: { total: number } }>(
      '/approvals/pending', { params }
    ).then(r => r.data),

  // POST /api/v1/approvals/:submissionId/approve
  approve: (submissionId: string) =>
    apiClient.post<ApproveResult>(`/approvals/${submissionId}/approve`, {})
      .then(r => r.data),

  // POST /api/v1/approvals/:submissionId/reject
  reject: (submissionId: string, reason: string) =>
    apiClient.post<RejectResult>(`/approvals/${submissionId}/reject`, { reason })
      .then(r => r.data),
}

// Để load dữ liệu grid → tái sử dụng submissionApi.getOne()
// import { submissionApi } from '@/features/submission/api/submission-api'
```

---

## 6. Logic Quan Trọng

### `approval-detail-page.tsx`
```typescript
// 1. Load thông tin bản nộp (grid data)
const detail = await submissionApi.getOne(submissionId)

// 2. Load cấu trúc biểu mẫu để render grid
const assignment = await assignmentApi.getOne(detail.assignmentId)
const template = await formManagementApi.getTemplate(assignment.formId)
const cellConfigs = await formManagementApi.listEffectiveCellConfigs(assignment.formId)

// 3. Render grid read-only với:
//    - defaultValues (locked, nền vàng)
//    - cells (dữ liệu đơn vị nhập, không cho sửa)

// 4. Handle approve
async function handleApprove() {
  await approvalApi.approve(submissionId)
  toast.success('Đã phê duyệt báo cáo')
  navigate('/approvals')
}

// 5. Handle reject
async function handleReject(reason: string) {
  await approvalApi.reject(submissionId, reason)
  toast.success('Đã từ chối báo cáo')
  navigate('/approvals')
}
```

### `submission-readonly-grid.tsx`

Tái sử dụng `SubmissionGrid` từ module Submission nhưng truyền prop `readOnly={true}`:
- Tất cả ô đều hiển thị giá trị, không có input
- Phân biệt ô `defaultValue` (vàng) vs ô đơn vị nhập (trắng)
- Ô trống hiển thị `—`

---

## 7. Bảng DB Tương Tác

| Hành động | Bảng DB |
|---|---|
| Load danh sách pending | `report_submissions` WHERE status=PENDING + JOIN `report_assignments`, `organizations`, `form_templates` |
| Load chi tiết để duyệt | `report_submissions` + `report_submission_cells` + `report_campaign_default_values` |
| Phê duyệt | UPDATE `report_submissions.status = APPROVED`, ghi `approved_by`, `approved_at` |
| Từ chối | UPDATE `report_submissions.status = REJECTED`, ghi `reject_reason` |
| Thông báo | INSERT `notifications` (gửi cho submitter) |

---

## 8. Checklist

- [ ] `approval/api/types.ts`
- [ ] `approval/api/approval-api.ts`
- [ ] `use-pending-approvals.ts`
- [ ] `approvals-list-page.tsx` với filter + pagination
- [ ] `pending-approval-table.tsx`
- [ ] `approval-detail-page.tsx`
- [ ] `submission-readonly-grid.tsx` (tái sử dụng từ submission module)
- [ ] `approval-action-bar.tsx` (sticky)
- [ ] `reject-dialog.tsx` (form nhập lý do bắt buộc)
- [ ] Đăng ký routes
- [ ] Badge notification trên sidebar (số lượng pending)

---

## 9. Lưu Ý

- Approver chỉ thấy submissions thuộc `org_id` của mình (backend filter tự động).
- Nút "Phê duyệt" phải có confirm bổ sung (tránh click nhầm).
- Lý do từ chối là **bắt buộc** (`required`, min 10 ký tự).
- Sau khi duyệt/từ chối, auto-navigate về danh sách.
- Tái sử dụng `SubmissionGrid` với prop `readOnly` để tránh duplicate code.
