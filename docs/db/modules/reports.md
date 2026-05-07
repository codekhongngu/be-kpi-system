# Reports Module DB

## purpose
Read models for operational reporting (campaign/assignment/submission progress views).

## entities
- report_campaigns (source)
- report_assignments (source)
- report_submissions (source)
- (recommended) report_progress_view/materialized view

## business rules
- reporting views are derived; no direct writes.
- period filters use canonical period fields from campaign/assignment.

## relationships
- derived from allocations + submissions contexts.

## state machine
- inherited from campaign/submission state machines.

## permission scope
- `reports.read`, `reports.export` with org hierarchy filtering.

## query patterns
- filter by org/template/period/status/date range.
- export report list with stable snapshot timestamp.

## index strategy
- covering indexes for list endpoints: assignments(org_id,deadline_to,status), submissions(status,submitted_at).
- materialized view indexes by org/period/status.

## async jobs/events
- scheduled refresh materialized reporting views.

## anti-patterns tránh
- expensive ad-hoc joins for every API call without cached read model.
