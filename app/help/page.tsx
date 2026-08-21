import { Metadata } from 'next'
import Link from 'next/link'
import { HelpCircle, Bug, Mail, BookOpen, FileText, Crown } from 'lucide-react'
import { ReportBugTrigger } from '@/components/bugs/report-bug-trigger'

export const metadata: Metadata = {
  title: 'Help & Support',
  description: 'Get help with KIIT Hub — report bugs, ask questions, and find answers.',
  alternates: { canonical: '/help' },
}

const faqs = [
  { q: 'How do I unlock Premium?', a: 'Purchase Premium from the Premium page, or refer 10 friends using your referral link from your Profile to unlock it automatically for free.', icon: Crown },
  { q: 'A note or PYQ won\'t open — what should I do?', a: 'Try refreshing the page. If the issue persists, use "Report a Bug" below with the Page URL so we can investigate.', icon: FileText },
  { q: 'I found incorrect or missing content', a: 'Please report it using "Report a Bug" and select "Wrong Content", "Missing Notes", or "Missing PYQs" as the category.', icon: BookOpen },
]

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex p-3 rounded-full bg-primary/10 mb-4"><HelpCircle className="h-8 w-8 text-primary" /></div>
        <h1 className="text-3xl font-bold mb-2">Help &amp; Support</h1>
        <p className="text-muted-foreground">Find answers, report issues, or get in touch with the KIIT Hub team.</p>
      </div>

      <div className="space-y-4 mb-10">
        {faqs.map(f => (
          <div key={f.q} className="rounded-xl border p-4 flex gap-3">
            <f.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">{f.q}</p>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-6 text-center space-y-3 bg-muted/30">
        <Bug className="h-8 w-8 text-primary mx-auto" />
        <h2 className="font-semibold text-lg">Found a bug or have a suggestion?</h2>
        <p className="text-sm text-muted-foreground">Let us know — UI issues, broken links, incorrect notes, security concerns, or feature ideas.</p>
        <div className="flex justify-center">
          <ReportBugTrigger variant="default" size="default" pageUrl="/help" />
        </div>
        <p className="text-xs text-muted-foreground pt-2 flex items-center justify-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />Or use our <Link href="/contact" className="underline hover:text-foreground">Contact form</Link> to reach us directly by email
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Already submitted a report? <Link href="/my-reports" className="text-primary hover:underline font-medium">Track its status</Link>
      </p>
    </div>
  )
}
