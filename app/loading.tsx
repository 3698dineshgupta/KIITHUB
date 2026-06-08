'use client'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center -mt-20">
        {/* Animated Spinner */}
        <div className="relative w-24 h-24 mb-10">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800/20 dark:border-slate-200/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary opacity-80 animate-spin transition-all duration-500 ease-in-out"></div>
        </div>

        {/* Logo Text */}
        <h1 className="text-5xl font-extrabold text-primary mb-5 tracking-tight">KIITHub</h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-lg mb-8 tracking-wide font-medium">Loading your academic hub...</p>

        {/* Pulsing Dots */}
        <div className="flex gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3.5 h-3.5 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3.5 h-3.5 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}
