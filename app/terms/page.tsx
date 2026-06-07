import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | KIIT Hub',
  description: 'Terms of Service and usage rules for KIIT Hub.',
}

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 prose dark:prose-invert">
      <h1 className="text-4xl font-black tracking-tight mb-8">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
        <p>By accessing and using KIIT Hub, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">2. Usage Rules & Conduct</h2>
        <p>You agree to use the platform only for lawful purposes. You must not:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Share your premium account credentials with others.</li>
          <li>Scrape, download in bulk, or distribute our premium content outside the platform.</li>
          <li>Upload malicious files or spam in any interactive sections.</li>
        </ul>
        <p>Violation of these rules may result in immediate suspension of your account without refund.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">3. Premium Subscriptions & Payment Policy</h2>
        <p>We offer a Premium Subscription providing full access to our exclusive study materials. By purchasing Premium, you agree to the following:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Verification:</strong> Payments are verified manually via UPI screenshot submissions. Activation may take up to 24 hours.</li>
          <li><strong>Duration:</strong> Subscriptions are valid for the specified duration (e.g., 365 days) from the date of activation.</li>
          <li><strong>No Refunds:</strong> Because KIIT Hub provides immediate access to digital goods and proprietary study materials, <strong>all payments are final and non-refundable</strong> once the subscription is activated.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">4. Liability Disclaimer</h2>
        <p>KIIT Hub provides educational resources "as is". While we strive for accuracy, we make no guarantees regarding the correctness, completeness, or currentness of the study materials (PYQs, Notes, etc.). We are not liable for any academic outcomes, loss of data, or damages arising from the use of our service.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">5. Modifications to Service</h2>
        <p>We reserve the right to modify or discontinue the service (or any part thereof) with or without notice. We shall not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the service.</p>
      </section>
    </div>
  )
}
