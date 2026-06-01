import { prisma } from '@/lib/prisma'
import { AdminPaymentsTable } from '@/components/admin/payments-table'
export default async function AdminPaymentsPage() {
  const [payments, qrSetting] = await Promise.all([
    prisma.paymentRequest.findMany({
      include: { user: { select: { id:true, name:true, email:true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    }),
    prisma.setting.findUnique({
      where: { key: 'bankQrCode' },
    })
  ])

  const bankQrCode = qrSetting?.value || null

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Payments</h1><p className="text-muted-foreground">Review and approve premium payment requests</p></div>
      <AdminPaymentsTable payments={payments} bankQrCode={bankQrCode} />
    </div>
  )
}
