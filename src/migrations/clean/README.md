# Clean Migration Tree

This tree is the only runtime migration path.

## Module order

1. `000-core`
2. `010-rbac`
3. `020-org`
4. `030-template`
5. `040-campaign`
6. `050-submission`
7. `060-analytics`
8. `070-governance`
9. `900-seed`

## Folder rules

- `schema/`: create tables, columns, indexes, constraints, and enums.
- `seed/`: insert default/reference/demo rows for that module.
- Keep module responsibilities narrow.
- Keep global demo users and cross-module seed data in `900-seed/`.
- Use simple numeric file names such as `001-init-core.ts`.

