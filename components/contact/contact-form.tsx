'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle, Send } from 'lucide-react'

export function ContactForm() {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name)
    // Deliberately not prefilling email from the account — the whole point
    // is letting the visitor give whichever personal address they actually
    // want the reply sent to.
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || message.trim().length < 10) {
      setError('Please provide your email and a message (at least 10 characters).')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <Card className="p-10 text-center max-w-lg mx-auto">
        <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
        <h2 className="font-semibold text-lg mb-1">Message sent</h2>
        <p className="text-sm text-muted-foreground">We&apos;ll get back to you at <strong>{email}</strong> as soon as we can.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6 sm:p-8 max-w-lg mx-auto">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm mb-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="contact-name" className="mb-1.5 block">Name (optional)</Label>
          <Input id="contact-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="contact-email" className="mb-1.5 block">Your Email *</Label>
          <Input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <p className="text-xs text-muted-foreground mt-1">We&apos;ll reply to this address, so make sure it&apos;s one you actually check.</p>
        </div>
        <div>
          <Label htmlFor="contact-message" className="mb-1.5 block">Your Message *</Label>
          <textarea
            id="contact-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell us what's going on..."
            rows={5}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Message
        </Button>
      </form>
    </Card>
  )
}
