import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qbgmidxjhqznldfpvory.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create a single supabase client instance for server-side administration (bypassing RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

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

  const { data, error } = await supabase.storage
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

export async function supabaseUploadImage(
  file: Buffer,
  fileName: string,
  contentType: string,
  bucketName: string = 'merch-images'
): Promise<{ path: string; publicUrl: string; fileSize: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.')
  }

  const fileExtension = fileName.split('.').pop() || 'jpg'
  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  const timestamp = Date.now()
  const uniqueName = `${cleanBase}_${timestamp}_${Math.random().toString(36).slice(2, 8)}.${fileExtension}`

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uniqueName, file, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error('Supabase image upload error detail:', error)
    throw new Error(`Supabase image upload failed: ${error.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path)

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
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

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(path)

  if (error) {
    console.error('Supabase download error detail:', error)
    throw new Error(`Supabase download failed: ${error.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function supabaseDelete(
  path: string,
  bucketName: string = 'documents'
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not set.')
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([path])

  if (error) {
    console.error('Supabase delete error detail:', error)
    return false
  }

  return data && data.length > 0
}
