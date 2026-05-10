# PLAN 01 — MODULE SUBMISSION (Nhập Liệu)

> **Ưu tiên: HIGHEST** — Module bottleneck, phải làm trước tất cả.
> Backend API: ✅ Sẵn sàng. Frontend: ❌ Chưa có.

---

## 1. Mục Tiêu

Xây dựng giao diện cho **nhân viên nhập liệu của đơn vị cấp xã/phường**:
1. Xem danh sách báo cáo được giao (`GET /api/v1/my/assignments`)
2. Bắt đầu / tiếp tục nhập liệu (ma trận Chỉ tiêu × Thuộc tính)
3. Auto-save nháp khi nhập (`PATCH /api/v1/submissions/:id/cells`)
4. Nộp báo cáo (`POST /api/v1/submissions/:id/submit`)

---

## 2. UI/UX

### 2.1 Trang "Danh sách giao việc" — Route: `/my/assignments`

**Layout:** List cards với tab filter ở trên

```
┌───────────────────────────────────────────────────────┐
│  📋 Báo cáo của tôi             [🔍 Tìm kiếm]       │
│  [Tất cả] [Chưa nộp] [Chờ duyệt] [Đã duyệt] [Quá hạn]│
├───────────────────────────────────────────────────────┤
│  📄 Thu thuế — Tháng 5/2026                          │
│     Hạn: 31/05/2026   [● Đang nhập - 60%]           │
│                        [Tiếp tục nhập →]              │
├───────────────────────────────────────────────────────┤
│  📄 Dân số — Tháng 5/2026                            │
│     Hạn: 31/05/2026   [○ Chưa mở]                   │
│                        [Bắt đầu nhập liệu →]         │
├───────────────────────────────────────────────────────┤
│  📄 Đất đai — Tháng 4/2026                           │
│     Hạn: 15/05/2026   [✓ Đã duyệt]                  │
│                        [Xem chi tiết →]              │
└───────────────────────────────────────────────────────┘
```

**Mapping trạng thái card:**

| `submission` | Nhãn | Màu | Nút hành động |
|---|---|---|---|
| `null` | Chưa mở | Grey | "Bắt đầu nhập liệu" |
| `DRAFT` | Đang nhập (+ %) | Blue | "Tiếp tục nhập liệu" |
| `PENDING` | Chờ duyệt | Orange | "Xem chi tiết" |
| `REJECTED` | Bị trả lại | Red | "Sửa và nộp lại" |
| `APPROVED` | Đã duyệt | Green | "Xem chi tiết" |

---

### 2.2 Trang "Nhập liệu" — Route: `/my/assignments/:assignmentId/input`

**Layout:** Fullscreen ma trận với toolbar sticky phía dưới

```
┌─────────────────────────────────────────────────────────┐
│ ← Quay lại  |  Thu thuế - T5/2026  |  [● Đang nhập]  │
│             |  Hạn: 31/05/2026      |  Hoàn thành: 60%│
├───────────────────────────────────────────────────────  │
│  ⚠ Các ô nền vàng được admin điền sẵn, không thể sửa. │
├──────────────┬───────────┬───────────┬─────────────────┤
│ Chỉ tiêu     │ KH Năm 🔒 │ Tháng TH  │ Lũy kế 🔄      │
├──────────────┼───────────┼───────────┼─────────────────┤
│ I. Thu nhập  │           │           │                 │  ← TITLE (bold, no input)
│  1. Khẩu     │ 500,000   │ [______]  │  =auto calc     │
│  2. Nội địa  │ 300,000   │ [______]  │  =auto calc     │
├──────────────┼───────────┼───────────┼─────────────────┤
│ II. Chi tiêu │           │           │                 │  ← TITLE
│  3. Lương    │           │ [______]  │                 │
└──────────────┴───────────┴───────────┴─────────────────┘
│          [Lưu nháp]              [Nộp báo cáo →]       │ ← sticky
└─────────────────────────────────────────────────────────┘
```

**Quy tắc render ô:**

