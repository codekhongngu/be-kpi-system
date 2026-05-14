# Quan Hệ Giữa Các Bảng — KPI Report System

> Tài liệu mô tả chi tiết chuỗi quan hệ giữa các bảng trong hệ thống,
> từ thiết kế biểu mẫu đến tổng hợp dữ liệu.
> Canonical docs: `docs/canonical/README.md`

---

## 1. Tổng Quan Chuỗi Dữ Liệu

```
form_templates                        (Biểu mẫu — KHUNG)
    │
    ├── form_template_indicators      (Chỉ tiêu — HÀNG)
    ├── form_template_attributes      (Thuộc tính — CỘT)
    ├── form_template_cell_configs    (Quy tắc ô — số/chữ/formula)
    └── form_template_indicator_org_rules  (Scope mặc định — org ↔ indicator)
            │
            │  [Tạo Campaign → snapshot scope]
            ▼
    report_campaigns                  (Đợt báo cáo — VD: "Tháng 5/2026")
        │
        ├── report_campaign_indicator_org_scopes  (Scope thực tế của đợt)
        ├── report_campaign_default_values         (Giá trị điền sẵn chung)
        │
        │  [Confirm Dispatch → sinh assignments]
        ▼
    report_assignments                (Giao việc — VD: "Tháng 5 → Xã A")
        │
        │  [Đơn vị mở báo cáo → tạo submission]
        ▼
    report_submissions                (Bản nộp — theo dõi trạng thái)
        │
        ├── report_submission_cells   (Dữ liệu nhập — giá trị từng ô)
        │
        │  [Approve → trigger tổng hợp]
        ▼
    report_summaries                  (Tổng hợp — merge defaultValues + cells)
```

---

## 2. Chi Tiết Từng Bảng Theo Vai Trò

### NHÓM A — THIẾT KẾ BIỂU MẪU (Metadata, ít thay đổi)

#### `form_templates` — Biểu mẫu gốc
| Cột quan trọng | Ý nghĩa |
|---|---|
| `id` | PK |
| `code`, `name` | Mã và tên biểu mẫu |
| `template_type` | `AGGREGATE` (chỉ tiêu giao nhiều org) hoặc `UNIQUE` (1 chỉ tiêu = 1 org) |
| `template_status` | `DRAFT` → `READY` → `IN_USE` → `ARCHIVED` |
| `period_type` | Kỳ báo cáo: THANG, QUY, NAM |

**Vai trò**: Là "khuôn" để tạo campaign. Không chứa dữ liệu thực.

#### `form_template_indicators` — Danh sách chỉ tiêu (hàng)
| Cột quan trọng | Ý nghĩa |
|---|---|
| `template_id` | FK → `form_templates` |
| `parent_id` | FK → chính nó (hỗ trợ cây cha-con) |
| `code`, `name` | Mã và tên chỉ tiêu |
| `type` | `INPUT` (nhập liệu) hoặc `TITLE` (tiêu đề nhóm, không nhập) |
| `sort_order` | Thứ tự hiển thị |

#### `form_template_attributes` — Danh sách thuộc tính (cột)
| Cột quan trọng | Ý nghĩa |
|---|---|
| `template_id` | FK → `form_templates` |
| `parent_id` | FK → chính nó (cột cha-con) |
| `code`, `name` | Mã và tên thuộc tính |
| `type` | `INPUT` hoặc `TITLE` |
| `sort_order` | Thứ tự hiển thị |

#### `form_template_cell_configs` — Quy tắc cho từng ô
| Cột quan trọng | Ý nghĩa |
|---|---|
| `template_id` | FK → `form_templates` |
| `indicator_id` | FK → `form_template_indicators` |
| `attribute_id` | FK → `form_template_attributes` |
| `data_type` | `text` hoặc `number` |
| `is_required` | Bắt buộc nhập |
| `is_editable` | Có cho phép sửa không |
| `formula` | Công thức tính tự động (nếu có) |

**Vai trò**: Định nghĩa ô tại tọa độ (indicator, attribute) hoạt động thế nào.
Áp dụng chung mọi campaign, mọi đơn vị. **Không có org_id**.

