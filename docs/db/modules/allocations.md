# Allocations Module DB

## purpose
Campaign lifecycle and org-indicator allocation dispatch.

## entities
- report_campaigns
- report_campaign_indicator_org_scopes
- report_assignments

## business rules
- campaign unique by (template_id, period_type, period_code).
- scope editable only in campaign DRAFT.
- assignments created only on confirm_dispatch.
- unique assignment per (campaign_id, org_id).
- template_type UNIQUE forbids duplicated indicator across org in same campaign.

## relationships
- campaign 1:N scopes.
- campaign 1:N assignments.
- assignment belongs to org + template snapshot context.

## state machine
- campaign: DRAFT -> DISPATCHED -> CLOSED/CANCELLED.
- assignment: ASSIGNED -> (IN_PROGRESS) -> SUBMITTED/OVERDUE/CANCELLED (logical status).

## permission scope
- `assignments.manage` + org hierarchy checks.

## query patterns
- list campaigns by status/deadline.
- list assignments by org/status/deadline.
- count assignment progress per campaign.

## index strategy
- campaigns(status,deadline_to), (template_id,status).
- scopes(campaign_id,org_id), unique(campaign_id,org_id,indicator_id).
- assignments(org_id,status,deadline_to), unique(campaign_id,org_id).

## async jobs/events
- `campaign.dispatched` -> bulk assignment creation.
- reminders for upcoming deadlines.

## anti-patterns tránh
- generating assignments before dispatch confirmation.
- mutating scopes after dispatch.
