import nodemailer from 'nodemailer'

// Contact-form and request-hub fields below are raw free text from users
// (the contact message especially — unauthenticated, public input) rendered
// directly into HTML email bodies, so they need escaping same as any other
// untrusted-HTML-context injection point.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'KIIT Hub Support <support.kiithub@gmail.com>'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

export async function sendMail(args: { to: string; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    console.warn('sendMail skipped: SMTP_USER/SMTP_PASS not configured')
    return false
  }
  try {
    await t.sendMail({ from: SMTP_FROM, to: args.to, subject: args.subject, html: args.html, replyTo: args.replyTo })
    return true
  } catch (e) {
    console.error('sendMail failed:', e)
    return false
  }
}

export async function sendPremiumApprovedEmail(to: string, name: string, membershipDays: number) {
  return sendMail({
    to,
    subject: 'Your KIIT Hub Premium membership is now active!',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi ${name},</h2>
        <p>Great news — your <strong>Premium</strong> payment has been approved and your membership is now active for <strong>${membershipDays} days</strong>.</p>
        <p>You now have full access to all premium notes, PYQs, and study materials on KIIT Hub.</p>
        <p style="margin-top:24px;color:#666;font-size:13px">— Team KIIT Hub</p>
      </div>
    `,
  })
}

export async function sendListingApprovedEmail(to: string, name: string, title: string, listingUrl: string) {
  return sendMail({
    to,
    subject: `Your listing "${title}" is now live on KIIT Hub Merchandise`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi ${name},</h2>
        <p>Your listing <strong>${title}</strong> has been approved and is now visible on the KIIT Hub Merchandise marketplace.</p>
        <p><a href="${listingUrl}" style="color:#2563eb">View your listing</a></p>
        <p style="margin-top:24px;color:#666;font-size:13px">— Team KIIT Hub</p>
      </div>
    `,
  })
}

export async function sendRequestUpdateEmail(args: {
  to: string; name: string; requestCode: string; title: string
  status: 'FULFILLED' | 'REJECTED'; adminResponse?: string | null; fulfilledUrl?: string | null; siteUrl: string
}) {
  const isFulfilled = args.status === 'FULFILLED'
  const title = escapeHtml(args.title)
  return sendMail({
    to: args.to,
    subject: isFulfilled ? `Your request "${args.title}" has been fulfilled!` : `Update on your request "${args.title}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi ${escapeHtml(args.name)},</h2>
        <p>Your Request Hub submission <strong>${escapeHtml(args.requestCode)}</strong> — "${title}" — is now marked as
          <strong>${isFulfilled ? 'Fulfilled' : 'Rejected'}</strong>.</p>
        ${args.adminResponse ? `<p style="background:#f4f4f5;border-radius:8px;padding:12px">${escapeHtml(args.adminResponse)}</p>` : ''}
        ${args.fulfilledUrl ? `<p><a href="${args.siteUrl}${encodeURI(args.fulfilledUrl)}" style="color:#2563eb">View the content</a></p>` : ''}
        <p style="margin-top:24px;color:#666;font-size:13px">— Team KIIT Hub</p>
      </div>
    `,
  })
}

export async function sendContactAdminNotification(args: { adminEmail: string; visitorEmail: string; visitorName?: string; message: string }) {
  return sendMail({
    to: args.adminEmail,
    subject: `New contact message from ${args.visitorName || args.visitorEmail}`,
    replyTo: args.visitorEmail,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${args.visitorName ? `${escapeHtml(args.visitorName)} — ` : ''}${escapeHtml(args.visitorEmail)}</p>
        <p style="background:#f4f4f5;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(args.message)}</p>
        <p style="margin-top:16px;color:#666;font-size:13px">Reply to this email to respond directly to the sender.</p>
      </div>
    `,
  })
}

export async function sendContactConfirmationEmail(to: string, name?: string) {
  return sendMail({
    to,
    subject: 'We received your message — KIIT Hub',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi ${escapeHtml(name || 'there')},</h2>
        <p>Thanks for reaching out — we've received your message and our team will get back to you at this email address soon.</p>
        <p style="margin-top:24px;color:#666;font-size:13px">— Team KIIT Hub</p>
      </div>
    `,
  })
}

export async function sendUploadRewardGrantedEmail(to: string, name: string, credits: number, windowDays: number, expiresAt: Date) {
  return sendMail({
    to,
    subject: `You earned ${credits} premium documents on KIIT Hub!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi ${escapeHtml(name)},</h2>
        <p>Thanks for contributing notes and PYQs to KIIT Hub — you've unlocked <strong>${credits} premium documents</strong>, free to view for the next <strong>${windowDays} days</strong> (until ${expiresAt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}).</p>
        <p>Just open any premium note or PYQ as usual — access is applied automatically, no code needed.</p>
        <p style="margin-top:24px;color:#666;font-size:13px">— Team KIIT Hub</p>
      </div>
    `,
  })
}
