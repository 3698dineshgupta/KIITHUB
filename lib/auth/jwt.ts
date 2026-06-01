import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this'
)

export interface PDFAccessToken {
  pdfId: string
  userId: string
  isPremium: boolean
  exp: number
}

/**
 * Generate a signed token for PDF access
 * Token expires in 1 hour
 */
export async function generatePDFAccessToken(
  pdfId: string,
  userId: string,
  isPremium: boolean
): Promise<string> {
  const token = await new SignJWT({
    pdfId,
    userId,
    isPremium,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify and decode PDF access token
 */
export async function verifyPDFAccessToken(
  token: string
): Promise<PDFAccessToken | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as PDFAccessToken
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}