| Điều kiện | Hiển thị | Cho sửa? | Style |
|---|---|---|---|
| `indicator.type === 'TITLE'` | Text tiêu đề, colspan toàn hàng | ❌ | Bold, bg khác |
| Ô có trong `defaultValues` | Giá trị admin điền, icon 🔒 | ❌ | Nền vàng nhạt |
| Ô `cell_config.formula` tồn tại | Giá trị tự động, icon 🔄 | ❌ | Nền xanh nhạt |
| Ô bình thường thuộc scope | Input (number hoặc text) | ✅ | Border focus |
| Ô không thuộc scope | Ẩn hoặc disabled | ❌ | Nền xám |

---

## 3. Cấu Trúc File Cần Tạo

```
src/features/submission/
├── api/
│   ├── types.ts                    # TS types
│   └── submission-api.ts           # API wrapper
├── hooks/
│   ├── use-my-assignments.ts       # React Query list
│   └── use-submission.ts           # Detail + patch + version
├── pages/
│   ├── my-assignments-page.tsx     # Danh sách giao việc
│   └── submission-input-page.tsx   # Trang nhập liệu
├── components/
│   ├── assignment-card.tsx         # Card 1 giao việc
│   ├── assignment-status-badge.tsx # Badge trạng thái
│   ├── submission-grid.tsx         # Ma trận chỉ tiêu × thuộc tính
│   ├── submission-cell.tsx         # Ô đơn lẻ (4 loại)
│   ├── submission-toolbar.tsx      # Thanh sticky (lưu + nộp)
│   └── submit-confirm-dialog.tsx   # Hộp thoại xác nhận nộp
└── index.tsx
```

---

## 4. Types (`submission/api/types.ts`)

```typescript
export type MyAssignment = {
  assignmentId: string
  deadlineTo: string
  form: { id: string; code: string; name: string }
  period: { type: string; code: string; name: string }
  submission: {
    id: string
    status: SubmissionStatus
    completionPct: number | null
  } | null
}

export type SubmissionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'

export type SubmissionDetail = {
  id: string
  code: string
  assignmentId: string
  status: SubmissionStatus
  version: number
  note: string | null
  rejectReason: string | null
  completionPct: number | null
  submittedAt: string | null
  defaultValues: DefaultValueCell[]
  cells: SubmissionCell[]
}

export type DefaultValueCell = {
  indicatorId: string
  attributeId: string
  valueText: string | null
  valueNumber: number | null
}

export type SubmissionCell = {
  indicatorId: string
  attributeId: string
  valueText: string | null
  valueNumeric: number | null
  updatedBy: string | null
  updatedAt: string
}

export type CellChange = {
  indicatorId: string
  attributeId: string
  valueText?: string | null
  valueNumeric?: number | null
}

export type PatchCellsResult = {
  saved: number
  version: number
  validationErrors: { indicatorId: string; attributeId: string; code: string; message: string }[]
}
```

---

## 5. API Calls (`submission/api/submission-api.ts`)

```typescript
import { apiClient } from '@/lib/api-client'
import type { MyAssignment, SubmissionDetail, CellChange, PatchCellsResult } from './types'

export const submissionApi = {
  // GET /api/v1/my/assignments
  myAssignments: (params?: { status?: string; overdue?: boolean }) =>
    apiClient.get<{ items: MyAssignment[] }>('/my/assignments', { params })
      .then(r => r.data.items),

  // POST /api/v1/submissions  { assignmentId }
  create: (assignmentId: string) =>
    apiClient.post<{ id: string; status: string }>('/submissions', { assignmentId })
      .then(r => r.data),

  // GET /api/v1/submissions/:id
  getOne: (submissionId: string) =>
    apiClient.get<SubmissionDetail>(`/submissions/${submissionId}`)
      .then(r => r.data),

  // PATCH /api/v1/submissions/:id/cells
  patchCells: (submissionId: string, clientVersion: number, changes: CellChange[]) =>
    apiClient.patch<PatchCellsResult>(`/submissions/${submissionId}/cells`, {
      clientVersion,
      changes,
    }).then(r => r.data),

  // POST /api/v1/submissions/:id/submit
  submit: (submissionId: string, note?: string) =>
    apiClient.post<{ status: string; submittedAt: string }>(
      `/submissions/${submissionId}/submit`,
      { note }
    ).then(r => r.data),
}
```

