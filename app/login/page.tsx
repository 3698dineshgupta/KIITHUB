import { LoginForm } from '@/components/auth/login-form'
import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Login' }
export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto mb-3">K</div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your KIIT Hub account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
