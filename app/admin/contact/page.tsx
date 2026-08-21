import { prisma } from '@/lib/prisma'
import { AdminContactTable } from '@/components/admin/contact-table'

export default async function AdminContactPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Contact Messages</h1><p className="text-muted-foreground">{messages.length} messages from the contact form</p></div>
      <AdminContactTable messages={messages} />
    </div>
  )
}
