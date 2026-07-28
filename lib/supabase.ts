import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qbgmidxjhqznldfpvory.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let _supabase: SupabaseClient | null = null

// Lazily constructed, not a module-level `createClient(...)` call: that
// version threw synchronously ("supabaseKey is required.") the instant this
// module was imported with an empty key — and Next's build step imports
// every API route module to statically collect page data, so a host that
// doesn't inject env vars during the build step (unlike Vercel, which does)
// failed the entire production build over a key that's only ever actually
// needed at request time. Each exported function below still throws its own
// clear error if the env vars are missing before doing any real work.
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || 'build-time-placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return _supabase
}

export async function supabaseUpload(
  file: Buffer,
  fileName: string,
  bucketName: string = 'documents'
): Promise<{ path: string; fileSize: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.')
  }

  // Generate a unique path to avoid collisions
  const fileExtension = fileName.split('.').pop() || 'pdf'
  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  const timestamp = Date.now()
  const uniqueName = `${cleanBase}_${timestamp}.${fileExtension}`
  const filePath = `${uniqueName}`

  const { data, error } = await getSupabase().storage
    .from(bucketName)
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    console.error('Supabase upload error detail:', error)
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  return {
    path: data.path,
    fileSize: file.length,
  }
}

export async function supabaseStream(
  path: string,
  bucketName: string = 'documents'
): Promise<Buffer> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not set.')
  }

  const { data, error } = await getSupabase().storage
    .from(bucketName)
    .download(path)

  if (error) {
    console.error('Supabase download error detail:', error)
    throw new Error(`Supabase download failed: ${error.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function supabaseCreateSignedUrl(
  path: string,
  bucketName: string = 'documents',
  expiresInSeconds: number = 60
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not set.')
  }

  const { data, error } = await getSupabase().storage
    .from(bucketName)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data) {
    console.error('Supabase signed URL error detail:', error)
    throw new Error(`Supabase signed URL failed: ${error?.message ?? 'unknown error'}`)
  }

  return data.signedUrl
}

export async function supabaseDelete(
  path: string,
  bucketName: string = 'documents'
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not set.')
  }

  const { data, error } = await getSupabase().storage
    .from(bucketName)
    .remove([path])

  if (error) {
    console.error('Supabase delete error detail:', error)
    return false
  }

  return data && data.length > 0
}
