'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Loader2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PDFViewerProps {
  streamUrl: string
  title: string
  isPremium?: boolean
  totalPages?: number | null
  userEmail?: string
}

export function PDFViewer({ streamUrl, title, isPremium, totalPages, userEmail }: PDFViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const containerRef = useRef<HTMLDivElement>(null)

  // Disable right-click on PDF area
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: MouseEvent) => e.preventDefault()
    el.addEventListener('contextmenu', prevent)
    return () => el.removeEventListener('contextmenu', prevent)
  }, [])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const onFSChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl border bg-muted/20 overflow-hidden select-none',
        fullscreen && 'fixed inset-0 z-50 rounded-none bg-background'
      )}
      style={{ minHeight: 600 }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
        <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-sm">{title}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(60, z - 10))} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(200, z + 10))} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={handleFullscreen} title="Fullscreen">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Iframe */}
      <div className="relative" style={{ height: fullscreen ? 'calc(100vh - 48px)' : 600 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium">Failed to load PDF</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true) }}>Retry</Button>
            </div>
          </div>
        )}

        <iframe
          src={`${streamUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=${zoom}`}
          className="w-full h-full border-none"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError('Could not load the PDF. Please try again.') }}
          title={title}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
        />

        {/* Watermark overlay */}
        {userEmail && (
          <div
            className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center"
            aria-hidden
          >
            <div
              className="text-muted-foreground/10 font-bold text-xl select-none whitespace-nowrap"
              style={{ transform: 'rotate(-35deg)', fontSize: '18px' }}
            >
              {userEmail} • KIIT Hub
            </div>
          </div>
        )}
      </div>

      {/* Security notice */}
      <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
        🔒 Secure streaming · Right-click disabled · Not for redistribution
      </div>
    </div>
  )
}
