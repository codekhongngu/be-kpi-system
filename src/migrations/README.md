# Migration Layout

This folder is organized for full database rebuilds.

## Runtime structure

```text
src/migrations/clean/
  000-core/
    schema/
  010-rbac/
    schema/
    seed/
  020-org/
    schema/
    seed/
  030-template/
    schema/
    seed/
  040-campaign/
    schema/
  050-submission/
    schema/
  060-analytics/
    schema/
  070-governance/
    schema/
  900-seed/
    seed/
```

## Rules

- `schema/` contains table creation, columns, constraints, and indexes.
- `seed/` contains reference or demo data needed after schema creation.
- Keep module folders ordered by dependency, not by historical accident.
- Use simple numeric filenames such as `001-init-core.ts`, `001-default-rbac.ts`.
- Keep global demo users and late-bound reference data in `900-seed/`.
- `database.config.ts` loads everything under `clean/**`.

## Order

Expected execution order is:

1. `000-core`
2. `010-rbac`
3. `020-org`
4. `030-template`
5. `040-campaign`
6. `050-submission`
7. `060-analytics`
8. `070-governance`
9. `900-seed`
