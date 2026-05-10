# PLAN 03 — MODULE ADMIN MONITORING (Theo Dõi Tiến Độ)

> **Ưu tiên: MEDIUM** — Làm song song hoặc sau Approval.
> Mục tiêu: Admin/Manager theo dõi toàn bộ tiến độ nộp báo cáo của các đơn vị.
> Backend API: ✅ Đủ data từ existing APIs.

---

## 1. Mục Tiêu

Xây dựng giao diện cho **Admin / Data Manager** để theo dõi campaign đã dispatch:
1. Trang chi tiết campaign: tab "Tiến độ nộp báo cáo" — danh sách tất cả đơn vị + trạng thái
2. Xem chi tiết dữ liệu một đơn vị bất kỳ (read-only)
3. Dashboard KPI nhanh (số liệu tổng hợp)

---

## 2. UI/UX

### 2.1 Tab "Tiến Độ" trong Trang Campaign Details

Thêm tab mới vào trang Report Details đã có (`/reports/:campaignId`):

```
[Thông tin] [Scope] [Giá trị mặc định] [Tiến độ ← MỚI]
```

**Nội dung Tab Tiến Độ:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Tiến độ nộp báo cáo — Thu thuế Tháng 5/2026                   │
│                                                                  │
│  📊  Tổng: 10  |  Chờ duyệt: 2  |  Đã duyệt: 5  |  Chưa nộp: 3│
│  ────────────────────── [██████████░░░░░░░░] 70%                │
├──────────┬─────────────────┬──────────────┬─────────────────────┤
│ Đơn vị   │ Trạng thái      │ Ngày nộp     │ Hành động           │
├──────────┼─────────────────┼──────────────┼─────────────────────┤
│ Xã A     │ ✓ Đã duyệt      │ 20/05 →22/05 │ [Xem dữ liệu]       │
│ Xã B     │ ⏳ Chờ duyệt    │ 25/05/2026   │ [Xem dữ liệu]       │
│ Xã C     │ 📝 Đang nhập    │ —            │ [Xem dữ liệu]       │
│ Xã D     │ ○ Chưa mở       │ —            │ —                   │
│ Xã E     │ ✗ Bị trả lại    │ 22/05/2026   │ [Xem dữ liệu]       │
└──────────┴─────────────────┴──────────────┴─────────────────────┘
```

**Truy vấn dữ liệu tab này:**
- API: `GET /api/v1/assignments?campaignId=:id` — danh sách assignments
- Kết hợp với submissions status từ `GET /api/v1/query/reports?periodCode=...`

> **Lưu ý:** Hiện tại BE chưa có API `GET /assignments?campaignId=X`. Cần dùng workaround:
> Gọi `GET /query/reports` với filter `periodCode` + `formId` để lấy trạng thái.

---

### 2.2 Modal / Drawer "Xem Dữ Liệu Đơn Vị"

Khi Admin click "Xem dữ liệu" → mở Drawer bên phải (không navigate ra ngoài):

```
┌────────────────────────────────────────┐
│  Dữ liệu — Xã A — Thu thuế T5/2026   │
│  Trạng thái: ✓ Đã duyệt               │
│  Ngày nộp: 20/05  | Duyệt: 22/05      │
├────────────────────────────────────────┤
│ [Grid read-only — tương tự trang nhập] │
│                                        │
│  KH Năm 🔒  │ Tháng TH  │ Lũy kế     │
│  500,000    │ 120,000   │ 620,000     │
│  300,000    │  80,000   │ 380,000     │
│                                        │
│  📝 Ghi chú: "..."                    │
└────────────────────────────────────────┘
```

---

## 3. Cấu Trúc File Cần Tạo

```
src/features/report-management/components/tabs/
├── campaign-progress-tab.tsx           # Tab "Tiến độ" (MỚI)

src/features/report-management/components/
├── campaign-progress-stats.tsx         # Summary stats (Tổng/Đã duyệt/...)
├── campaign-progress-table.tsx         # Table danh sách đơn vị + trạng thái
├── unit-data-drawer.tsx                # Drawer xem dữ liệu đơn vị
```

---

## 4. Types Bổ Sung

```typescript
// Thêm vào report-management/api/types.ts

