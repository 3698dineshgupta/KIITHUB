import { Metadata } from 'next'
import { ContactForm } from '@/components/contact/contact-form'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the KIIT Hub team — send us your email and issue and we\'ll reply directly.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us | KIIT Hub',
    description: 'Get in touch with the KIIT Hub team — send us your email and issue and we\'ll reply directly.',
    url: '/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | KIIT Hub',
    description: 'Get in touch with the KIIT Hub team — send us your email and issue and we\'ll reply directly.',
  },
}

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground">Have a question or issue? Leave your email and message and we&apos;ll reply directly.</p>
      </div>
      <ContactForm />
    </div>
  )
}
