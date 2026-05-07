# Submissions Module DB

## purpose
Capture report submissions and cell-level values per assignment.

## entities
- report_submissions
- report_submission_cells

## business rules
- one active submission record per assignment (or versioned with unique active constraint).
- patch cells allowed only in DRAFT/REJECTED.
- submit allowed only when mandatory cells valid.
- optimistic lock via `version`.

## relationships
- assignment 1:N submissions (or 1 active + historical revisions).
- submission 1:N cells.

## state machine
- DRAFT -> PENDING -> APPROVED|REJECTED.
- REJECTED -> PENDING (resubmit).

## permission scope
- `submissions.manage` for own org scope.
- approver actions delegated to approval module.

## query patterns
- my assignments inbox + latest submission state.
- submission detail with all cells.
- pending submissions by approver scope.

## index strategy
- submissions(assignment_id,status), unique(code).
- partial index pending approvals.
- cells(submission_id), unique(submission_id,indicator_id,attribute_id).

## async jobs/events
- `submission.submitted`, `submission.approved`, `submission.rejected`.
- trigger summary recompute on approved.

## anti-patterns tránh
- allowing direct DB edits on approved submissions.
- storing untyped value only; keep numeric projection for aggregations.
