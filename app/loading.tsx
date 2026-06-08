import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card shadow-2xl border">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 border-4 border-primary/20 rounded-full" />
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-primary text-xl">K</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">KIIT Hub</h2>
          <p className="text-sm text-muted-foreground animate-pulse">Loading content...</p>
        </div>
      </div>
    </div>
  )
}
