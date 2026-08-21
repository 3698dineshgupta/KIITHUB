import { prisma } from '@/lib/prisma'
import { REQUEST_STATUS_LABELS } from '@/lib/requests'

export async function notifyRequestReceived(userId: string, requestCode: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'REQUEST_RECEIVED',
      title: 'Request received',
      message: `Thanks! We've logged your request as ${requestCode} and our team will take a look.`,
    },
  })
}

export async function notifyRequestStatusChanged(userId: string, requestCode: string, status: string) {
  const isFulfilled = status === 'FULFILLED'
  await prisma.notification.create({
    data: {
      userId,
      type: isFulfilled ? 'REQUEST_FULFILLED' : 'REQUEST_STATUS_CHANGED',
      title: isFulfilled ? 'Your request was fulfilled' : 'Request status updated',
      message: `${requestCode} is now marked as "${REQUEST_STATUS_LABELS[status] ?? status}".`,
    },
  })
}
