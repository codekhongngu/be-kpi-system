# PLAN 04 — MODULE SUMMARY & ANALYTICS (Tổng Hợp & Phân Tích)

> **Ưu tiên: LOW** — Làm sau khi Submission + Approval hoạt động ổn định.
> Backend API: ⚠️ Skeleton (recompute OK, charts/pivot/export chưa có).
> Frontend: ❌ Chưa có.

---

## 1. Mục Tiêu

Xây dựng giao diện **Dashboard & Báo cáo tổng hợp** cho Admin/Manager:
1. **Dashboard KPI**: 4 chỉ số (Đã giao / Đã nộp / Đã duyệt / Quá hạn)
2. **Trang tổng hợp**: Tạo, xem và recompute bản tổng hợp
3. **Tra cứu báo cáo**: Tìm kiếm + xem chi tiết submissions

> **Lưu ý**: Cần hoàn thiện BE trước khi làm FE cho charts/pivot/export.

---

## 2. UI/UX

### 2.1 Dashboard KPI — Route: `/dashboard`

**Layout:** Card summary + Chart

```
┌────────────────────────────────────────────────────────────────┐
│  📊 Dashboard KPI — Tháng 5/2026                              │
│  Lọc: [Từ: ___] [Đến: ___] [Đơn vị: Tất cả ▼]              │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  📋 ĐÃ GIAO  │  📤 ĐÃ NỘP   │  ✅ ĐÃ DUYỆT │  ⚠ QUÁ HẠN       │
│     120      │     85       │     60       │     12            │
│   100%       │   70.8%      │   50%        │   10%             │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│  📈 Xu hướng theo tháng (Line chart — placeholder)            │
│     T1  T2  T3  T4  T5                                        │
│     ██  ██  ██  ██  ██                                        │
└────────────────────────────────────────────────────────────────┘
```

**API sử dụng:** `GET /api/v1/analytics/kpis?from=2026-05-01&to=2026-05-31`

---

### 2.2 Trang "Tổng Hợp" — Route: `/summaries`

**Layout:** List + action create

```
┌────────────────────────────────────────────────────────────────┐
│  📑 Bản Tổng Hợp                           [+ Tạo tổng hợp]  │
├────────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Biểu mẫu   │ Đơn vị   │ Kỳ       │ Trạng thái│ Hành động      │
├────────────┼──────────┼──────────┼──────────┼─────────────────┤
│ Thu thuế   │ Huyện X  │ T5/2026  │ DRAFT    │ [Xem] [Tính lại]│
│ Dân số     │ Huyện X  │ T5/2026  │ FINAL    │ [Xem]           │
└────────────┴──────────┴──────────┴──────────┴─────────────────┘
```

**Trang chi tiết bản tổng hợp** (`/summaries/:id`):

