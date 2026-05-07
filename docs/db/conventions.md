# Database Conventions (Canonical)

## 1. Naming
- Tables: snake_case, plural, domain-first (`report_campaigns`, `report_submission_cells`).
- Columns: snake_case.
- PK: `id uuid default gen_random_uuid()`.
- FK: `<entity>_id`.
- Timestamps: `created_at`, `updated_at`, optional `deleted_at`.
- Status columns: explicit business enum name (`template_status`, `campaign_status`, `submission_status`).

## 2. Types
- IDs: `uuid`.
- Codes: `varchar(20..50)` with unique index.
- Name/title: `varchar(255)`.
- Long text: `text`.
- Numeric KPI: `numeric(18,4)`; percentages `numeric(5,2)`.
- Metadata rules: `jsonb`.
- Dates: `date` for period/deadline, `timestamptz` for events.

## 3. Constraints
- Always define FK `ON DELETE` explicitly.
- Unique business keys at DB level.
- Check constraints for status/value ranges.
- Trigger for complex invariants (e.g., UNIQUE template scope rule).

## 4. Indexing baseline
- All FK columns indexed.
- Composite indexes follow read patterns (org/status/deadline, campaign/org).
- Partial indexes for active/pending states.
- GIN for jsonb only when query requires it.

## 5. Soft delete policy
- Use soft delete only for admin/master aggregates: users, roles, organizations, templates.
- Transaction tables (campaign/assignment/submission/cells) are immutable or hard-retained.

## 6. Audit policy
- Every critical state transition writes audit event.
- Store actor, action, table_name, record_id, old_value, new_value, request_id, timestamp.

## 7. Transaction/locking
- Multi-step commands (`confirm_dispatch`, bulk scope overwrite, approve) must run in DB transaction.
- Use optimistic lock version on `report_submissions`.
- Use idempotency key table for side-effect endpoints.

## 8. API-read model rules
- Use keyset pagination for large lists.
- Avoid cross-context joins in write services.
- Read-heavy dashboard uses materialized views.
