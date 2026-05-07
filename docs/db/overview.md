# Database Architecture Overview (Canonical)

## 1. Scope and Intent
Tai lieu nay dinh nghia kien truc du lieu chuan cho he thong quan ly du lieu cap xa theo flow:
`Template -> Campaign -> Assignment -> Submission -> Approval -> Summary/Analytics`.

Muc tieu:
- Chuan hoa naming/entity theo mo hinh moi, khong phu thuoc legacy table names.
- Toi uu cho backend NestJS + TypeORM va AI-assisted development.
- Dam bao production-ready: transaction-safe, auditable, scalable.

## 2. Canonical Bounded Contexts
1. Identity & Access Context
- Modules: `auth`, `user`, `role`
- Tables: users, roles, permissions, user_roles, role_permissions, auth_refresh_tokens, auth_password_resets.

2. Organization Context
- Module: `organization`
- Tables: organizations (+ de xuat organization_closure cho query scope theo cay).

3. Template Metadata Context
- Module: `template-management`
- Tables: form_templates, form_template_attributes, form_template_indicators, form_template_cell_configs, form_template_indicator_org_rules, field_categories, indicator_catalog.

4. Allocation & Campaign Context
- Module: `report-campaign`
- Tables: report_campaigns, report_campaign_indicator_org_scopes, report_assignments.

5. Submission & Approval Context
- Modules: `submission`, `approval`
- Tables: report_submissions, report_submission_cells.

6. Reporting & Analytics Context
- Module: `summary-analytics`
- Tables: report_summaries (+ materialized views cho dashboard).

7. Governance Context
- Module: `audit-log` (+ notification/import/file neu co)
- Tables: audit_logs, notifications, import_jobs, files.

## 3. Canonical Data Layers
### 3.1 Metadata Layer (slow-changing)
- form_templates + children (attributes/indicators/cell configs/default org-indicator rules).
- Versioning bang clone template, khong update pha vo lich su.

### 3.2 Transactional Layer (high-write)
- report_campaigns -> report_assignments -> report_submissions -> report_submission_cells.
- Toan bo workflow states va transitions duoc enforce tai app service + constraints/trigger.

### 3.3 Analytics Layer (read-heavy)
- report_summaries + materialized views KPI.
- Du lieu tong hop cap nhat async theo event `submission.approved`.

## 4. Canonical Naming Rules
- Table: snake_case, so nhieu, domain-first (`report_campaigns`, `report_submission_cells`).
- PK: `id uuid` (gen_random_uuid()).
- FK: `<referenced_entity_singular>_id`.
- Timestamps: `created_at`, `updated_at`; optional `deleted_at` cho aggregate root quan tri.
- Status columns dung enum business ro rang (`template_status`, `campaign_status`, `submission_status`).

## 5. Core Workflow (Data Perspective)
1. Tao template (`form_templates`) o `DRAFT`.
2. Cau hinh indicators/attributes/cell overrides/default allocations.
3. Mark template `READY`.
4. Tao campaign (`report_campaigns`) tu template.
5. Snapshot allocations vao `report_campaign_indicator_org_scopes`.
6. Override scope (chi khi campaign `DRAFT`).
7. Confirm dispatch -> sinh `report_assignments`.
8. Don vi tao `report_submissions`, cap nhat `report_submission_cells`, submit.
9. Approver approve/reject.
10. Job tong hop sinh/cap nhat `report_summaries`.

## 6. Mandatory Invariants
1. Template da co campaign thi khoa sua cau truc metadata.
2. Campaign chi cho sua scope khi `DRAFT`.
3. Assignment chi sinh sau `confirm_dispatch`.
4. Submission chi cho patch cells khi `DRAFT`/`REJECTED`.
5. Template type `UNIQUE` cam trung indicator giua org trong cung campaign.
6. Formula-based cells phai readonly tai runtime.

## 7. Scalability Decisions
1. UUID toan he thong de ho tro distributed writes.
2. Composite indexes theo query path thuc te (org/status/deadline/period).
3. Keyset pagination cho list lon.
4. Async jobs cho dispatch bulk, aggregation, notifications.
5. Materialized views cho KPI dashboard.

## 8. AI-Assisted Development Contract
- Moi feature moi phai map vao 1 bounded context ro rang.
- Khong tao table/field mang ten legacy neu da co canonical equivalent.
- Moi workflow transition phai co:
  - service-level guard
  - audit log event
  - idempotency strategy (neu co side effects)
- Query read-heavy phai di qua read model service, tranh fat service join lon khong index.

## 9. Known Migration Reality
Codebase hien tai co dau vet naming legacy o mot so module/entity. Tai lieu `migration-architecture.md` se quy dinh:
- bang mapping legacy -> canonical,
- thu tu cutover,
- rollback strategy,
- backfill va verification checklist.

## 10. Deliverable Sequence
Bo tai lieu trong `docs/db/` se duoc tao theo thu tu:
1. overview.md (file nay)
2. conventions.md
3. migration-architecture.md
4. modules/auth.md
5. modules/organizations.md
6. modules/templates.md
7. modules/allocations.md
8. modules/submissions.md
9. modules/reports.md
10. modules/analytics.md
11. modules/audit-logs.md
