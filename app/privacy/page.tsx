import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy and Data Handling for KIIT Hub.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 prose dark:prose-invert">
      <h1 className="text-4xl font-black tracking-tight mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
        <p>When you use KIIT Hub, we may collect the following types of information:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Account Information:</strong> Your name, email address, profile picture (via Google OAuth), college, and university.</li>
          <li><strong>Usage Data:</strong> Information on how you interact with our platform, such as documents viewed, downloaded, or bookmarked.</li>
          <li><strong>Payment Information:</strong> For Premium subscriptions, we collect transaction IDs and payment proof screenshots. <em>Note: We do not process direct banking details; all payments are handled securely via standard UPI apps.</em></li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
        <p>We use the collected information for various purposes, including:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>To provide and maintain the KIIT Hub platform.</li>
          <li>To manage your Premium subscription and verify payments.</li>
          <li>To personalize your experience (e.g., suggesting relevant notes and tracking your CGPA).</li>
          <li>To communicate with you regarding updates, announcements, or security alerts.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">3. Data Sharing & Security</h2>
        <p>We value your privacy and do not sell your personal data to third parties. We may share necessary data with trusted service providers (e.g., database hosting, Telegram Bot for admin verification) solely to operate the platform.</p>
        <p>While we use industry-standard security measures (including secure database pooling and JWT session tokens) to protect your data, no method of transmission over the Internet is 100% secure.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">4. Cookies and Local Storage</h2>
        <p>We use cookies and local storage to manage your active sessions (authentication) and store local preferences (such as dark mode settings). You can instruct your browser to refuse cookies, but some parts of the service may not function properly.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">5. Contact Us</h2>
        <p>If you have any questions or concerns about this Privacy Policy, please contact us at support.kiithub@gmail.com.</p>
      </section>
    </div>
  )
}
