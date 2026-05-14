# Business Rules and Constraints

## 1. Template rules

| Rule | Enforce at |
| --- | --- |
| Template code unique | DB + app |
| Template in-use cannot structurally mutate | app |
| `template_status` follows allowed lifecycle | app |
| `template_type` is `AGGREGATE` or `UNIQUE` | DB + app |

## 2. Campaign rules

| Rule | Enforce at |
| --- | --- |
| Campaign unique by `(template_id, period_type, period_code)` | DB |
| Scope editable only in `DRAFT` | app |
| Default values editable only in `DRAFT` | app |
| Assignments only after `confirm_dispatch` | app + DB |
| `DISPATCHED` means scope/default values locked | app |

## 3. Template scope uniqueness

Business rule:
- Neu `template_type = UNIQUE`, cung 1 indicator khong duoc giao cho nhieu org trong cung template/campaign context.

Enforcement:
- Can enforce som ngay tai template scope.
- Khong chi dua vao campaign snapshot de bat loi muon.

## 4. Assignment rules

| Rule | Enforce at |
| --- | --- |
| Unique assignment per `(campaign_id, org_id)` | DB |
| Assignment cannot be generated before dispatch | app |
| Assignment cancellation must preserve audit trail | app |

## 5. Submission rules

| Rule | Enforce at |
| --- | --- |
| One active submission per assignment | app + DB |
| Patch cells only in editable states | app |
| Submit only when mandatory cells valid | app |
| `version` used as optimistic lock | app + DB |
| Rejected submission can be resubmitted | app |

## 6. Approval rules
- Approval flow phai ghi history.
- Moi transition quan trong phai co actor, note, timestamp.
- Duyet/tra lai khong duoc sua truc tiep template hay campaign data.

## 7. Analytics rules
- Chi tinh tu submission hop le da duyet.
- Summary la read model, khong phai source of truth.
- Recompute phai idempotent.

## 8. Governance rules

### Audit
- Moi state transition quan trong phai co audit row.
- Log phai chua actor, before/after, record ref, correlation info neu co.

### Idempotency
- Cac endpoint co side effect lon phai co idempotency strategy.
- `confirm_dispatch` la ung vien bat buoc.

### Transactions
- Multi-step operation phai chay trong transaction:
  - create campaign snapshot
  - confirm dispatch
  - bulk scope overwrite
  - approval transition

## 9. Retention and safety
- Transaction tables phai hard-retain.
- Master tables co the soft delete neu can.
- Khong xoa du lieu lam mat trace cua workflow da chay.

