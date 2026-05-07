# Audit Logs Module DB

## purpose
Compliance-grade audit trail for critical mutations and workflow transitions.

## entities
- audit_logs
- (recommended) idempotency_keys

## business rules
- every state transition must emit an audit row.
- immutable logs (no update/delete).
- include actor, scope, before/after payload.

## relationships
- optional FK to users via user_id.
- record reference by (table_name, record_id).

## state machine
- append-only stream; no lifecycle updates.

## permission scope
- `audit.read` restricted to admin/compliance roles.

## query patterns
- by entity/table + record id.
- by actor + date range.
- by action type for incident investigation.

## index strategy
- (table_name, record_id, created_at desc)
- (user_id, created_at desc)
- (action, created_at desc)
- optional BRIN(created_at) for large retention windows.

## async jobs/events
- async sink to SIEM/data lake.
- retention/archival jobs by partition.

## anti-patterns tránh
- storing huge blobs unbounded; cap payload size and hash attachments.
- missing request/correlation id.
