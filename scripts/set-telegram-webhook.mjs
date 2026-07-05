/**
 * KIIT Hub — Merchandise Telegram webhook setup (one-off, not part of app runtime)
 * Run: node scripts/set-telegram-webhook.mjs
 *
 * Registers your deployed app's /api/telegram/webhook URL with Telegram so
 * the Approve/Reject inline buttons on Merchandise listing messages work.
 * Requires TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL (your deployed https URL),
 * and optionally TELEGRAM_WEBHOOK_SECRET to be set in .env.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envPath = path.join(__dirname, '..', '.env')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  console.warn('No .env file found, relying on existing environment variables.')
}

const token = process.env.TELEGRAM_BOT_TOKEN
const siteUrl = process.env.NEXT_PUBLIC_APP_URL
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

if (!token) { console.error('TELEGRAM_BOT_TOKEN is not set.'); process.exit(1) }
if (!siteUrl || !siteUrl.startsWith('https://')) {
  console.error('NEXT_PUBLIC_APP_URL must be set to your deployed https:// URL (Telegram will not call http:// or localhost webhooks).')
  process.exit(1)
}

const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/telegram/webhook`

const body = { url: webhookUrl, allowed_updates: ['callback_query', 'message'] }
if (secret) body.secret_token = secret

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const data = await res.json()

if (data.ok) {
  console.log(`✅ Webhook registered: ${webhookUrl}`)
  if (!secret) console.warn('⚠️  TELEGRAM_WEBHOOK_SECRET is not set — anyone who discovers this URL could send fake updates. Set it and rerun this script.')
} else {
  console.error('❌ Failed to set webhook:', data.description)
  process.exit(1)
}
