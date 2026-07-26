'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Loader2, AlertCircle, Paperclip, Video } from 'lucide-react'
import { useBugReportStore } from '@/store'
import { getClientEnvironmentInfo } from '@/lib/client-ua'
import { BUG_CATEGORIES, BUG_SEVERITIES, BUG_CATEGORY_LABELS } from '@/lib/bugs'

const APP_VERSION = '1.0.0'

export function ReportBugDialog() {
  const isOpen = useBugReportStore(s => s.isOpen)
  const pageUrl = useBugReportStore(s => s.pageUrl)
  const close = useBugReportStore(s => s.close)
  const pathname = usePathname()
  const { data: session } = useSession()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('UI_ISSUE')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')
  const [contactEmail, setContactEmail] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [recording, setRecording] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successBugId, setSuccessBugId] = useState<string | null>(null)
  const screenshotRef = useRef<HTMLInputElement>(null)
  const recordingRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session?.user?.email) setContactEmail(session.user.email)
  }, [session])

  const resetForm = () => {
    setTitle(''); setCategory('UI_ISSUE'); setDescription(''); setSteps('')
    setExpected(''); setActual(''); setSeverity('MEDIUM')
    setScreenshot(null); setRecording(null); setError(''); setSuccessBugId(null)
  }

  const handleClose = () => {
    close()
    setTimeout(resetForm, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 3 || description.trim().length < 10) {
      setError('Please provide a title and a description (at least 10 characters).')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const env = getClientEnvironmentInfo()
      const form = new FormData()
      form.set('title', title.trim())
      form.set('category', category)
      form.set('description', description.trim())
      if (steps.trim()) form.set('stepsToReproduce', steps.trim())
      if (expected.trim()) form.set('expectedBehavior', expected.trim())
      if (actual.trim()) form.set('actualBehavior', actual.trim())
      form.set('severity', severity)
      form.set('pageUrl', typeof window !== 'undefined' ? window.location.href : (pageUrl || pathname))
      form.set('browserInfo', env.browserInfo)
      form.set('deviceInfo', env.deviceInfo)
      form.set('os', env.os)
      form.set('screenResolution', env.screenResolution)
      form.set('appVersion', APP_VERSION)
      if (contactEmail.trim()) form.set('contactEmail', contactEmail.trim())
      if (screenshot) form.set('screenshot', screenshot)
      if (recording) form.set('recording', recording)

      const res = await fetch('/api/bugs', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit report')

      setSuccessBugId(data.bugId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
        </DialogHeader>

        {successBugId ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
            <p className="font-semibold">Thanks for the report!</p>
            <p className="text-sm text-muted-foreground">
              Your report ID is <code className="px-1.5 py-0.5 rounded bg-muted font-mono">{successBugId}</code>.
              {session?.user ? ' You can track its status from My Reports.' : ''}
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}

            <div>
              <Label htmlFor="bug-title" className="mb-1.5 block">Bug Title</Label>
              <Input id="bug-title" name="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Short summary of the issue" required maxLength={150} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bug-category" className="mb-1.5 block">Category</Label>
                <Select value={category} onValueChange={setCategory} name="category">
                  <SelectTrigger id="bug-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUG_CATEGORIES.map(c => <SelectItem key={c} value={c}>{BUG_CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bug-severity" className="mb-1.5 block">Severity</Label>
                <Select value={severity} onValueChange={setSeverity} name="severity">
                  <SelectTrigger id="bug-severity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUG_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="bug-description" className="mb-1.5 block">Description</Label>
              <textarea
                id="bug-description"
                name="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What went wrong?"
                rows={3}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bug-expected" className="mb-1.5 block">Expected Behavior</Label>
                <textarea id="bug-expected" name="expectedBehavior" value={expected} onChange={e => setExpected(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y" />
              </div>
              <div>
                <Label htmlFor="bug-actual" className="mb-1.5 block">Actual Behavior</Label>
                <textarea id="bug-actual" name="actualBehavior" value={actual} onChange={e => setActual(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y" />
              </div>
            </div>

            <div>
              <Label htmlFor="bug-steps" className="mb-1.5 block">Steps to Reproduce</Label>
              <textarea id="bug-steps" name="stepsToReproduce" value={steps} onChange={e => setSteps(e.target.value)} rows={2} placeholder="1. Go to...&#10;2. Click on...&#10;3. See error" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y" />
            </div>

            <div>
              <Label htmlFor="bug-email" className="mb-1.5 block">Contact Email (optional)</Label>
              <Input id="bug-email" name="contactEmail" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bug-screenshot" className="inline-flex items-center gap-2 w-full justify-center rounded-md text-sm font-medium border border-input hover:bg-accent h-9 px-3 cursor-pointer">
                  <Paperclip className="h-3.5 w-3.5" />{screenshot ? screenshot.name.slice(0, 14) : 'Screenshot'}
                  <input id="bug-screenshot" name="screenshot" ref={screenshotRef} type="file" accept="image/*" className="hidden" onChange={e => setScreenshot(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <label htmlFor="bug-recording" className="inline-flex items-center gap-2 w-full justify-center rounded-md text-sm font-medium border border-input hover:bg-accent h-9 px-3 cursor-pointer">
                  <Video className="h-3.5 w-3.5" />{recording ? recording.name.slice(0, 14) : 'Recording'}
                  <input id="bug-recording" name="recording" ref={recordingRef} type="file" accept="video/*" className="hidden" onChange={e => setRecording(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              We automatically attach the current page URL, browser, device, and OS to help us diagnose the issue.
            </p>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
