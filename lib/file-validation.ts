// SVG is deliberately excluded from "image/*" uploads: it's an XML document
// that can embed <script>, and a same-origin-served SVG opened directly
// (not just used as an <img> source) executes that script in this site's
// origin — a well-known upload-based XSS vector. None of this app's image
// upload features (QR codes, merchandise photos, bug screenshots) need SVG.
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type.toLowerCase())
}

/** Safe extension for a validated image MIME type — never derived from a client-supplied filename. */
export function extensionForImageType(type: string): string {
  return EXTENSION_BY_TYPE[type.toLowerCase()] ?? '.bin'
}
