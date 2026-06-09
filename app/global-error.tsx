'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console for debugging
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-background text-foreground antialiased">
        <div className="flex flex-col items-center text-center gap-6 px-4 max-w-md">
          <div className="p-5 rounded-2xl bg-red-100 dark:bg-red-950/40">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An unexpected error occurred. This has been noted. Please try refreshing the page — it usually resolves itself.
            </p>
            {error?.digest && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">Error ID: {error.digest}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
              <Home className="h-4 w-4" /> Go Home
            </Button>
            <Button onClick={() => reset()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