```
┌────────────────────────────────────────────────────────────────┐
│ Thu thuế — Huyện X — Tháng 5/2026                 [Tính lại] │
│ Tổng hợp lần cuối: 25/05/2026 10:30                          │
├──────────────────────────────────────────────────────────────  │
│  📊 Tiến độ đơn vị con: 10/10 đã duyệt                       │
├──────────────┬─────────────┬─────────────┬─────────────────── │
│ Chỉ tiêu     │ KH Năm 🔒   │ Tổng TH T5  │ Tổng lũy kế       │
├──────────────┼─────────────┼─────────────┼─────────────────── │
│ 1. Thu khẩu  │ 500,000     │ 1,200,000   │ 6,000,000         │
│ 2. Nội địa   │ 300,000     │   800,000   │ 4,000,000         │
└──────────────┴─────────────┴─────────────┴─────────────────── │
│ [Xuất Excel]                                                   │
└────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Trang "Tra Cứu Báo Cáo" — Route: `/query/reports`

**Layout:** Filter sidebar + table

```
┌───────────┬──────────────────────────────────────────────────┐
│ BỘ LỌC    │  Danh Sách Báo Cáo                              │
│           │                                                  │
│ Đơn vị    │  [Tìm kiếm...]                                  │
│ Biểu mẫu  │  ─────────────────────────────────────────────  │
│ Kỳ        │  Đơn vị   │ Biểu mẫu  │ Kỳ      │ Trạng thái  │
│ Trạng thái│  Xã A     │ Thu thuế  │ T5/2026 │ ✓ Đã duyệt  │
│ Hạn nộp   │  Xã B     │ Thu thuế  │ T5/2026 │ ⏳ Chờ duyệt │
│           │  Xã C     │ Dân số    │ T5/2026 │ ○ Chưa nộp  │
└───────────┴──────────────────────────────────────────────────┘
```

---

## 3. Cấu Trúc File Cần Tạo

```
src/features/analytics/
├── api/
│   ├── types.ts                    # TS types
│   └── analytics-api.ts            # API wrapper
├── hooks/
│   ├── use-kpi-stats.ts            # KPI counters
│   ├── use-summaries.ts            # Summaries list
│   └── use-query-reports.ts        # Report search
├── pages/
│   ├── dashboard-page.tsx          # Dashboard KPI
│   ├── summaries-list-page.tsx     # Danh sách tổng hợp
│   ├── summary-detail-page.tsx     # Chi tiết + recompute
│   └── query-reports-page.tsx      # Tra cứu
├── components/
│   ├── kpi-stat-card.tsx           # Card 1 chỉ số KPI
│   ├── kpi-stats-row.tsx           # Hàng 4 cards
│   ├── summary-table.tsx           # Bảng tổng hợp
│   ├── summary-data-grid.tsx       # Grid hiển thị summary_data
│   ├── create-summary-dialog.tsx   # Dialog tạo bản tổng hợp
│   └── reports-query-table.tsx     # Bảng tra cứu báo cáo
└── index.tsx
```

---

## 4. Types (`analytics/api/types.ts`)

```typescript
export type KpiStats = {
  assigned: number
  submitted: number
  approved: number
  overdue: number
}

export type SummaryListItem = {
  id: string
  formId: string
  period: { type: string; code: string; name: string; dateFrom: string; dateTo: string }
  orgId: string
  status: string
  summarizedAt: string | null
}

export type SummaryDetail = {
  id: string
  formId: string
  period: { type: string; code: string; name: string; dateFrom: string; dateTo: string }
  orgId: string
  status: string
  totalUnits: number | null
  submittedUnits: number | null
  approvedUnits: number | null
  summaryData: {
    indicators: Record<string, { valueText: string | null; valueNumber: number | null }>
    recomputedAt?: string
  } | null
  summarizedAt: string | null
}

