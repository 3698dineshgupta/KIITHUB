import { redirect } from 'next/navigation'

// The real registration route is /register — this exists only so referral
// links matching the literal https://www.kiithub.in.net/signup?ref=CODE
// pattern still work, preserving the query string (mirrors the existing
// /auth/sign-up -> /register compatibility redirect).
export default async function SignUpRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value)
  }
  const suffix = qs.toString()
  redirect(suffix ? `/register?${suffix}` : '/register')
}
