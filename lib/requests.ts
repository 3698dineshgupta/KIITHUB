export function generateRequestCode(): string {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `REQ-${time}-${rand}`
}

export const REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS', 'FULFILLED', 'REJECTED'] as const

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  FULFILLED: 'Fulfilled',
  REJECTED: 'Rejected',
}
