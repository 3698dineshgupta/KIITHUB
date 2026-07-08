import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentDashboard } from '@/components/dashboard/student-dashboard'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login?callbackUrl=/dashboard')
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      bookmarks: { include: { note: { include: { subject:true,branch:true,semester:true,tags:true } }, pyq: { include: { subject:true,branch:true,semester:true } } }, take: 6, orderBy: { createdAt: 'desc' } },
      downloads: { include: { note: { select:{id:true,title:true,slug:true,isPremium:true,subject:{select:{name:true}}} }, pyq: { select:{id:true,title:true,slug:true,isPremium:true,subject:{select:{name:true}}} } }, take: 5, orderBy: { createdAt: 'desc' } },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      notifications: { where: { isRead: false }, take: 5, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!user) redirect('/login')
  return <StudentDashboard user={user} />
}
