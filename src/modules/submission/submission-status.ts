export const LEGACY_SUBMISSION_STATUS_MAP: Record<string, string> = {
  DRAFTING: 'DRAFT',
  PENDING: 'PENDING_DEPARTMENT',
  SUBMITTED: 'PENDING_DEPARTMENT',
  APPROVED: 'DISTRICT_APPROVED',
  REJECTED: 'REJECTED_DEPARTMENT',
  COMPLETED: 'DISTRICT_APPROVED',
}

export const READ_ONLY_SUBMISSION_STATUSES = new Set([
  'PENDING_DEPARTMENT',
  'DEPARTMENT_APPROVED',
  'DISTRICT_APPROVED',
  'COMPLETED',
])

export const EDITABLE_SUBMISSION_STATUSES = new Set([
  'NOT_STARTED',
  'DRAFT',
  'REJECTED_DEPARTMENT',
  'REJECTED_DISTRICT',
])

export const REJECTED_SUBMISSION_STATUSES = new Set([
  'REJECTED_DEPARTMENT',
  'REJECTED_DISTRICT',
])

export function normalizeSubmissionStatus(
  status: string | null | undefined,
): string {
  const raw = (status ?? '').trim()
  return LEGACY_SUBMISSION_STATUS_MAP[raw] ?? raw
}

export function isSubmissionEditableStatus(
  status: string | null | undefined,
) {
  return EDITABLE_SUBMISSION_STATUSES.has(normalizeSubmissionStatus(status))
}

export function isSubmissionReadOnlyStatus(
  status: string | null | undefined,
) {
  return READ_ONLY_SUBMISSION_STATUSES.has(normalizeSubmissionStatus(status))
}

export function isSubmissionRejectedStatus(
  status: string | null | undefined,
) {
  return REJECTED_SUBMISSION_STATUSES.has(normalizeSubmissionStatus(status))
}
