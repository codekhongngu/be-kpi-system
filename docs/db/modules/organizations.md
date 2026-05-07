# Organizations Module DB

## purpose
Manage administrative hierarchy and data-scope boundaries.

## entities
- organizations
- (recommended) organization_closure

## business rules
- code unique.
- no cycle in parent tree.
- level consistent with parent.
- can_assign_reports governs assignment eligibility.

## relationships
- self hierarchy parent_id.
- users.org_id -> organizations.id.

## state machine
- org lifecycle: active/inactive (+ soft deleted).

## permission scope
- `orgs.manage` for write.
- read scope by ancestor-descendant relationship.

## query patterns
- subtree lookup.
- ancestor chain lookup.
- active assignable org list.

## index strategy
- organizations(parent_id), (level,is_active), (can_assign_reports,is_active).
- closure PK(ancestor_id,descendant_id), idx(descendant_id,ancestor_id).

## async jobs/events
- on org move, rebuild closure rows.

## anti-patterns tránh
- recursive scans without closure on large trees.
- hard delete org with existing transactional references.
