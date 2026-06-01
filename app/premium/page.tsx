'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Crown, Check, Upload, Loader2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const BENEFITS = ['All notes & PYQs unlocked','Lab manuals & assignments','Unlimited downloads','Early access to new content','Ad-free experience','Priority support']
const STEPS = [{n:1,t:'Scan QR Code',d:'Open any UPI app, scan QR and pay ₹299'},{n:2,t:'Take Screenshot',d:'Screenshot of the successful payment'},{n:3,t:'Submit Here',d:'Upload screenshot + enter transaction ID'},{n:4,t:'Get Activated',d:'Admin verifies within 24 hours'}]

export default function PremiumPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [txnId, setTxnId] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const user = session?.user as any
  const isPremium = user?.membershipStatus === 'PREMIUM'
  const isPending = user?.membershipStatus === 'PENDING'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) { router.push('/login?callbackUrl=/premium'); return }
    if (!txnId || !screenshot) { setError('Transaction ID and screenshot required'); return }
    setSubmitting(true); setError('')
    try {
      const form = new FormData()
      form.append('transactionId', txnId)
      form.append('screenshot', screenshot)
      if (notes) form.append('notes', notes)
      const res = await fetch('/api/payment', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
    } catch (err: any) { setError(err.message) }
    setSubmitting(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex p-4 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4"><Crown className="h-10 w-10 text-amber-600" /></div>
        <h1 className="text-4xl font-bold mb-3">Upgrade to Premium</h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">Get unlimited access to all study materials for just ₹299/year</p>
      </div>

      {isPremium && <Card className="mb-8 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center"><Crown className="h-10 w-10 text-emerald-600 mx-auto mb-3" /><h2 className="text-xl font-bold text-emerald-700 mb-2">You&apos;re already Premium!</h2><p className="text-muted-foreground mb-4">Enjoy full access to all study materials.</p><Button onClick={() => router.push('/notes')}>Browse Materials</Button></Card>}
      {isPending && <Card className="mb-8 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-8 text-center"><Loader2 className="h-10 w-10 text-amber-600 mx-auto mb-3 animate-spin" /><h2 className="text-xl font-bold text-amber-700 mb-2">Payment Under Review</h2><p className="text-muted-foreground">Your payment is being verified. Activation within 24 hours.</p></Card>}

      {!isPremium && !isPending && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-6 border-2 border-amber-300 dark:border-amber-700">
              <div className="flex items-baseline justify-between mb-4">
                <div><div className="text-4xl font-black text-amber-600">₹299</div><div className="text-sm text-muted-foreground">per year</div></div>
                <Badge variant="premium">Best Value</Badge>
              </div>
              <ul className="space-y-2.5 mb-2">{BENEFITS.map(b=><li key={b} className="flex items-center gap-2.5 text-sm"><div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><Check className="h-3 w-3 text-white"/></div>{b}</li>)}</ul>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">How it works</h3>
              <div className="space-y-3">{STEPS.map(s=><div key={s.n} className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">{s.n}</div><div><div className="font-medium text-sm">{s.t}</div><div className="text-xs text-muted-foreground">{s.d}</div></div></div>)}</div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-6 text-center">
              <p className="font-semibold mb-3">Scan & Pay ₹299</p>
              <div className="w-44 h-44 mx-auto border-2 border-dashed rounded-xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground mb-3">QR Code<br/>(Admin sets in Settings)</div>
              <div className="text-sm text-muted-foreground">UPI: <span className="font-medium text-foreground">pay@kiithub</span></div>
            </Card>

            {submitted ? (
              <Card className="p-8 text-center border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                <Check className="h-12 w-12 text-emerald-600 mx-auto mb-3"/><h3 className="text-xl font-bold text-emerald-700 mb-2">Submitted!</h3>
                <p className="text-sm text-muted-foreground">Your request is under review. You&apos;ll be notified within 24 hours.</p>
              </Card>
            ) : (
              <Card className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-semibold">Upload Payment Proof</h3>
                  {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm"><AlertCircle className="h-4 w-4 flex-shrink-0"/>{error}</div>}
                  <div><Label className="mb-1.5 block">Transaction ID *</Label><Input value={txnId} onChange={e=>setTxnId(e.target.value)} placeholder="UPI transaction ID" required /></div>
                  <div>
                    <Label className="mb-1.5 block">Payment Screenshot *</Label>
                    <label className="flex items-center gap-3 w-full h-12 px-3 rounded-lg border border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                      <span className="text-sm text-muted-foreground truncate">{screenshot ? screenshot.name : 'Click to upload screenshot'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e=>setScreenshot(e.target.files?.[0]??null)}/>
                    </label>
                  </div>
                  <div><Label className="mb-1.5 block">Notes (optional)</Label><Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any additional info..." /></div>
                  <Button type="submit" variant="premium" className="w-full gap-2" disabled={submitting} size="lg">{submitting?<><Loader2 className="h-5 w-5 animate-spin"/>Submitting...</>:<><Crown className="h-5 w-5"/>Submit Payment Proof</>}</Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
