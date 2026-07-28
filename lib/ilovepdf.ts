// iLovePDF REST API client — compresses oversized PDFs before they're routed
// to Telegram. Telegram's bot getFile method (how the site later streams a
// document back out) hard-caps at 20MB regardless of how the file was
// uploaded, so a document larger than that would successfully save but then
// be permanently unviewable. Compression is a best-effort mitigation, not a
// guarantee — ratio depends entirely on the PDF's content (image-heavy scans
// shrink a lot, already-optimized text/vector PDFs may barely shrink at all)
// — callers must check the returned size themselves.
const ILOVEPDF_API = 'https://api.ilovepdf.com/v1'

interface StartTaskResponse {
  server: string
  task: string
}

interface UploadResponse {
  server_filename: string
}

export interface CompressResult {
  buffer: Buffer
  originalSize: number
  compressedSize: number
}

async function authenticate(): Promise<string> {
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY
  if (!publicKey) throw new Error('ILOVEPDF_PUBLIC_KEY is not set')

  const res = await fetch(`${ILOVEPDF_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKey }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`iLovePDF auth failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.token as string
}

async function startTask(token: string): Promise<StartTaskResponse> {
  const res = await fetch(`${ILOVEPDF_API}/start/compress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`iLovePDF start task failed (${res.status}): ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function uploadFile(server: string, token: string, task: string, buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData()
  form.append('task', task)
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'application/pdf' }), filename)

  const res = await fetch(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`iLovePDF upload failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data: UploadResponse = await res.json()
  return data.server_filename
}

async function processCompress(server: string, token: string, task: string, serverFilename: string, filename: string): Promise<void> {
  const res = await fetch(`https://${server}/v1/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      tool: 'compress',
      files: [{ server_filename: serverFilename, filename }],
      compression_level: 'recommended',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`iLovePDF compression failed (${res.status}): ${body.slice(0, 200)}`)
  }
}

async function downloadResult(server: string, token: string, task: string): Promise<Buffer> {
  const res = await fetch(`https://${server}/v1/download/${task}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`iLovePDF download failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function compressPdf(buffer: Buffer, filename: string): Promise<CompressResult> {
  const token = await authenticate()
  const { server, task } = await startTask(token)
  const serverFilename = await uploadFile(server, token, task, buffer, filename)
  await processCompress(server, token, task, serverFilename, filename)
  const compressed = await downloadResult(server, token, task)
  return {
    buffer: compressed,
    originalSize: buffer.length,
    compressedSize: compressed.length,
  }
}
