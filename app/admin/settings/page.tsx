import { prisma } from '@/lib/prisma'
import { AdminSettingsForm } from '@/components/admin/settings-form'
export default async function AdminSettingsPage() {
  const settings = await prisma.setting.findMany({ orderBy: { group: 'asc' } })
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">Configure platform settings</p></div>
      <AdminSettingsForm settings={map} />
    </div>
  )
}
