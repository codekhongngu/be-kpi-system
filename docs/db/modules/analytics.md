# Analytics Module DB

## purpose
Aggregated KPI and summary storage for dashboards.

## entities
- report_summaries
- (recommended) mv_kpi_campaign_org, mv_kpi_period

## business rules
- only APPROVED submissions are aggregated.
- summary row unique per (campaign_id, org_id).
- recompute must be idempotent.

## relationships
- summary references campaign/template/org.

## state machine
- summary status: DRAFT -> FINAL (optional) -> LOCKED.

## permission scope
- `analytics.read`, `analytics.export`, `summaries.manage`.

## query patterns
- KPI counters (assigned/submitted/approved/overdue).
- trend by period.
- pivot by org x indicator.

## index strategy
- summaries(campaign_id,status), unique(campaign_id,org_id).
- GIN summary_data when querying nested metrics.
- MV indexes by period/org/template.

## async jobs/events
- queue `summary.recompute` on submission approved.
- nightly full reconciliation job.

## anti-patterns tránh
- synchronous heavy aggregation in request-response path.
- dashboards reading raw submission_cells directly at scale.