#### `form_template_indicator_org_rules` — Scope mặc định
| Cột quan trọng | Ý nghĩa |
|---|---|
| `template_id` | FK → `form_templates` |
| `indicator_id` | FK → `form_template_indicators` |
| `org_id` | FK → `organizations` |
| `is_enabled` | Có giao chỉ tiêu này cho org không |

**Vai trò**: Cấu hình mặc định "chỉ tiêu nào giao cho org nào".
Khi tạo campaign, scope này sẽ được **snapshot** sang campaign.

---

### NHÓM B — ĐỢT BÁO CÁO & PHÂN CÔNG (Transactional)

#### `report_campaigns` — Đợt báo cáo
| Cột quan trọng | Ý nghĩa |
|---|---|
| `id` | PK |
| `template_id` | FK → `form_templates` (biểu mẫu gốc) |
| `period_type` | THANG, QUY, NAM |
| `period_code` | VD: "2026-05", "2026-Q1" |
| `period_name` | Tên hiển thị: "Tháng 5/2026" |
| `status` | `DRAFT` → `DISPATCHED` → `CLOSED` / `CANCELLED` |
| `deadline_from`, `deadline_to` | Khoảng thời gian nộp bài |
| `dispatched_at`, `dispatched_by` | Ai phân phối, lúc nào |

**Vai trò**: Thực thể hóa biểu mẫu theo kỳ. VD: "Biểu mẫu dân cư" → "Tháng 5/2026".
- Unique constraint: `(template_id, period_type, period_code)` — không trùng đợt.
- Khi `DRAFT`: cho sửa scope, defaultValues, deadline.
- Khi `DISPATCHED`: khóa mọi thứ, đã sinh assignments.

#### `report_campaign_indicator_org_scopes` — Scope thực tế của đợt
| Cột quan trọng | Ý nghĩa |
|---|---|
| `campaign_id` | FK → `report_campaigns` |
| `org_id` | FK → `organizations` |
| `indicator_id` | FK → `form_template_indicators` |
| `source` | `TEMPLATE_DEFAULT` hoặc `CAMPAIGN_OVERRIDE` |

**Vai trò**: Xác định "đợt này, org nào được giao chỉ tiêu nào".
- Ban đầu = snapshot từ template scope.
- Admin có thể override (thêm/bỏ) khi campaign còn DRAFT.
- Dùng khi nhập liệu: chỉ cho phép nhập ô thuộc scope.

#### `report_campaign_default_values` — Giá trị điền sẵn (chung đợt)
| Cột quan trọng | Ý nghĩa |
|---|---|
| `campaign_id` | FK → `report_campaigns` |
| `indicator_id` | FK → `form_template_indicators` |
| `attribute_id` | FK → `form_template_attributes` |
| `value_text` | Giá trị text (nếu ô kiểu chữ) |
| `value_number` | Giá trị số (nếu ô kiểu số) |

**Vai trò**: Giá trị do admin điền, áp dụng **chung cho mọi đơn vị** trong đợt.
- **Không có org_id** — tất cả đơn vị nhìn thấy giống nhau.
- Ô có defaultValue → DISABLED cho đơn vị, chỉ xem.
- VD: "Kế hoạch thu thuế năm" = 500 triệu → mọi xã đều thấy 500 triệu.

#### `report_assignments` — Giao việc cho từng đơn vị
| Cột quan trọng | Ý nghĩa |
|---|---|
| `id` | PK |
| `campaign_id` | FK → `report_campaigns` (đợt nào) |
| `template_id` | FK → `form_templates` (biểu mẫu nào) |
| `org_id` | FK → `organizations` (đơn vị nào) |
| `period_type`, `period_code` | Kỳ báo cáo (copy từ campaign) |
| `deadline_from`, `deadline_to` | Hạn nộp |
| `is_cancelled` | Đã hủy chưa |
| `assigned_by` | Ai giao |

**Vai trò**: Mỗi record = "1 đơn vị được giao báo cáo trong 1 đợt".
- Sinh tự động khi admin `confirm_dispatch`.
- Unique: `(campaign_id, org_id)` — mỗi org chỉ 1 assignment/đợt.
- **Admin dùng bảng này để theo dõi** danh sách đơn vị được giao.

