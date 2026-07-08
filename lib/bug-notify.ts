import { prisma } from '@/lib/prisma'
import { BUG_STATUS_LABELS } from '@/lib/bugs'

export async function notifyBugReportReceived(userId: string, bugId: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'BUG_REPORT_RECEIVED',
      title: 'Bug report received',
      message: `Thanks for the report! We've logged it as ${bugId} and our team will take a look.`,
    },
  })
}

export async function notifyBugReportStatusChanged(userId: string, bugId: string, status: string) {
  const isResolved = status === 'FIXED' || status === 'CLOSED'
  await prisma.notification.create({
    data: {
      userId,
      type: isResolved ? 'BUG_REPORT_RESOLVED' : 'BUG_REPORT_STATUS_CHANGED',
      title: isResolved ? 'Your bug report was resolved' : 'Bug report status updated',
      message: `${bugId} is now marked as "${BUG_STATUS_LABELS[status] ?? status}".`,
    },
  })
}
