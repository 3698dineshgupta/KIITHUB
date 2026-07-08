'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Crown, Check, Upload, Loader2, AlertCircle, Sparkles, Clock, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const DEFAULT_BENEFITS = [
  'All notes & PYQs unlocked',
  'Lab manuals & assignments',
  'Premium viewing features',
  'Early access to new content',
  'Ad-free experience',
  'Priority support'
]

const STEPS = [
  { n: 1, t: 'Scan QR Code', d: 'Open any UPI app, scan the QR code and make payment.' },
  { n: 2, t: 'Take Screenshot', d: 'Capture the receipt showing successful transaction.' },
  { n: 3, t: 'Submit Payment Proof', d: 'Upload the screenshot and type in your Transaction ID.' },
  { n: 4, t: 'Account Activated', d: 'Admins verify within 24 hours and activate Premium.' }
]

export interface PremiumSettings {
  bankQrCode: string | null
  premiumPrice: string | null
  currencySymbol: string
  currencyCode: string
  premiumDays: string | null
  upiId: string
  paymentInstructions: string
  premiumFeatures: string[]
  msgPending: string
}

export function PremiumContent({ settings }: { settings: PremiumSettings }) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [txnId, setTxnId] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { bankQrCode, premiumPrice, currencySymbol, premiumDays, upiId, paymentInstructions, msgPending, premiumFeatures } = settings

  const [expiryText, setExpiryText] = useState('')
  const [daysLeftVal, setDaysLeftVal] = useState<number | null>(null)

  const user = session?.user as any
  const isPremium = user?.membershipStatus === 'PREMIUM'
  const isPending = user?.membershipStatus === 'PENDING'

  // Calculate timer & remaining days for active premium user
  useEffect(() => {
    if (!isPremium || !user?.membershipExpiry) return
    const expiryDate = new Date(user.membershipExpiry).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diff = expiryDate - now
      if (diff <= 0) {
        setExpiryText('Expired')
        setDaysLeftVal(0)
        return
      }
      const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      setDaysLeftVal(days)

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      const h = String(hours).padStart(2, '0')
      const m = String(mins).padStart(2, '0')
      const s = String(secs).padStart(2, '0')

      setExpiryText(`${h}:${m}:${s}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isPremium, user?.membershipExpiry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) { router.push('/login?callbackUrl=/premium'); return }
    if (!txnId || !screenshot) { setError('Transaction ID and screenshot required'); return }
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('transactionId', txnId)
      form.append('screenshot', screenshot)
      if (notes) form.append('notes', notes)
      const res = await fetch('/api/payment', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      await update()
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const activeFeatures = premiumFeatures.length > 0 ? premiumFeatures : DEFAULT_BENEFITS

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 rounded-3xl bg-amber-100 dark:bg-amber-950/40 mb-4 animate-bounce">
          <Crown className="h-10 w-10 text-amber-600 dark:text-amber-500" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">KIIT Hub Premium</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Unlock the ultimate study tools and succeed in your academics without constraints
        </p>
      </div>

      {/* 1. PREMIUM ACTIVE BOARD (Requirement 8) */}
      {isPremium && (
        <Card className="mb-10 overflow-hidden border-2 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 max-w-2xl mx-auto shadow-lg shadow-emerald-500/5">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="p-3 bg-emerald-500 rounded-2xl text-white">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <Badge variant="success" className="text-sm font-semibold tracking-wider uppercase mb-1">
                  Premium Membership Active
                </Badge>
                <h2 className="text-2xl font-bold mt-1 text-emerald-800 dark:text-emerald-400">KIIT Hub Premium Pro</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
                <div className="bg-background rounded-xl p-4 border shadow-sm">
                  <span className="text-xs text-muted-foreground block mb-0.5">Expires On:</span>
                  <span className="text-sm font-bold text-foreground">
                    {user?.membershipExpiry ? new Date(user.membershipExpiry).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                <div className="bg-background rounded-xl p-4 border shadow-sm">
                  <span className="text-xs text-muted-foreground block mb-0.5">Remaining:</span>
                  <span className="text-sm font-bold text-foreground">{daysLeftVal ?? 0} Days</span>
                </div>
              </div>

              {expiryText && expiryText !== 'Expired' && (
                <div className="text-xs text-emerald-700 dark:text-emerald-500/80 font-medium tabular-nums flex items-center gap-1.5 bg-emerald-100/50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" /> Expiry countdown: {expiryText}
                </div>
              )}

              <div className="pt-2">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold" onClick={() => router.push('/notes')}>
                  Browse Premium Materials
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. PENDING ACTIVE BOARD */}
      {isPending && (
        <Card className="mb-10 border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 max-w-2xl mx-auto shadow-lg shadow-amber-500/5">
          <CardContent className="p-8 text-center space-y-5">
            <Loader2 className="h-12 w-12 text-amber-500 mx-auto animate-spin" />
            <div>
              <Badge variant="warning" className="text-sm font-semibold uppercase tracking-wider mb-2">
                Verification Pending
              </Badge>
              <h2 className="text-xl font-bold text-amber-700 dark:text-amber-500">Payment Under Review</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">{msgPending}</p>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => router.push('/notes')}>Explore Free Notes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. SUBSCRIPTION BOARD (Only visible to non-premium & non-pending users) */}
      {!isPremium && !isPending && (
        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* Left panel: pricing & benefits */}
          <div className="space-y-6">
            <Card className="border-2 border-amber-300 dark:border-amber-700 overflow-hidden shadow-md">
              <div className="p-6 bg-amber-500/5 dark:bg-amber-500/10">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <div className="text-4xl font-extrabold text-amber-600 dark:text-amber-500 tabular-nums">
                      {premiumPrice === null ? (
                        <span className="animate-pulse bg-amber-200 dark:bg-amber-900/50 h-10 w-24 rounded-md inline-block"></span>
                      ) : (
                        `${currencySymbol}${premiumPrice}`
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {premiumDays === null ? (
                        <span className="animate-pulse bg-muted h-4 w-32 rounded-md inline-block mt-1"></span>
                      ) : (
                        `for ${premiumDays} days validity`
                      )}
                    </div>
                  </div>
                  <Badge variant="premium" className="px-3 py-1 text-xs font-semibold bg-amber-500 text-white">
                    <Sparkles className="h-3 w-3 mr-1" /> Premium Plan
                  </Badge>
                </div>

                <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground mb-4">Membership Benefits</h3>
                <ul className="space-y-3">
                  {activeFeatures.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-foreground/90">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">How it works</h3>
              <div className="space-y-4">
                {STEPS.map(s => (
                  <div key={s.n} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {s.n}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{s.t}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right panel: Payment & Uploader */}
          <div className="space-y-6">
            <Card className="p-6 text-center shadow-md">
              <h3 className="font-bold text-base mb-3">UPI QR Payment Scan</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
                {paymentInstructions}
              </p>

              {bankQrCode ? (
                <div className="mx-auto mb-4 p-3 bg-white rounded-2xl border-2 border-dashed border-amber-300 inline-block shadow-sm">
                  <img src={bankQrCode} alt="Payment QR Code" loading="lazy" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto border-2 border-dashed rounded-2xl bg-muted/40 flex items-center justify-center text-xs text-muted-foreground text-center mb-4 leading-relaxed p-4">
                  QR Code Image Not Set<br/>(Configure in settings)
                </div>
              )}

              <div className="bg-muted/50 rounded-xl py-2 px-4 inline-flex items-center gap-2 border">
                <span className="text-xs text-muted-foreground font-semibold uppercase">UPI ID:</span>
                <span className="text-sm font-bold text-foreground tracking-wider select-all">{upiId}</span>
              </div>
            </Card>

            {submitted ? (
              <Card className="p-8 text-center border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 shadow-md">
                <Check className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">Receipt Submitted</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                  We have received your receipt. The administrator is verifying details now.
                </p>
              </Card>
            ) : (
              <Card className="p-6 shadow-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-bold text-base mb-2">Upload Payment Proof</h3>

                  {error && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold leading-relaxed border border-red-200/50 dark:border-red-950/40">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <div>{error}</div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">UPI Transaction ID *</Label>
                    <Input
                      value={txnId}
                      onChange={e => setTxnId(e.target.value)}
                      placeholder="e.g. 123456789012"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Payment Screenshot *</Label>
                    <label className="flex items-center gap-3 w-full h-11 px-3 rounded-lg border border-dashed border-input cursor-pointer hover:border-amber-400 hover:bg-muted/10 transition-all select-none">
                      <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1 text-left">
                        {screenshot ? screenshot.name : 'Click to select screenshot image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => setScreenshot(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">Notes (Optional)</Label>
                    <Input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any notes for administration..."
                      className="h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="premium"
                    className="w-full gap-2 text-white bg-amber-600 hover:bg-amber-700 font-bold tracking-wide shadow-md shadow-amber-600/10 cursor-pointer h-11"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting proof...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4" /> Submit Payment Proof
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