---

### NHÓM C — NHẬP LIỆU & THEO DÕI TRẠNG THÁI

#### `report_submissions` — Bản nộp (THEO DÕI TRẠNG THÁI)
| Cột quan trọng | Ý nghĩa |
|---|---|
| `id` | PK |
| `code` | Mã bản nộp duy nhất (VD: "RS-A1B2C3D4") |
| `assignment_id` | FK → `report_assignments` |
| `status` | `DRAFT` → `PENDING` → `APPROVED` / `REJECTED` |
| `version` | Optimistic lock — tăng mỗi lần save |
| `note` | Ghi chú khi nộp |
| `reject_reason` | Lý do từ chối (nếu bị reject) |
| `completion_pct` | % hoàn thành |
| `submitted_by`, `submitted_at` | Ai nộp, lúc nào |
| `approved_by`, `approved_at` | Ai duyệt, lúc nào |

**Vai trò**: 
- **Đây là bảng admin dùng để theo dõi trạng thái nhập liệu**.
- 1 assignment chỉ có 1 submission (tạo lần đầu khi đơn vị mở báo cáo).
- Status cho biết đơn vị đang ở bước nào: chưa nộp, đang chờ duyệt, đã duyệt, bị từ chối.
- Truy vấn: JOIN `report_assignments` + `report_submissions` → biết org nào đã nộp/chưa nộp.

#### `report_submission_cells` — Dữ liệu nhập liệu (GIÁ TRỊ THỰC TẾ)
| Cột quan trọng | Ý nghĩa |
|---|---|
| `id` | PK |
| `submission_id` | FK → `report_submissions` |
| `indicator_id` | FK → `form_template_indicators` (chỉ tiêu nào) |
| `attribute_id` | FK → `form_template_attributes` (cột nào) |
| `value_text` | Giá trị text |
| `value_number` | Giá trị số |
| `updated_by` | Ai nhập |
| `updated_at` | Lúc nào |

**Vai trò**:
- **Đây là bảng lưu trữ dữ liệu thực tế do đơn vị nhập**.
- Mỗi record = 1 ô tại tọa độ (indicator, attribute) trong 1 submission.
- Unique: `(submission_id, indicator_id, attribute_id)`.
- Chỉ cho nhập nếu: ô thuộc scope + ô không bị lock bởi defaultValue.

---

### NHÓM D — TỔNG HỢP & PHÂN TÍCH

#### `report_summaries` — Bản tổng hợp (TỔNG HỢP DỮ LIỆU)
| Cột quan trọng | Ý nghĩa |
|---|---|
| `id` | PK |
| `form_id` | FK → `form_templates` |
| `org_id` | FK → `organizations` (tổng hợp cho org nào — thường là cấp huyện) |
| `period_type`, `period_code` | Kỳ tổng hợp |
| `status` | `DRAFT` → `FINAL` → `LOCKED` |
| `total_units` | Tổng số đơn vị con |
| `submitted_units` | Số đơn vị đã nộp |
| `approved_units` | Số đơn vị đã duyệt |
| `summary_data` | **JSONB** — chứa dữ liệu tổng hợp |
| `summarized_by`, `summarized_at` | Ai tổng hợp, lúc nào |

**Vai trò**:
- **Đây là bảng tổng hợp dữ liệu từ nhiều đơn vị**.
- `summary_data` chứa merged data dạng: `{ indicators: { "indId:attrId": { valueText, valueNumber } } }`.
- Logic merge khi recompute:
  1. Cộng dồn `report_submission_cells` (chỉ APPROVED) theo cây org (`organization_closure`).
  2. `report_campaign_default_values` đè lên (ưu tiên cao hơn vì ô locked).

---

## 3. Sơ Đồ Quan Hệ Chính

