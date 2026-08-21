'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, Loader2, ShieldAlert, Bug
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDocumentLoaderStore, useBugReportStore } from '@/store'
import { DocumentNavArrows } from '@/components/pdf/document-nav-arrows'

// react-pdf bundles its own pinned pdfjs-dist internally, separate from (and
// usually a different version than) this project's top-level pdfjs-dist
// dependency. Node's module resolution explicitly forbids package `exports`
// wildcards from resolving into a nested node_modules path, so there's no
// reliable way to self-host react-pdf's exact worker file — the worker MUST
// be fetched using `pdfjs.version` (read from react-pdf's own bundled copy)
// so it always matches, regardless of what's installed at the top level.
// Explicitly `https:`, not protocol-relative `//unpkg.com/...` — on local
// dev the page itself is served over http://localhost, so a protocol-
// relative URL resolves to http://unpkg.com, which doesn't match the
// `https://unpkg.com` CSP source in next.config.ts and silently fails the
// worker's dynamic import. https: works identically in dev and production.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerNavProps {
  canPrev: boolean
  canNext: boolean
  prevLabel?: string
  nextLabel?: string
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
}

interface PDFViewerProps {
  streamUrl: string
  title: string
  isPremium?: boolean
  totalPages?: number | null
  userEmail?: string
  nav?: PDFViewerNavProps
}

