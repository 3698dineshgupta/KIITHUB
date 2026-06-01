'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Crown, CheckCircle, Loader2 } from 'lucide-react'
import { formatDate, isPremiumActive, daysLeft } from '@/lib/utils'
import Link from 'next/link'

export function ProfileForm({ user }: { user: any }) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [college, setCollege] = useState(user.college ?? '')
  const [university, setUniversity] = useState(user.university ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const premium = isPremiumActive(user.membershipStatus, user.membershipExpiry)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, college, university }) })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Membership card */}
      <Card className={premium ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">Membership</span>
              {premium
                ? <Badge variant="premium" className="gap-1"><Crown className="h-3 w-3"/>Premium</Badge>
                : user.membershipStatus === 'PENDING'
                ? <Badge variant="warning">Pending Verification</Badge>
                : <Badge variant="secondary">Free</Badge>
              }
            </div>
            <p className="text-sm text-muted-foreground">
              {premium ? `Expires in ${daysLeft(user.membershipExpiry)} days (${formatDate(user.membershipExpiry)})` : 'Upgrade for unlimited access'}
            </p>
          </div>
          {!premium && user.membershipStatus !== 'PENDING' && (
            <Link href="/premium"><Button variant="premium" size="sm" className="gap-2"><Crown className="h-4 w-4"/>Upgrade — ₹299/yr</Button></Link>
          )}
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent>
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 text-sm mb-4">
              <CheckCircle className="h-4 w-4"/>Profile updated!
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="mb-1.5 block">Full Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required/></div>
              <div><Label className="mb-1.5 block">Email</Label><Input value={user.email} disabled className="opacity-60"/></div>
              <div><Label className="mb-1.5 block">College</Label><Input value={college} onChange={e=>setCollege(e.target.value)} placeholder="e.g. KIIT University"/></div>
              <div><Label className="mb-1.5 block">University</Label><Input value={university} onChange={e=>setUniversity(e.target.value)} placeholder="e.g. KIIT"/></div>
            </div>
            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground border-t">
              <span>Role: <strong>{user.role}</strong></span>
              <span>Member since: <strong>{formatDate(user.createdAt)}</strong></span>
            </div>
            <Button type="submit" disabled={saving} className="gap-2">{saving&&<Loader2 className="h-4 w-4 animate-spin"/>}Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