```
┌─────────────────────────────────────────────────────────────────┐
│                     THIẾT KẾ (Metadata)                         │
│                                                                 │
│  form_templates ──┬── form_template_indicators (hàng)           │
│                   ├── form_template_attributes (cột)            │
│                   ├── form_template_cell_configs (quy tắc ô)    │
│                   └── form_template_indicator_org_rules (scope)  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Tạo campaign (snapshot scope)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ĐỢT BÁO CÁO (Campaign)                        │
│                                                                 │
│  report_campaigns ─┬── report_campaign_indicator_org_scopes     │
│                    └── report_campaign_default_values            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Confirm Dispatch (sinh assignments)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GIAO VIỆC & NHẬP LIỆU                          │
│                                                                 │
│  report_assignments ──── report_submissions ──── report_sub_cells│
│  (1 record/org)          (theo dõi trạng thái)   (dữ liệu ô)   │
│                                                                 │
│  Admin theo dõi:         Trạng thái đơn vị:     Dữ liệu thực:  │
│  "Xã A được giao"       "Xã A: PENDING"        "Ô X = 500"     │
└────────────────────────────┬────────────────────────────────────┘
                             │ Approve → trigger tổng hợp
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TỔNG HỢP (Analytics)                           │
│                                                                 │
│  report_summaries (summary_data jsonb)                          │
│  = defaultValues + SUM(submission_cells WHERE APPROVED)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Trả Lời Câu Hỏi Cụ Thể

### Q: Bảng nào admin dùng để theo dõi trạng thái nhập liệu?

**Hai bảng kết hợp**: `report_assignments` + `report_submissions`

```sql
-- Xem trạng thái nhập liệu của tất cả đơn vị trong 1 campaign
SELECT
    o.name          AS "Đơn vị",
    a.deadline_to   AS "Hạn nộp",
    COALESCE(s.status, 'CHƯA MỞ') AS "Trạng thái",
    s.submitted_at  AS "Thời gian nộp",
    s.approved_at   AS "Thời gian duyệt"
FROM report_assignments a
JOIN organizations o ON o.id = a.org_id
LEFT JOIN report_submissions s ON s.assignment_id = a.id
WHERE a.campaign_id = '<campaign_id>'
  AND a.is_cancelled = false
ORDER BY o.name;
```

Kết quả mẫu:

| Đơn vị | Hạn nộp | Trạng thái | Thời gian nộp | Thời gian duyệt |
|--------|---------|-----------|---------------|-----------------|
| Xã A | 2026-05-31 | APPROVED | 2026-05-20 | 2026-05-22 |
| Xã B | 2026-05-31 | PENDING | 2026-05-25 | — |
| Xã C | 2026-05-31 | DRAFT | — | — |
| Xã D | 2026-05-31 | CHƯA MỞ | — | — |

### Q: Bảng nào lưu dữ liệu được nhập của phòng ban?

**`report_submission_cells`** — mỗi record = 1 ô dữ liệu.

```sql
-- Xem dữ liệu Xã A đã nhập
SELECT
    ind.name   AS "Chỉ tiêu",
    attr.name  AS "Thuộc tính",
    c.value_text,
    c.value_number
FROM report_submission_cells c
JOIN report_submissions s ON s.id = c.submission_id
JOIN report_assignments a ON a.id = s.assignment_id
JOIN form_template_indicators ind ON ind.id = c.indicator_id
JOIN form_template_attributes attr ON attr.id = c.attribute_id
WHERE a.org_id = '<org_xa_a>' AND a.campaign_id = '<campaign_id>';
```

### Q: Bảng nào dùng để tổng hợp dữ liệu?

**`report_summaries`** — merge defaultValues + submission_cells.

```sql
-- Xem dữ liệu tổng hợp
SELECT summary_data
FROM report_summaries
WHERE form_id = '<template_id>'
  AND org_id = '<org_huyen>'
  AND period_code = '2026-05';