export type CampaignProgressItem = {
  assignmentId: string
  org: { id: string; code: string; name: string }
  deadlineTo: string
  submissionId: string | null
  submissionStatus: 'NOT_STARTED' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string | null
  approvedAt: string | null
  completionPct: number | null
}

export type CampaignProgressStats = {
  total: number
  notStarted: number
  drafting: number
  pending: number
  approved: number
  rejected: number
  completionPct: number // overall
}
```

---

## 5. API & Data Loading

### Workaround hiện tại (không cần thêm BE endpoint)

```typescript
// Trong campaign-progress-tab.tsx
async function loadProgress(campaignId: string, formId: string, periodCode: string) {
  // Lấy danh sách báo cáo từ query endpoint
  const reports = await queryApi.listReports({
    formId,
    periodCode,
    limit: 200,
  })
  // reports.items chứa: assignmentId, org, status, submittedAt, approvedAt
  return reports.items
}
```

### API tái sử dụng từ `summary-analytics-query`

```
GET /api/v1/query/reports?formId=X&periodCode=Y&limit=200
```

Response:
```json
{
  "items": [
    {
      "submissionId": "...",
      "assignmentId": "...",
      "org": { "id": "...", "code": "XA", "name": "Xã A" },
      "status": "APPROVED",
      "completionPct": 100,
      "submittedAt": "...",
      "approvedAt": "...",
      "deadlineTo": "2026-05-31"
    }
  ]
}
```

---

## 6. Component `campaign-progress-tab.tsx`

```typescript
export function CampaignProgressTab({ campaign }: { campaign: ReportDetail }) {
  const { data } = useQuery({
    queryKey: ['campaign-progress', campaign.id],
    queryFn: () => queryApi.listReports({
      formId: campaign.formId,
      periodCode: campaign.periodCode,
      limit: 200,
    }),
    enabled: campaign.status === 'DISPATCHED',
  })

  const items = data?.items ?? []
  const stats = computeStats(items) // tính các số tổng hợp

  return (
    <div>
      <CampaignProgressStats stats={stats} />
      <CampaignProgressTable items={items} />
    </div>
  )
}
```

---

## 7. Tích Hợp Vào Trang Report Details Hiện Có

Trong `report-details-page.tsx`, thêm tab mới khi campaign đã `DISPATCHED`:

```typescript
// Chỉ hiện tab Tiến độ khi đã dispatch
{campaign.status === 'DISPATCHED' && (
  <TabsTrigger value="progress">
    Tiến độ
    <Badge>{stats.pending + stats.drafting}</Badge>  {/* Số cần xử lý */}
  </TabsTrigger>
)}

// Nội dung tab
<TabsContent value="progress">
  <CampaignProgressTab campaign={campaign} />
</TabsContent>
```

---

## 8. Bảng DB Tương Tác

| Hành động | Bảng DB |
|---|---|
| Load tiến độ tất cả đơn vị | `report_assignments` + LEFT JOIN `report_submissions` + JOIN `organizations` |
| Xem dữ liệu 1 đơn vị | `report_submission_cells` + `report_campaign_default_values` |
| Stats tổng hợp | COUNT từ `report_submissions.status` GROUP BY `assignment_id` |

---

## 9. Checklist

- [ ] `campaign-progress-tab.tsx` (gắn vào `report-details-page.tsx`)
- [ ] `campaign-progress-stats.tsx` (4 con số + progress bar)
- [ ] `campaign-progress-table.tsx` (bảng đơn vị + status + nút xem)
- [ ] `unit-data-drawer.tsx` (Drawer read-only, reuse submission grid)
- [ ] Thêm tab "Tiến độ" vào `report-details-page.tsx` (chỉ hiện khi DISPATCHED)

---

## 10. Lưu Ý

- Tab "Tiến độ" chỉ có ý nghĩa khi campaign `status = DISPATCHED`. Khi DRAFT, không hiện tab này.
- Khi xem dữ liệu đơn vị qua Drawer: nếu đơn vị chưa tạo submission (status = NOT_STARTED) → hiện thông báo "Đơn vị chưa bắt đầu nhập liệu".
- Có thể thêm tính năng **gửi nhắc nhở** cho đơn vị chưa nộp (future feature).
