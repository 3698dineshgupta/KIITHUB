'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2 } from 'lucide-react'

interface Props { settings: Record<string, string> }

export function AdminSettingsForm({ settings }: Props) {
  const router = useRouter()
  const [values, setValues] = useState({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch {}
    setSaving(false)
  }

  const groups = [
    {
      title: 'General',
      fields: [
        { key: 'app_name', label: 'App Name', placeholder: 'KIIT Hub' },
        { key: 'app_tagline', label: 'Tagline', placeholder: 'Your Complete Study Hub' },
        { key: 'support_email', label: 'Support Email', placeholder: 'support@kiithub.com' },
      ],
    },
    {
      title: 'Payment',
      fields: [
        { key: 'premium_price', label: 'Premium Price (₹)', placeholder: '299' },
        { key: 'premium_days', label: 'Premium Duration (days)', placeholder: '365' },
        { key: 'upi_id', label: 'UPI ID', placeholder: 'pay@kiithub' },
        { key: 'bankQrCode', label: 'Bank QR Code URL', placeholder: 'https://example.com/qr-code.png' },
      ],
    },
    {
      title: 'Announcements',
      fields: [
        { key: 'announcement', label: 'Site-wide Announcement', placeholder: 'Leave blank to disable...' },
      ],
    },
  ]

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle className="h-4 w-4" />Settings saved successfully!
        </div>
      )}

      {groups.map(group => (
        <Card key={group.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.fields.map(field => (
              <div key={field.key}>
                <Label className="mb-1.5 block">{field.label}</Label>
                <Input
                  value={values[field.key] ?? ''}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button type="submit" disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </form>
  )
}
