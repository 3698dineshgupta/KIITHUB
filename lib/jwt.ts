import { SignJWT, jwtVerify } from 'jose'

// No hardcoded fallback: a secret baked into source code is public the
// moment this repo is pushed anywhere, and would let anyone forge a valid
// stream token (bypassing premium gating for any note/PYQ) if
// NEXTAUTH_SECRET were ever missing in an environment. Failing loudly here
// is safer than silently signing tokens with a well-known key.
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set — required to sign/verify stream tokens.')
}
const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

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
