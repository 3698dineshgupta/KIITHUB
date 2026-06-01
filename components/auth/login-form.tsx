'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader2, Chrome, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const callbackUrl = sp.get('callbackUrl') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) { setError('Invalid email or password'); setLoading(false); return }
    router.push(callbackUrl)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <Card className="p-6 space-y-4">
      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm"><AlertCircle className="h-4 w-4 flex-shrink-0"/>{error}</div>}
      <Button variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={googleLoading}>
        {googleLoading?<Loader2 className="h-4 w-4 animate-spin"/>:<Chrome className="h-4 w-4"/>}Continue with Google
      </Button>
      <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t"/></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or email</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><Label htmlFor="email" className="mb-1.5 block">Email</Label><Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></div>
        <div><Label htmlFor="password" className="mb-1.5 block">Password</Label><Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"/></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading&&<Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sign In</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline font-medium">Sign up</Link></p>
    </Card>
  )
}
