import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/profile/profile-form'
import { ReferralDashboard } from '@/components/profile/referral-dashboard'
import { ReportBugTrigger } from '@/components/bugs/report-bug-trigger'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile Settings',
  robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, college: true, university: true, membershipStatus: true, membershipExpiry: true, role: true, createdAt: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <ProfileForm user={user} />
      <ReferralDashboard />
      <div className="flex justify-center pt-2">
        <ReportBugTrigger variant="outline" size="sm" pageUrl="/profile" />
      </div>
    </div>
  )
}