export function PDFViewer({ streamUrl, title, isPremium, totalPages, userEmail, nav }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(totalPages || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1.0) // 100% = fits the page container's width exactly
  const containerRef = useRef<HTMLDivElement>(null)
  const pagesContainerRef = useRef<HTMLDivElement>(null)
  const hasClosedLoaderRef = useRef(false)

  // Pages used to render at a raw pdf.js `scale` (1.0 ≈ the PDF's native
  // point size), completely unrelated to how wide the on-screen container
  // actually was. On phones that meant even "60%" was still wider than the
  // viewport, so every line ran off the edge and reading required
  // horizontal scrolling per line. Measuring the container and rendering at
  // `width={fitWidth} scale={zoom}` makes 100% mean "fits the screen" on
  // every device, and zoom becomes a multiplier on top of that baseline.
  const [fitWidth, setFitWidth] = useState(500)
  useEffect(() => {
    const el = pagesContainerRef.current
    if (!el) return
    const measure = () => {
      const horizontalPadding = window.innerWidth < 640 ? 32 : 48
      // Uncapped, fullscreen (`fixed inset-0`, no longer bounded by the
      // page's own max-width layout) let this balloon to the full monitor
      // width on a wide desktop display — 1800px+ before padding. At DPR 2
      // that's a 3600+ physical-pixel-wide canvas rasterized fresh on every
      // document switch, heavy enough to visibly freeze the tab. Capping at
      // a normal reading-column width fixes both the freeze and the fact
      // that a PDF stretched edge-to-edge across an ultrawide monitor isn't
      // good UX anyway.
      setFitWidth(Math.max(240, Math.min(el.clientWidth - horizontalPadding, 900)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fullscreen])

  // Rasterizing a canvas at the phone's full devicePixelRatio (often 3 on
  // mid-range Android hardware) means 9x the pixels of a dpr-1 render —
  // heavy enough on a mobile CPU that switching documents (which mounts a
  // fresh canvas while the previous one is still in the DOM) visibly froze
  // the tab. Capping at 2 keeps text crisp while cutting that cost sharply.
  const [renderDpr, setRenderDpr] = useState(1)
  useEffect(() => {
    setRenderDpr(Math.min(window.devicePixelRatio || 1, 2))
  }, [])

  // Runs on mount AND every time the caller swaps `streamUrl` to switch to a
  // different document in-place (Suggested Materials / Prev-Next) — the
  // component itself never remounts, so state left over from the previous
  // document needs an explicit reset instead of relying on useState initializers.
  useEffect(() => {
    setLoading(true)
    setError(null)
    setNumPages(totalPages || null)
    hasClosedLoaderRef.current = false
    const { token, setStage } = useDocumentLoaderStore.getState()
    setStage(token, 'streaming')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])

  const closeDocumentLoader = () => {
    if (hasClosedLoaderRef.current) return
    hasClosedLoaderRef.current = true
    const { token, closeLoader } = useDocumentLoaderStore.getState()
    closeLoader(token)
  }

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
    const { token, setStage } = useDocumentLoaderStore.getState()
    setStage(token, 'rendering')
  }

  const onDocumentLoadError = (err: unknown) => {
    console.error('PDF JS load error:', err)
    setLoading(false)
    setError('Failed to load document. The secure token may have expired. Please refresh the page.')
    // Let the user see the in-viewer error instead of hiding it behind the
    // full-screen overlay forever.
    closeDocumentLoader()
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
      {/* Prev/Next material navigation — lives inside this container (not a
          sibling) so it stays visible and correctly stacked when the reader
          toggles fullscreen. */}
      {nav && <DocumentNavArrows {...nav} />}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b bg-background/95 backdrop-blur-sm z-30 select-none">
        {/* flex-1 min-w-0 (not a hardcoded max-w) so the title claims whatever
            space the fixed-width button cluster doesn't need — on narrow
            phones the cluster alone is ~150px, and a fixed max-w-[200px]
            here left almost nothing for the title, truncating it to 2-3
            characters. */}
        <span className="text-sm font-semibold truncate flex-1 min-w-0 flex items-center gap-1.5">
          {isPremium && <Badge variant="premium" className="text-[10px] flex-shrink-0">PRO</Badge>}
          <span className="truncate">{title}</span>
        </span>
        <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="hidden sm:inline-block text-xs text-muted-foreground w-12 text-center font-semibold tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setZoom(z => Math.min(2.0, z + 0.15))} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:ml-1 cursor-pointer" onClick={handleFullscreen} title="Fullscreen">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => useBugReportStore.getState().open(typeof window !== 'undefined' ? window.location.href : undefined)}
            title="Report an issue with this document"
          >
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pages Container */}
      <div ref={pagesContainerRef} className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-zinc-900/40 flex flex-col items-center gap-6 relative" style={{ maxHeight: fullscreen ? 'calc(100vh - 48px)' : 650 }}>
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
              <LazyPageSlot
                key={`${streamUrl}-${pageNum}`}
                pageNumber={pageNum}
                zoom={zoom}
                fitWidth={fitWidth}
                renderDpr={renderDpr}
                userEmail={userEmail}
                onRenderSuccess={pageNum === 1 ? closeDocumentLoader : undefined}
              />
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

interface LazyPageSlotProps {
  pageNumber: number
  zoom: number
  fitWidth: number
  renderDpr: number
  userEmail?: string
  onRenderSuccess?: () => void
}

// Only the first two pages mount immediately (page 1 must render to close the
// full-screen loader); the rest wait for an IntersectionObserver hit before
// mounting <Page>, so a long document doesn't pay to render every canvas at once.
function LazyPageSlot({ pageNumber, zoom, fitWidth, renderDpr, userEmail, onRenderSuccess }: LazyPageSlotProps) {
  const [visible, setVisible] = useState(pageNumber <= 2)
  const slotRef = useRef<HTMLDivElement>(null)
  const placeholderWidth = Math.round(fitWidth * zoom)
  const placeholderHeight = Math.round(placeholderWidth * 1.414) // A4-ish fallback aspect ratio

  useEffect(() => {
    if (visible) return
    const el = slotRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '1000px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={slotRef} className="relative shadow-2xl border border-zinc-800 rounded-lg overflow-hidden bg-white max-w-full">
      {visible ? (
        <Page
          pageNumber={pageNumber}
          width={fitWidth}
          scale={zoom}
          devicePixelRatio={renderDpr}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={onRenderSuccess}
          loading={
            <div
              className="max-w-full bg-zinc-950/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground"
              style={{ width: placeholderWidth, height: placeholderHeight }}
            >
              Rendering Page {pageNumber}...
            </div>
          }
        />
      ) : (
        <div
          className="max-w-full bg-zinc-950/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground"
          style={{ width: placeholderWidth, height: placeholderHeight }}
        >
          Page {pageNumber}
        </div>
      )}

      {/* Embedded Watermark over canvas */}
      {visible && userEmail && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden" aria-hidden>
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
}