export type QueryReportItem = {
  submissionId: string | null
  assignmentId: string
  org: { id: string; code: string; name: string }
  form: { id: string; code: string; name: string }
  period: { type: string; code: string; name: string }
  status: string
  completionPct: number | null
  submittedAt: string | null
  approvedAt: string | null
  deadlineTo: string
}
```

---

## 5. API Calls (`analytics/api/analytics-api.ts`)

```typescript
export const analyticsApi = {
  // GET /api/v1/analytics/kpis?from=&to=&orgId=
  kpis: (params: { from: string; to: string; orgId?: string }) =>
    apiClient.get<KpiStats>('/analytics/kpis', { params }).then(r => r.data),

  // GET /api/v1/summaries
  listSummaries: (params?: { formId?: string; orgId?: string; page?: number }) =>
    apiClient.get<{ items: SummaryListItem[]; meta: { total: number } }>(
      '/summaries', { params }
    ).then(r => r.data),

  // POST /api/v1/summaries
  createSummary: (payload: {
    formId: string; orgId: string
    periodType: string; periodCode: string
    periodFrom: string; periodTo: string; periodName?: string
  }) =>
    apiClient.post<SummaryDetail>('/summaries', payload).then(r => r.data),

  // GET /api/v1/summaries/:id
  getSummary: (id: string) =>
    apiClient.get<SummaryDetail>(`/summaries/${id}`).then(r => r.data),

  // POST /api/v1/summaries/:id/recompute
  recompute: (id: string) =>
    apiClient.post<{ ok: boolean }>(`/summaries/${id}/recompute`).then(r => r.data),

  // GET /api/v1/query/reports
  queryReports: (params: {
    orgId?: string; formId?: string; periodCode?: string
    status?: string; deadlineFrom?: string; deadlineTo?: string
    q?: string; page?: number; limit?: number
  }) =>
    apiClient.get<{ items: QueryReportItem[]; meta: { total: number } }>(
      '/query/reports', { params }
    ).then(r => r.data),
}
```

---

## 6. Logic Quan Trọng

### `summary-data-grid.tsx` — Render `summary_data` jsonb

Dữ liệu trong `summaryData.indicators` có dạng:
```json
{
  "<indicatorId>:<attributeId>": { "valueText": null, "valueNumber": 1500 }
}
```

Để render thành bảng đẹp:
1. Load template (indicators + attributes) từ `formManagementApi.getTemplate(formId)`
2. Map từng ô `indicator × attribute` → tìm giá trị trong `indicators[key]`
3. Phân biệt ô có defaultValue (nền vàng) vs ô tổng hợp bình thường

```typescript
function renderSummaryCell(indicatorId: string, attributeId: string) {
  const key = `${indicatorId}:${attributeId}`
  const val = summaryData.indicators[key]
  if (!val) return <span>—</span>
  
  const isDefault = defaultValues.some(
    dv => dv.indicatorId === indicatorId && dv.attributeId === attributeId
  )
  
  return (
    <span className={isDefault ? 'text-amber-600 font-medium' : ''}>
      {val.valueNumber?.toLocaleString('vi-VN') ?? val.valueText ?? '—'}
      {isDefault && <span title="Giá trị admin điền">🔒</span>}
    </span>
  )
}
```

---

## 7. Bảng DB Tương Tác

| Hành động | Bảng DB |
|---|---|
| Dashboard KPI | COUNT `report_assignments` + `report_submissions` theo status/deadline |
| Danh sách tổng hợp | `report_summaries` |
| Tạo bản tổng hợp | INSERT `report_summaries` |
| Recompute | READ `report_campaign_default_values` + `report_submission_cells` (APPROVED) qua `organization_closure`, UPDATE `report_summaries.summary_data` |
| Tra cứu báo cáo | `report_assignments` + `report_submissions` + `organizations` + `form_templates` |

---

## 8. Phần BE Cần Hoàn Thiện (Before FE)

| API | Trạng thái BE | Việc cần làm |
|---|---|---|
| `GET /analytics/kpis` | ✅ Done | — |
| `GET /analytics/charts` | ❌ Skeleton | Implement trend data by period |
| `POST /analytics/pivot` | ❌ Skeleton | Implement pivot table logic |
| `GET /analytics/export` | ❌ Skeleton | Implement Excel export |
| `GET /query/reports/:id/export` | ❌ Skeleton | Implement single report export |
| `POST /summaries/:id/recompute` | ✅ Done | — |

**Gợi ý thứ tự BE**: KPIs (done) → Charts → Recompute (done) → Export.

---

## 9. Checklist

### Phase 4a — Dashboard & Tra Cứu (FE only, BE đủ)
- [ ] `kpi-stat-card.tsx` (1 card)
- [ ] `kpi-stats-row.tsx` (4 cards)
- [ ] `dashboard-page.tsx` (KPI stats + date filter)
- [ ] `query-reports-page.tsx` (filter + table)
- [ ] `reports-query-table.tsx`
- [ ] Đăng ký routes

### Phase 4b — Summaries (sau khi có APPROVED submissions)
- [ ] `summaries-list-page.tsx`
- [ ] `summary-table.tsx`
- [ ] `create-summary-dialog.tsx`
- [ ] `summary-detail-page.tsx`
- [ ] `summary-data-grid.tsx`

### Phase 4c — Charts & Export (cần BE hoàn thiện)
- [ ] BE: Implement `/analytics/charts` endpoint
- [ ] FE: Tích hợp chart library (Recharts hoặc Chart.js)
- [ ] BE: Implement Export to Excel
- [ ] FE: Nút export + download

---

## 10. Lưu Ý

- Dashboard `from/to` nên default là tháng hiện tại.
- `recompute` có thể mất thời gian nếu nhiều đơn vị → show loading state.
- Chỉ tổng hợp từ submissions có `status = APPROVED` — cần thông báo rõ điều này trên UI.
- Export có thể implement đơn giản bằng client-side (json → xlsx) nếu BE chưa có.
