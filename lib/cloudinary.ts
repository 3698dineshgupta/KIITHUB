import { v2 as cloudinary } from 'cloudinary'

// Reads CLOUDINARY_URL automatically (cloudinary://<api_key>:<api_secret>@<cloud_name>)
cloudinary.config({ secure: true })

const MERCH_FOLDER = 'kiithub/merchandise'
export const BUG_REPORT_FOLDER = 'kiithub/bug-reports'

export async function cloudinaryUploadImage(
  file: Buffer,
  fileName: string,
  folder: string = MERCH_FOLDER
): Promise<{ publicId: string; url: string; fileSize: number }> {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL environment variable is not set.')
  }

  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  const publicId = `${cleanBase}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const result = await new Promise<{ public_id: string; secure_url: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        // Optimize on upload: cap dimensions, auto format/quality for fast delivery
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, uploadResult) => {
        if (error || !uploadResult) return reject(error ?? new Error('Cloudinary upload failed'))
        resolve(uploadResult as { public_id: string; secure_url: string; bytes: number })
      }
    )
    stream.end(file)
  })

  return { publicId: result.public_id, url: result.secure_url, fileSize: result.bytes }
}

/** Screen recordings (bug reports) — same flow but as a video asset, no image transformation. */
export async function cloudinaryUploadVideo(
  file: Buffer,
  fileName: string,
  folder: string = BUG_REPORT_FOLDER
): Promise<{ publicId: string; url: string; fileSize: number }> {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL environment variable is not set.')
  }

  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  const publicId = `${cleanBase}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const result = await new Promise<{ public_id: string; secure_url: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'video' },
      (error, uploadResult) => {
        if (error || !uploadResult) return reject(error ?? new Error('Cloudinary upload failed'))
        resolve(uploadResult as { public_id: string; secure_url: string; bytes: number })
      }
    )
    stream.end(file)
  })

  return { publicId: result.public_id, url: result.secure_url, fileSize: result.bytes }
}

export async function cloudinaryDeleteImage(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId)
    return true
  } catch (e) {
    console.error('Cloudinary delete error:', e)
    return false
  }
}