---

## 6. Logic Quan Trọng trong `submission-input-page.tsx`

### Khởi tạo (khi vào trang)
```typescript
// 1. Kiểm tra assignment có submission chưa
const assignment = myAssignments.find(a => a.assignmentId === assignmentId)

// 2. Nếu chưa có submission → auto create
if (!assignment.submission) {
  const created = await submissionApi.create(assignmentId)
  setSubmissionId(created.id)
} else {
  setSubmissionId(assignment.submission.id)
}

// 3. Fetch detail (cells + defaultValues)
const detail = await submissionApi.getOne(submissionId)
```

### Auto-save (debounce 800ms)
```typescript
const pendingChanges = useRef<CellChange[]>([])
const currentVersion = useRef<number>(detail.version)

const debouncedSave = useDebouncedCallback(async () => {
  if (pendingChanges.current.length === 0) return
  const result = await submissionApi.patchCells(
    submissionId,
    currentVersion.current,
    pendingChanges.current
  )
  currentVersion.current = result.version
  pendingChanges.current = []
  // Hiện lỗi nếu có validationErrors
}, 800)

function handleCellChange(change: CellChange) {
  // Merge vào pending (ghi đè nếu cùng key)
  pendingChanges.current = [
    ...pendingChanges.current.filter(
      c => !(c.indicatorId === change.indicatorId && c.attributeId === change.attributeId)
    ),
    change
  ]
  debouncedSave()
}
```

### Xử lý lỗi version mismatch (412)
```typescript
} catch (error) {
  if (error.status === 412) {
    // Refetch để lấy version mới
    const fresh = await submissionApi.getOne(submissionId)
    currentVersion.current = fresh.version
    toast.warning('Dữ liệu đã thay đổi, đã đồng bộ lại.')
  }
}
```

---

## 7. Bảng DB Tương Tác

| Hành động | Bảng DB |
|---|---|
| Load danh sách giao việc | `report_assignments` + LEFT JOIN `report_submissions` |
| Tạo submission lần đầu | INSERT `report_submissions` |
| Load trang nhập liệu | READ `report_submissions` + `report_submission_cells` + `report_campaign_default_values` |
| Auto-save | UPSERT `report_submission_cells`, UPDATE `report_submissions.version` |
| Nộp báo cáo | UPDATE `report_submissions.status = PENDING` |

---

## 8. Checklist

- [ ] `submission/api/types.ts`
- [ ] `submission/api/submission-api.ts`
- [ ] `use-my-assignments.ts` (React Query, refetch khi navigate lại)
- [ ] `use-submission.ts` (auto-create + version tracking)
- [ ] `my-assignments-page.tsx` (tabs, filter, danh sách)
- [ ] `assignment-card.tsx` (hiển thị đúng trạng thái + nút)
- [ ] `submission-input-page.tsx` (orchestration + auto-save)
- [ ] `submission-grid.tsx` (wrap TemplateMatrixGrid)
- [ ] `submission-cell.tsx` (4 loại: title / locked / formula / input)
- [ ] `submission-toolbar.tsx` (sticky, progress, lưu + nộp)
- [ ] `submit-confirm-dialog.tsx` (nhập ghi chú + xác nhận)
- [ ] Đăng ký routes vào router
- [ ] Thêm link vào sidebar

---

## 9. Lưu Ý

- Tái sử dụng `TemplateMatrixGrid` từ `src/features/form-management/components/shared/template-matrix-grid`.
- Khi `submissionStatus` là `PENDING` hoặc `APPROVED`: toàn bộ grid read-only.
- Khi `REJECTED`: hiển thị banner đỏ với `rejectReason`, cho phép sửa lại.
- Đừng gọi template API trực tiếp — dữ liệu cấu trúc (indicators, attributes, cellConfigs) lấy từ form-management API bằng `formId` trong assignment.
