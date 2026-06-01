import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/profile/profile-form'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile Settings' }

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, college: true, university: true, membershipStatus: true, membershipExpiry: true, role: true, createdAt: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      <ProfileForm user={user} />
    </div>
  )
}
