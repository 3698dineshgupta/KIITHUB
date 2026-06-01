import { redirect } from 'next/navigation'

// Clerk-style catch-all route — redirect to our NextAuth register page
export default function SignUpPage() {
  redirect('/register')
}
