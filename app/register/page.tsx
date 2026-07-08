import { RegisterForm } from '@/components/auth/register-form'
import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your free KIIT Hub account to access notes, PYQs, and more.',
  robots: { index: false, follow: true },
}
export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto mb-3">K</div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join thousands of KIIT students</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
