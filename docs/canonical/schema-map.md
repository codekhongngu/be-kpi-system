# Schema Map

## 1. Identity & Access

| Table | Purpose |
| --- | --- |
| `users` | user account, org link, status, password and lock info |
| `roles` | RBAC role master |
| `permissions` | permission master |
| `user_roles` | user-role mapping |
| `role_permissions` | role-permission mapping |
| `auth_refresh_tokens` | refresh token lifecycle |
| `auth_password_resets` | password reset lifecycle |

## 2. Organization

| Table | Purpose |
| --- | --- |
| `organizations` | org tree node |
| `organization_closure` | closure table for ancestor/descendant query |

## 3. Template metadata

| Table | Purpose |
| --- | --- |
| `form_templates` | template master |
| `form_template_attributes` | column metadata, tree structure |
| `form_template_indicators` | row metadata, tree structure |
| `form_template_cell_configs` | cell rules |
| `form_template_indicator_org_rules` | default indicator-org scope |
| `field_categories` | category master |
| `indicator_catalog` | indicator catalog |

## 4. Campaign and allocation

| Table | Purpose |
| --- | --- |
| `report_campaigns` | campaign master |
| `report_campaign_indicator_org_scopes` | campaign scope snapshot |
| `report_campaign_default_values` | campaign shared default values |
| `report_assignments` | org-level assignment |

## 5. Submission and approval

| Table | Purpose |
| --- | --- |
| `report_submissions` | submission state and approval metadata |
| `report_submission_cells` | submission cell values |
| `submission_flow_logs` | submission transition history |

## 6. Analytics

| Table | Purpose |
| --- | --- |
| `report_summaries` | derived summary read model |

## 7. Governance

| Table | Purpose |
| --- | --- |
| `audit_logs` | immutable audit trail |
| `app_outbox_events` | outbox / notification event stream |

## 8. Current code notes

This section keeps the canonical doc aligned with code without mixing it into the core model.

### Submission
- `report_submissions` currently stores `note`, `reject_reason`, `completion_pct`, `submitted_by`, `department_approved_*`, `district_approved_*`.

### Campaign
- `report_campaigns` currently includes operational fields such as `period_name`, `created_by`, `dispatched_by`.

### Assignments
- `report_assignments` currently uses `is_cancelled` and `cancel_reason`.
- Code uses `batchId` as the TS property name for `campaign_id`.

### Template
- `form_template_cell_configs` still has `default_value` in code, but canonical flow should treat campaign default values as the runtime source.

### Governance
- `audit_logs` uses `entityType/entityId/oldValues/newValues`.
- `app_outbox_events` is currently modeled by the notification entity in code.

