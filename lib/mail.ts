import nodemailer from 'nodemailer'

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

export async function sendMail(args: { to: string; subject: string; html: string }): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    console.warn('sendMail skipped: SMTP_USER/SMTP_PASS not configured')
    return false
  }
  try {
    await t.sendMail({ from: SMTP_FROM, to: args.to, subject: args.subject, html: args.html })
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
