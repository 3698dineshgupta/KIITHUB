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
  const [uploadingQr, setUploadingQr] = useState(false)
  const [uploadError, setUploadError] = useState('')

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

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQr(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/admin/settings/upload-qr', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      set('bankQrCode', data.url)
    } catch (err: any) {
      setUploadError(err.message || 'QR upload failed')
    } finally {
      setUploadingQr(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle className="h-4 w-4" />Settings saved successfully!
        </div>
      )}

      {/* Group 1: Subscription Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-amber-600 font-semibold">Subscription Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Subscription Price</Label>
            <Input
              value={values.premium_price ?? '299'}
              onChange={e => set('premium_price', e.target.value)}
              placeholder="299"
              type="number"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Validity Days</Label>
            <Input
              value={values.premium_days ?? '365'}
              onChange={e => set('premium_days', e.target.value)}
              placeholder="365"
              type="number"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Currency Symbol</Label>
            <Input
              value={values.currency_symbol ?? '₹'}
              onChange={e => set('currency_symbol', e.target.value)}
              placeholder="₹"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Currency Code</Label>
            <Input
              value={values.currency_code ?? 'INR'}
              onChange={e => set('currency_code', e.target.value)}
              placeholder="INR"
            />
          </div>
        </CardContent>
      </Card>

      {/* Group 2: Payment Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-amber-600 font-semibold">Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block">UPI ID</Label>
            <Input
              value={values.upi_id ?? 'pay@kiithub'}
              onChange={e => set('upi_id', e.target.value)}
              placeholder="pay@kiithub"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Payment Instructions</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={values.payment_instructions ?? 'Scan the QR code and pay the amount. Enter transaction ID and upload screenshot.'}
              onChange={e => set('payment_instructions', e.target.value)}
              placeholder="Instructions shown on payment page..."
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Payment QR Code</Label>
            <div className="flex items-start gap-4 flex-wrap">
              {values.bankQrCode ? (
                <div className="border rounded-xl p-2 bg-white flex-shrink-0">
                  <img src={values.bankQrCode} alt="Payment QR Code" className="w-32 h-32 object-contain" />
                </div>
              ) : (
                <div className="w-32 h-32 border border-dashed rounded-xl bg-muted/30 flex items-center justify-center text-xs text-muted-foreground text-center flex-shrink-0">No QR Code Uploaded</div>
              )}
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Input
                  value={values.bankQrCode ?? ''}
                  onChange={e => set('bankQrCode', e.target.value)}
                  placeholder="QR Code image URL (or upload below)"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
                    {uploadingQr ? 'Uploading QR...' : 'Upload QR Code Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploadingQr} />
                  </label>
                  {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group 3: Premium Features */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-amber-600 font-semibold">Premium Features List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="mb-1.5 block">Features (One feature per line)</Label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.premium_features ?? 'All notes & PYQs unlocked\nLab manuals & assignments\nUnlimited downloads\nEarly access to new content\nAd-free experience\nPriority support'}
            onChange={e => set('premium_features', e.target.value)}
            placeholder="Enter features list..."
          />
        </CardContent>
      </Card>

      {/* Group 4: Custom Messages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-amber-600 font-semibold">Custom Notification Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Approval Success Message</Label>
            <textarea
              className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={values.message_approved ?? 'Your premium membership is now active. Enjoy unlimited access!'}
              onChange={e => set('message_approved', e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Pending Review Message</Label>
            <textarea
              className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={values.message_pending ?? 'Your payment is being verified. Activation within 24 hours.'}
              onChange={e => set('message_pending', e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Rejection Message</Label>
            <textarea
              className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={values.message_rejected ?? 'Your payment could not be verified. Please contact support or resubmit.'}
              onChange={e => set('message_rejected', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </form>
  )
}
