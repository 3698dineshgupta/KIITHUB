/**
 * Telegram admin-approval workflow for the Merchandise marketplace.
 * Isolated from lib/telegram.ts (which is used for private PDF storage) —
 * this file only ever touches MerchListing rows.
 */
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || ''
const API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export function isAuthorizedTelegramAdmin(telegramUserId: number | string): boolean {
  if (ADMIN_IDS.length === 0) return false
  return ADMIN_IDS.includes(String(telegramUserId))
}

export const REJECT_REASONS: { code: string; label: string }[] = [
  { code: '1', label: 'Poor quality images' },
  { code: '2', label: 'Prohibited item' },
  { code: '3', label: 'Incomplete description' },
  { code: '4', label: 'Price / negotiation issue' },
  { code: '5', label: 'Duplicate listing' },
]

function approveCallback(id: string) { return `ma:${id}` }
function rejectMenuCallback(id: string) { return `mr:${id}` }
function rejectReasonCallback(id: string, code: string) { return `mrr:${id}:${code}` }
function rejectCustomCallback(id: string) { return `mrc:${id}` }

interface TelegramInlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][]
}

export function buildApprovalKeyboard(listingId: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: approveCallback(listingId) },
        { text: '❌ Reject', callback_data: rejectMenuCallback(listingId) },
      ],
    ],
  }
}

export function buildRejectReasonKeyboard(listingId: string): TelegramInlineKeyboard {
  const rows = REJECT_REASONS.map(r => [{ text: r.label, callback_data: rejectReasonCallback(listingId, r.code) }])
  rows.push([{ text: 'Other (reply to this message with reason)', callback_data: rejectCustomCallback(listingId) }])
  rows.push([{ text: '⬅ Back', callback_data: `mb:${listingId}` }])
  return { inline_keyboard: rows }
}

export function formatListingCaption(listing: {
  id: string
  title: string
  description: string
  price: number
  isNegotiable: boolean
  category: string
  condition: string
  whatsapp: string
  seller: { id: string; name: string; email: string }
  createdAt: Date
  status?: string
}, footer?: string) {
  const lines = [
    'New Merchandise Listing',
    '',
    `Title:\n${listing.title}`,
    '',
    `Description:\n${listing.description.slice(0, 500)}`,
    '',
    `Price:\n₹${listing.price}${listing.isNegotiable ? ' (Negotiable)' : ''}`,
    '',
    `Category:\n${listing.category}`,
    '',
    `Condition:\n${listing.condition}`,
    '',
    `Seller:\n${listing.seller.name} (${listing.seller.email})`,
    '',
    `WhatsApp:\n${listing.whatsapp}`,
    '',
    `User ID:\n${listing.seller.id}`,
    '',
    `Submitted:\n${listing.createdAt.toLocaleString('en-IN')}`,
    '',
    `View on site:\n${SITE_URL}/merchandise/my-listings`,
  ]
  if (footer) lines.push('', footer)
  return lines.join('\n').slice(0, 1024)
}

export async function sendListingForApproval(args: {
  listing: {
    id: string
    title: string
    description: string
    price: number
    isNegotiable: boolean
    category: string
    condition: string
    whatsapp: string
    createdAt: Date
  }
  seller: { id: string; name: string; email: string }
  imageUrl?: string
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const caption = formatListingCaption({ ...args.listing, seller: args.seller })
    const replyMarkup = buildApprovalKeyboard(args.listing.id)

    if (args.imageUrl) {
      const res = await fetch(`${API}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHANNEL_ID,
          photo: args.imageUrl,
          caption,
          reply_markup: replyMarkup,
        }),
      })
      const data = await res.json()
      if (!data.ok) return { ok: false, error: data.description }
      return { ok: true, messageId: data.result.message_id }
    }

    const res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: caption,
        reply_markup: replyMarkup,
      }),
    })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description }
    return { ok: true, messageId: data.result.message_id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Telegram request failed' }
  }
}

export async function editListingMessage(messageId: number, caption: string, replyMarkup?: TelegramInlineKeyboard, hasPhoto = true) {
  try {
    const endpoint = hasPhoto ? 'editMessageCaption' : 'editMessageText'
    const body: Record<string, unknown> = {
      chat_id: CHANNEL_ID,
      message_id: messageId,
      [hasPhoto ? 'caption' : 'text']: caption,
    }
    if (replyMarkup) body.reply_markup = replyMarkup
    await fetch(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error('editListingMessage failed:', e)
  }
}

export async function editReplyMarkup(messageId: number, replyMarkup: TelegramInlineKeyboard) {
  try {
    await fetch(`${API}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHANNEL_ID, message_id: messageId, reply_markup: replyMarkup }),
    })
  } catch (e) {
    console.error('editReplyMarkup failed:', e)
  }
}

export async function answerCallback(callbackQueryId: string, text?: string, showAlert = false) {
  try {
    await fetch(`${API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
    })
  } catch (e) {
    console.error('answerCallback failed:', e)
  }
}

export function parseListingCallback(data: string):
  | { action: 'approve'; listingId: string }
  | { action: 'reject_menu'; listingId: string }
  | { action: 'reject_reason'; listingId: string; code: string }
  | { action: 'reject_custom'; listingId: string }
  | { action: 'back'; listingId: string }
  | null {
  const [prefix, id, code] = data.split(':')
  if (!id) return null
  if (prefix === 'ma') return { action: 'approve', listingId: id }
  if (prefix === 'mr') return { action: 'reject_menu', listingId: id }
  if (prefix === 'mrr' && code) return { action: 'reject_reason', listingId: id, code }
  if (prefix === 'mrc') return { action: 'reject_custom', listingId: id }
  if (prefix === 'mb') return { action: 'back', listingId: id }
  return null
}
