/**
 * Telegram admin-approval workflow for student-submitted Notes/PYQs (the
 * "upload to earn premium" program). Isolated from lib/telegram.ts (private
 * PDF storage) and lib/telegram-merch.ts (merchandise moderation) — this
 * file only ever touches ContentSubmission rows. Distinct callback_data
 * prefixes (sba/sbr/sbrr/sbrc/sbb) so the shared webhook route never
 * confuses a submission callback with a merch one.
 */
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || ''
const API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const SUBMISSION_REJECT_REASONS: { code: string; label: string }[] = [
  { code: '1', label: 'Poor scan / unreadable' },
  { code: '2', label: 'Wrong subject or semester' },
  { code: '3', label: 'Duplicate of existing document' },
  { code: '4', label: 'Not exam-relevant content' },
  { code: '5', label: 'Copyright / inappropriate content' },
]

function approveCallback(id: string) { return `sba:${id}` }
function rejectMenuCallback(id: string) { return `sbr:${id}` }
function rejectReasonCallback(id: string, code: string) { return `sbrr:${id}:${code}` }
function rejectCustomCallback(id: string) { return `sbrc:${id}` }

interface TelegramInlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][]
}

export function buildSubmissionApprovalKeyboard(submissionId: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: approveCallback(submissionId) },
        { text: '❌ Reject', callback_data: rejectMenuCallback(submissionId) },
      ],
    ],
  }
}

export function buildSubmissionRejectReasonKeyboard(submissionId: string): TelegramInlineKeyboard {
  const rows = SUBMISSION_REJECT_REASONS.map(r => [{ text: r.label, callback_data: rejectReasonCallback(submissionId, r.code) }])
  rows.push([{ text: 'Other (reply to this message with reason)', callback_data: rejectCustomCallback(submissionId) }])
  rows.push([{ text: '⬅ Back', callback_data: `sbb:${submissionId}` }])
  return { inline_keyboard: rows }
}

export function formatSubmissionCaption(submission: {
  title: string
  contentType: string
  examType: string | null
  subjectName: string
  academicBranch: string
  academicSemester: string
  uploader: { id: string; name: string; email: string }
  createdAt: Date
}, footer?: string) {
  const lines = [
    'New Student Upload — Earn Premium Program',
    '',
    `Title:\n${submission.title}`,
    '',
    `Type:\n${submission.contentType}${submission.examType ? ` (${submission.examType})` : ''}`,
    '',
    `Subject:\n${submission.subjectName} — ${submission.academicBranch} Sem ${submission.academicSemester}`,
    '',
    `Uploader:\n${submission.uploader.name} (${submission.uploader.email})`,
    '',
    `User ID:\n${submission.uploader.id}`,
    '',
    `Submitted:\n${submission.createdAt.toLocaleString('en-IN')}`,
    '',
    `Track on site:\n${SITE_URL}/upload-earn`,
  ]
  if (footer) lines.push('', footer)
  return lines.join('\n').slice(0, 1024)
}

/**
 * Uploads the PDF to the admin review channel with the approval caption and
 * inline keyboard attached to the same message — one Telegram message that
 * both lets the admin open/preview the file and carries the Approve/Reject
 * buttons, unlike the merch flow's separate storage-upload + notify steps
 * (those listings have a product photo instead of a document to preview).
 */
export async function sendSubmissionForApproval(args: {
  submissionId: string
  buffer: Buffer
  fileName: string
  caption: string
}): Promise<{ ok: boolean; fileId?: string; messageId?: number; error?: string }> {
  try {
    const form = new FormData()
    form.append('chat_id', CHANNEL_ID)
    form.append('document', new Blob([new Uint8Array(args.buffer)], { type: 'application/pdf' }), args.fileName)
    form.append('caption', args.caption.slice(0, 1024))
    form.append('reply_markup', JSON.stringify(buildSubmissionApprovalKeyboard(args.submissionId)))

    const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description }
    return { ok: true, fileId: data.result.document.file_id, messageId: data.result.message_id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Telegram request failed' }
  }
}

export async function editSubmissionMessage(messageId: number, caption: string, replyMarkup?: TelegramInlineKeyboard) {
  try {
    const body: Record<string, unknown> = { chat_id: CHANNEL_ID, message_id: messageId, caption }
    if (replyMarkup) body.reply_markup = replyMarkup
    await fetch(`${API}/editMessageCaption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error('editSubmissionMessage failed:', e)
  }
}

export async function editSubmissionReplyMarkup(messageId: number, replyMarkup: TelegramInlineKeyboard) {
  try {
    await fetch(`${API}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHANNEL_ID, message_id: messageId, reply_markup: replyMarkup }),
    })
  } catch (e) {
    console.error('editSubmissionReplyMarkup failed:', e)
  }
}

export function parseSubmissionCallback(data: string):
  | { action: 'approve'; submissionId: string }
  | { action: 'reject_menu'; submissionId: string }
  | { action: 'reject_reason'; submissionId: string; code: string }
  | { action: 'reject_custom'; submissionId: string }
  | { action: 'back'; submissionId: string }
  | null {
  const [prefix, id, code] = data.split(':')
  if (!id) return null
  if (prefix === 'sba') return { action: 'approve', submissionId: id }
  if (prefix === 'sbr') return { action: 'reject_menu', submissionId: id }
  if (prefix === 'sbrr' && code) return { action: 'reject_reason', submissionId: id, code }
  if (prefix === 'sbrc') return { action: 'reject_custom', submissionId: id }
  if (prefix === 'sbb') return { action: 'back', submissionId: id }
  return null
}
