'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PageError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <div className="p-5 rounded-2xl bg-red-100 dark:bg-red-950/40">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Oops! Something broke</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This page encountered an unexpected error. Try refreshing — it usually fixes itself. If it keeps happening, go back to the home page.
          </p>
          {error?.digest && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">Ref: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" /> Go Home
            </Button>
          </Link>
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
