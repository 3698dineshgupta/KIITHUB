import { redirect } from 'next/navigation'

// Clerk-style catch-all route — redirect to our NextAuth login page
export default function SignInPage() {
  redirect('/login')
}
