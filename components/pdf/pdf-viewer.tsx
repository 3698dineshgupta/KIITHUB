'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, Loader2, ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Bulletproof CDN Worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  streamUrl: string
  title: string
  isPremium?: boolean
  totalPages?: number | null
  userEmail?: string
}

export function PDFViewer({ streamUrl, title, isPremium, totalPages, userEmail }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(totalPages || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1.0) // 100%
  const containerRef = useRef<HTMLDivElement>(null)

  // Disable right-click, selection, and printing
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const preventContextMenu = (e: MouseEvent) => e.preventDefault()
    const preventSelect = (e: Event) => e.preventDefault()
    
    // Prevent print shortcut Ctrl+P / Cmd+P
    const preventKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        alert('Printing is disabled for security reasons.')
      }
    }

    el.addEventListener('contextmenu', preventContextMenu)
    el.addEventListener('selectstart', preventSelect)
    window.addEventListener('keydown', preventKeyDown)

    return () => {
      el.removeEventListener('contextmenu', preventContextMenu)
      el.removeEventListener('selectstart', preventSelect)
      window.removeEventListener('keydown', preventKeyDown)
    }
  }, [])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  useEffect(() => {
    const onFSChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF JS load error:', err)
    setLoading(false)
    setError('Failed to load document. The secure token may have expired. Please refresh the page.')
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl border bg-muted/20 overflow-hidden select-none flex flex-col',
        fullscreen ? 'fixed inset-0 z-50 rounded-none bg-zinc-950' : 'w-full'
      )}
      style={{ minHeight: fullscreen ? '100vh' : 600 }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm z-30 select-none">
        <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-sm flex items-center gap-1.5">
          {isPremium && <Badge variant="premium" className="text-[10px]">PRO</Badge>}
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center font-semibold tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setZoom(z => Math.min(2.0, z + 0.15))} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 cursor-pointer" onClick={handleFullscreen} title="Fullscreen">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-zinc-900/40 flex flex-col items-center gap-6 relative" style={{ maxHeight: fullscreen ? 'calc(100vh - 48px)' : 650 }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/70 z-20 gap-3 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <span className="text-sm font-medium text-zinc-400">Loading Secure Document...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 z-20 gap-3 text-center px-6">
            <ShieldAlert className="h-12 w-12 text-red-500 mb-2" />
            <p className="font-bold text-white text-lg">Secure Stream Failure</p>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 cursor-pointer" onClick={() => { setError(null); setLoading(true) }}>
              Retry Stream
            </Button>
          </div>
        )}

        <Document
          file={streamUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex flex-col items-center gap-6"
        >
          {Array.from({ length: numPages || 0 }).map((_, idx) => {
            const pageNum = idx + 1
            return (
              <div key={pageNum} className="relative shadow-2xl border border-zinc-800 rounded-lg overflow-hidden bg-white max-w-full">
                <Page
                  pageNumber={pageNum}
                  scale={zoom}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div className="w-[500px] h-[700px] max-w-full bg-zinc-950/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                      Rendering Page {pageNum}...
                    </div>
                  }
                />
                
                {/* Embedded Watermark over canvas */}
                {userEmail && (
                  <div
                    className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden"
                    aria-hidden
                  >
                    <div
                      className="text-zinc-950/[0.05] dark:text-white/[0.03] font-black uppercase select-none tracking-widest text-center"
                      style={{
                        transform: 'rotate(-30deg)',
                        fontSize: `${Math.round(20 * zoom)}px`,
                        lineHeight: '1.8'
                      }}
                    >
                      {userEmail} • KIIT HUB PRO<br/>
                      {userEmail} • SECURE STREAM
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </Document>
      </div>

      {/* Security notice */}
      <div className="px-4 py-2.5 border-t bg-muted/30 text-[10px] sm:text-xs text-muted-foreground text-center font-medium select-none">
        🔒 SECURE DOCUMENT VIEWER · PRINTING & SCREEN COPIES STRICTLY RESTRICTED · SYSTEM AUDITED
      </div>
    </div>
  )
}