```

Kết quả `summary_data`:
```json
{
  "indicators": {
    "<indicator_id>:<attribute_id>": {
      "valueText": null,
      "valueNumber": 1500
    }
  },
  "recomputedAt": "2026-05-25T10:00:00Z"
}
```

---

## 5. Luồng Dữ Liệu Qua Các Bảng (Ví Dụ Cụ Thể)

**Kịch bản**: Biểu mẫu "Thu thuế" — Tháng 5/2026 — giao cho Xã A, Xã B, Xã C.

### Bước 1: Tạo Template
```
form_templates: { id: T1, code: "BM-THUE", name: "Thu thuế", status: DRAFT }
form_template_indicators: [
    { id: I1, name: "Thu nhập khẩu", type: INPUT },
    { id: I2, name: "Thu nội địa", type: INPUT }
]
form_template_attributes: [
    { id: A1, name: "Kế hoạch năm" },
    { id: A2, name: "Thực hiện tháng" }
]
form_template_cell_configs: [
    { indicator: I1, attribute: A1, dataType: number },
    { indicator: I1, attribute: A2, dataType: number },
    { indicator: I2, attribute: A1, dataType: number },
    { indicator: I2, attribute: A2, dataType: number }
]
```

### Bước 2: Tạo Campaign
```
report_campaigns: { id: C1, template: T1, period: "2026-05", status: DRAFT }

report_campaign_indicator_org_scopes: [  ← snapshot từ template
    { campaign: C1, org: XãA, indicator: I1 },
    { campaign: C1, org: XãA, indicator: I2 },
    { campaign: C1, org: XãB, indicator: I1 },
    { campaign: C1, org: XãB, indicator: I2 },
    { campaign: C1, org: XãC, indicator: I1 },
    { campaign: C1, org: XãC, indicator: I2 }
]

report_campaign_default_values: [  ← admin điền giá trị chung
    { campaign: C1, indicator: I1, attribute: A1, value_number: 500 },
    { campaign: C1, indicator: I2, attribute: A1, value_number: 300 }
]
→ Cột "Kế hoạch năm" = giá trị chung, mọi xã nhìn thấy, KHÔNG ĐƯỢC SỬA.
```

### Bước 3: Dispatch → Sinh Assignments
```
report_assignments: [
    { id: AS1, campaign: C1, org: XãA, deadline: 2026-05-31 },
    { id: AS2, campaign: C1, org: XãB, deadline: 2026-05-31 },
    { id: AS3, campaign: C1, org: XãC, deadline: 2026-05-31 }
]
```

### Bước 4: Xã A nhập liệu
```
report_submissions: { id: S1, assignment: AS1, status: DRAFT, version: 1 }

report_submission_cells: [
    { submission: S1, indicator: I1, attribute: A2, value_number: 120 },
    { submission: S1, indicator: I2, attribute: A2, value_number: 80 }
]
→ Chỉ nhập cột "Thực hiện tháng" (A2), vì "Kế hoạch năm" (A1) đã locked.
```

### Bước 5: Nộp & Duyệt
```
report_submissions: { id: S1, status: PENDING → APPROVED }
```

### Bước 6: Tổng hợp
```
report_summaries: {
    form: T1, org: Huyện, period: "2026-05",
    summary_data: {
        "I1:A1": { valueNumber: 500 },   ← từ defaultValue (locked)
        "I1:A2": { valueNumber: 320 },   ← SUM(XãA:120 + XãB:100 + XãC:100)
        "I2:A1": { valueNumber: 300 },   ← từ defaultValue (locked)
        "I2:A2": { valueNumber: 230 }    ← SUM(XãA:80 + XãB:80 + XãC:70)
    }
}
```

---

## 6. Bảng Tham Chiếu Nhanh

| Câu hỏi | Bảng | Ghi chú |
|----------|------|---------|
| Biểu mẫu có những chỉ tiêu/cột nào? | `form_template_indicators`, `form_template_attributes` | JOIN qua `template_id` |
| Ô nào kiểu số, kiểu chữ? | `form_template_cell_configs` | Tọa độ (indicator, attribute) |
| Đợt nào đang chạy? | `report_campaigns` | Filter `status = DISPATCHED` |
| Đợt này giao cho org nào? | `report_campaign_indicator_org_scopes` | Filter `campaign_id` |
| Giá trị chung do admin điền? | `report_campaign_default_values` | Không có org_id |
| Đơn vị nào được giao? | `report_assignments` | Filter `campaign_id` |
| Đơn vị đã nộp chưa? | `report_submissions` | LEFT JOIN từ assignments |
| Đơn vị nhập gì? | `report_submission_cells` | Dữ liệu thực tế từng ô |
| Tổng hợp ra sao? | `report_summaries` | `summary_data` jsonb |
