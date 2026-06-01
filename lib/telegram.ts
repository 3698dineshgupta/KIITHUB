/**
 * Telegram Storage Provider
 * PDFs stored in private Telegram channel — file URLs NEVER exposed to frontend
 */
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!
const API = `https://api.telegram.org/bot${BOT_TOKEN}`
const FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`

export interface TGUploadResult {
  fileId: string; messageId: string; fileSize: number; fileName: string
}

export async function telegramUpload(file: Buffer, fileName: string, caption?: string): Promise<TGUploadResult> {
  const form = new FormData()
  form.append('chat_id', CHANNEL_ID)
  form.append('document', new Blob([file], { type: 'application/pdf' }), fileName)
  if (caption) form.append('caption', caption.slice(0, 1024))

  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Telegram upload failed: ${(await res.json()).description}`)
  const d = await res.json()
  const doc = d.result.document
  return { fileId: doc.file_id, messageId: String(d.result.message_id), fileSize: doc.file_size ?? 0, fileName: doc.file_name ?? fileName }
}

export async function telegramGetFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${API}/getFile?file_id=${fileId}`)
  if (!res.ok) throw new Error('Telegram getFile failed')
  const d = await res.json()
  if (!d.ok) throw new Error(d.description)
  return `${FILE_API}/${d.result.file_path}`
}

export async function telegramStream(fileId: string): Promise<Buffer> {
  const url = await telegramGetFileUrl(fileId)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Telegram download failed')
  return Buffer.from(await res.arrayBuffer())
}

export async function telegramDelete(messageId: string): Promise<boolean> {
  const res = await fetch(`${API}/deleteMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHANNEL_ID, message_id: parseInt(messageId) })
  })
  return (await res.json()).ok
}
