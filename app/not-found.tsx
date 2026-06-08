import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h2 className="text-4xl font-bold mb-4">404 - Page Not Found</h2>
      <p className="text-muted-foreground mb-8">The page you are looking for does not exist or has been moved.</p>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  )
}
