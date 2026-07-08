export function generateBugId(): string {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BUG-${time}-${rand}`
}

export const BUG_CATEGORIES = [
  'UI_ISSUE', 'PERFORMANCE', 'PDF_ISSUE', 'LOGIN_PROBLEM', 'PAYMENT_ISSUE',
  'PREMIUM_ISSUE', 'WRONG_CONTENT', 'MISSING_NOTES', 'MISSING_PYQS',
  'SECURITY_ISSUE', 'FEATURE_REQUEST', 'OTHER',
] as const

export const BUG_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const BUG_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'FIXED', 'CLOSED'] as const

export const BUG_CATEGORY_LABELS: Record<string, string> = {
  UI_ISSUE: 'UI Issue',
  PERFORMANCE: 'Performance',
  PDF_ISSUE: 'PDF Issue',
  LOGIN_PROBLEM: 'Login Problem',
  PAYMENT_ISSUE: 'Payment Issue',
  PREMIUM_ISSUE: 'Premium Issue',
  WRONG_CONTENT: 'Wrong Content',
  MISSING_NOTES: 'Missing Notes',
  MISSING_PYQS: 'Missing PYQs',
  SECURITY_ISSUE: 'Security Issue',
  FEATURE_REQUEST: 'Feature Request',
  OTHER: 'Other',
}

export const BUG_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  IN_PROGRESS: 'In Progress',
  FIXED: 'Fixed',
  CLOSED: 'Closed',
}
