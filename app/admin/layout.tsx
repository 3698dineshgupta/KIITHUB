import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/admin')

  // Fast-path: role is already embedded in the JWT — skip DB call if not ADMIN
  const sessionRole = (session.user as any).role
  if (sessionRole && sessionRole !== 'ADMIN') redirect('/')

  let user = null
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, role: true },
    })
  } catch (error) {
    console.error('Database error in AdminLayout:', error)
    redirect('/?error=Database_Unavailable')
  }

  if (!user || user.role !== 'ADMIN') redirect('/')

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      <AdminSidebar userName={user.name} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  )
}
