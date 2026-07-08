import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approveListing, rejectListing, markAwaitingCustomReason } from '@/lib/merch-moderation'
import {
  isAuthorizedTelegramAdmin,
  parseListingCallback,
  buildApprovalKeyboard,
  buildRejectReasonKeyboard,
  editReplyMarkup,
  editListingMessage,
  answerCallback,
  REJECT_REASONS,
} from '@/lib/telegram-merch'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''

// Telegram webhook — routes Merchandise approve/reject callback buttons and
// custom-rejection-reason replies. Isolated to MerchListing rows only.
export async function POST(req: NextRequest) {
  try {
    // Fail closed: an unset secret must reject every request, not accept
    // everything. Telegram's from.id in the payload isn't cryptographically
    // verified by anything else here — isAuthorizedTelegramAdmin() checks it
    // against a numeric ID that isn't secret (visible to anyone who's ever
    // seen that admin in a Telegram group), so this header is the only real
    // proof a request actually came from Telegram.
    const header = req.headers.get('x-telegram-bot-api-secret-token')
    if (!WEBHOOK_SECRET || header !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const update = await req.json()

    if (update.callback_query) {
      const cq = update.callback_query
      const fromId = cq.from?.id

      if (!isAuthorizedTelegramAdmin(fromId)) {
        await answerCallback(cq.id, 'You are not authorized to moderate listings.', true)
        return NextResponse.json({ ok: true })
      }

      const parsed = parseListingCallback(cq.data || '')
      if (!parsed) {
        await answerCallback(cq.id)
        return NextResponse.json({ ok: true })
      }

      const messageId = cq.message?.message_id

      switch (parsed.action) {
        case 'approve': {
          const result = await approveListing(parsed.listingId, String(fromId))
          await answerCallback(cq.id, result.ok ? 'Listing approved ✅' : result.error, !result.ok)
          break
        }
        case 'reject_menu': {
          if (messageId) await editReplyMarkup(messageId, buildRejectReasonKeyboard(parsed.listingId))
          await answerCallback(cq.id)
          break
        }
        case 'back': {
          if (messageId) await editReplyMarkup(messageId, buildApprovalKeyboard(parsed.listingId))
          await answerCallback(cq.id)
          break
        }
        case 'reject_reason': {
          const reasonLabel = REJECT_REASONS.find(r => r.code === parsed.code)?.label ?? 'Not specified'
          const result = await rejectListing(parsed.listingId, String(fromId), reasonLabel)
          await answerCallback(cq.id, result.ok ? 'Listing rejected ❌' : result.error, !result.ok)
          break
        }
        case 'reject_custom': {
          await markAwaitingCustomReason(parsed.listingId)
          if (messageId) {
            await editListingMessage(messageId, `${cq.message?.caption || ''}\n\n✍️ Reply to this message with the rejection reason.`, undefined, true)
          }
          await answerCallback(cq.id, 'Reply to this message with the rejection reason')
          break
        }
      }

      return NextResponse.json({ ok: true })
    }

    if (update.message?.reply_to_message && update.message.text) {
      const fromId = update.message.from?.id
      if (!isAuthorizedTelegramAdmin(fromId)) return NextResponse.json({ ok: true })

      const replyToId = update.message.reply_to_message.message_id
      const listing = await prisma.merchListing.findFirst({
        where: { telegramMessageId: replyToId, awaitingCustomReason: true, status: 'PENDING' },
      })
      if (listing) {
        await rejectListing(listing.id, String(fromId), update.message.text.slice(0, 500))
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('telegram webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
