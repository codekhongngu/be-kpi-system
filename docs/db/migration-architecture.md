# Migration Architecture

## 1. Principles
- Rewrite clean migration chain from zero; do not patch legacy migration files.
- PostgreSQL-first, reversible, deterministic.
- Zero-downtime oriented for future upgrades.

## 2. Phase order
1. `000-core`
2. `100-auth`
3. `200-organizations`
4. `300-template-metadata`
5. `400-allocations`
6. `500-submissions`
7. `600-reports`
8. `700-analytics`
9. `800-audit`
10. `900-notifications`

## 3. Dependency rules
- Earlier phase may not depend on later phase.
- FK across phases only to prior phases.
- Each phase has explicit UP/DOWN safety notes.

## 4. Zero-downtime policy
- Additive first (new tables/indexes/columns nullable/default-safe).
- Backfill async or chunked.
- Switch reads/writes via feature flags.
- Remove old structures only after cutover verification.

## 5. Migration metadata standard
For every migration document include:
- filename
- purpose
- dependencies
- UP SQL
- DOWN SQL
- indexes
- constraints
- risk notes

## 6. Rollback strategy
- Rollback only by phase boundary in production.
- Data-destructive DOWN requires explicit maintenance window.
- Keep pre-migration backup snapshot and row-count checksums.

## 7. Verification checklist per phase
- schema created
- constraints valid
- indexes usable (`EXPLAIN`)
- smoke DML works
- rollback tested in staging
