import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? 'fallback-secret-change-in-production'
)

export interface StreamToken {
  resourceId: string
  resourceType: 'note' | 'pyq'
  userId: string
  isPremium: boolean
}

export async function signStreamToken(payload: StreamToken): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret)
}

export async function verifyStreamToken(token: string): Promise<StreamToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as StreamToken
  } catch {
    return null
  }
}
