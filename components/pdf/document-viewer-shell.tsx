'use client'
import { useEffect, useRef, useState } from 'react'
import { NoteMetaCard } from '@/components/notes/note-meta-card'
import { PDFViewer } from '@/components/pdf/pdf-viewer'
import { PremiumGateInline } from '@/components/pdf/premium-gate-inline'
import { DocumentNavArrows } from '@/components/pdf/document-nav-arrows'
import { SuggestedMaterials } from '@/components/pdf/suggested-materials'
import { useDocumentLoaderStore } from '@/store'
import type { DocumentDetail } from '@/lib/document-types'
import type { SuggestionItem } from '@/lib/recommendations'

type DocType = 'note' | 'pyq'
type DocRef = { type: DocType; slug: string }

type ViewerState =
  | ({ gated: false } & DocumentDetail)
  | { gated: true; type: DocType; slug: string; title: string }

interface MountedDoc {
  key: string
  ref: DocRef
  state: ViewerState & { gated: false }
}

// A cached entry never goes stale during the reading session it was fetched
// in — 2h stream tokens comfortably outlast this — so a Prev/Next hit on
// anything already seen (or silently prefetched) resolves with zero network
// round trip.
const FRESH_MS = 90 * 60 * 1000

// Non-gated documents the reader has actually opened stay mounted (hidden via
// CSS, not unmounted) up to this many at a time, so stepping back to one is a
// plain visibility toggle — no re-fetch, no pdf.js re-parse. Bounded so a long
// forward-only session doesn't keep every large PDF's canvases in memory.
const MAX_MOUNTED = 3

function key(ref: DocRef) {
  return `${ref.type}:${ref.slug}`
}

interface DocumentViewerShellProps {
  initial: DocumentDetail
}

export function DocumentViewerShell({ initial }: DocumentViewerShellProps) {
  const [current, setCurrent] = useState<ViewerState>({ gated: false, ...initial })
  const [history, setHistory] = useState<DocRef[]>([{ type: initial.type, slug: initial.slug }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [mountedDocs, setMountedDocs] = useState<MountedDoc[]>([
    { key: key({ type: initial.type, slug: initial.slug }), ref: { type: initial.type, slug: initial.slug }, state: { gated: false, ...initial } },
  ])

  const cacheRef = useRef<Map<string, { state: ViewerState; fetchedAt: number }> | null>(null)
  if (!cacheRef.current) {
    cacheRef.current = new Map()
    cacheRef.current.set(key({ type: initial.type, slug: initial.slug }), {
      state: { gated: false, ...initial },
      fetchedAt: Date.now(),
    })
  }

  // Marks a document as "on screen": moves it to the front of the mounted
  // pool (kept alive, hidden via CSS) and evicts the least-recently-used
  // entry once the pool exceeds MAX_MOUNTED.
  function touchMounted(ref: DocRef, state: ViewerState & { gated: false }) {
    const k = key(ref)
    setMountedDocs(prev => {
      const next = [...prev.filter(d => d.key !== k), { key: k, ref, state }]
      return next.length > MAX_MOUNTED ? next.slice(next.length - MAX_MOUNTED) : next
    })
  }

  async function fetchDetail(ref: DocRef): Promise<ViewerState | null> {
    const cacheKey = key(ref)
    const cached = cacheRef.current!.get(cacheKey)
    if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached.state

    try {
      const res = await fetch(`/api/document/${ref.type}/${ref.slug}`)
      if (res.status === 403) {
        const data = await res.json().catch(() => null)
        if (data?.premiumGate) {
          const gated: ViewerState = { gated: true, type: ref.type, slug: data.slug, title: data.title }
          cacheRef.current!.set(cacheKey, { state: gated, fetchedAt: Date.now() })
          return gated
        }
        return null
      }
      if (!res.ok) return null
      const data: DocumentDetail = await res.json()
      const state: ViewerState = { gated: false, ...data }
      cacheRef.current!.set(cacheKey, { state, fetchedAt: Date.now() })
      return state
    } catch {
      return null
    }
  }

  function pushUrlFor(ref: DocRef) {
    const path = ref.type === 'note' ? `/notes/${ref.slug}` : `/pyq/${ref.slug}`
    window.history.pushState({ kiithubDoc: true }, '', path)
  }

  async function goTo(ref: DocRef, opts: { pushUrl: boolean }) {
    const k = key(ref)

    // Already mounted (its PDFViewer instance is alive, just hidden) — this is
    // the common Prev case and any revisit within the pool: swap `current`
    // and reorder the pool with zero fetch, zero loader, zero re-parse.
    const mounted = mountedDocs.find(d => d.key === k)
    if (mounted) {
      setSwitchError(null)
      setCurrent(mounted.state)
      touchMounted(ref, mounted.state)
      if (opts.pushUrl) pushUrlFor(ref)
      fetch(`/api/document/${ref.type}/${ref.slug}/view`, { method: 'POST', keepalive: true }).catch(() => {})
      return
    }

    const cached = cacheRef.current!.get(k)
    const { openLoader, closeLoader } = useDocumentLoaderStore.getState()
    const token = openLoader(cached?.state.title ?? 'Document')
    setSwitching(true)
    setSwitchError(null)

    const state = await fetchDetail(ref)
    if (!state) {
      closeLoader(token)
      setSwitching(false)
      setSwitchError('Could not open that document. Please try again.')
      return
    }

    setCurrent(state)
    if (state.gated) {
      // A gated result never mounts PDFViewer, so nothing will fire the
      // page-1-rendered callback that normally closes the loader.
      closeLoader(token)
    } else {
      touchMounted(ref, state)
    }

    if (opts.pushUrl) pushUrlFor(ref)
    fetch(`/api/document/${ref.type}/${ref.slug}/view`, { method: 'POST', keepalive: true }).catch(() => {})
    setSwitching(false)
  }

  function goPrev() {
    if (switching || historyIndex <= 0) return
    const ref = history[historyIndex - 1]
    setHistoryIndex(historyIndex - 1)
    goTo(ref, { pushUrl: true })
  }

  function goNext() {
    if (switching) return
    if (historyIndex < history.length - 1) {
      const ref = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      goTo(ref, { pushUrl: true })
      return
    }
    if (current.gated || !current.suggestions[0]) return
    const ref: DocRef = { type: current.suggestions[0].type, slug: current.suggestions[0].slug }
    setHistory(h => [...h.slice(0, historyIndex + 1), ref])
    setHistoryIndex(historyIndex + 1)
    goTo(ref, { pushUrl: true })
  }

  function goToSuggestion(item: SuggestionItem) {
    if (switching) return
    const ref: DocRef = { type: item.type, slug: item.slug }
    setHistory(h => [...h.slice(0, historyIndex + 1), ref])
    setHistoryIndex(historyIndex + 1)
    goTo(ref, { pushUrl: true })
  }

  // Browser back/forward should stay in sync with our own history stack
  // instead of desyncing the address bar from whatever the shell is showing
  // (pushState above bypasses Next's router entirely on purpose).
  useEffect(() => {
    function onPopState() {
      const path = window.location.pathname
      const noteMatch = /^\/notes\/([^/]+)\/?$/.exec(path)
      const pyqMatch = /^\/pyq\/([^/]+)\/?$/.exec(path)
      const ref: DocRef | null = noteMatch
        ? { type: 'note', slug: noteMatch[1] }
        : pyqMatch
        ? { type: 'pyq', slug: pyqMatch[1] }
        : null
      if (!ref) return
      setHistory(h => {
        const idx = h.findIndex(e => e.type === ref.type && e.slug === ref.slug)
        if (idx !== -1) { setHistoryIndex(idx); return h }
        setHistoryIndex(h.length)
        return [...h, ref]
      })
      goTo(ref, { pushUrl: false })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // As soon as a document is on screen, silently warm the previous/next
  // entries and the top suggestions in the background: fetch their metadata
  // + a signed stream URL, then a small Range request against that stream so
  // Telegram's file-URL resolution is already cached by the time the reader
  // actually clicks through.
  useEffect(() => {
    if (current.gated) return
    let cancelled = false
    const targets: DocRef[] = []
    if (historyIndex > 0) targets.push(history[historyIndex - 1])
    if (historyIndex < history.length - 1) targets.push(history[historyIndex + 1])
    else if (current.suggestions[0]) targets.push({ type: current.suggestions[0].type, slug: current.suggestions[0].slug })
    current.suggestions.slice(0, 5).forEach(s => targets.push({ type: s.type, slug: s.slug }))

    const seen = new Set<string>()
    for (const ref of targets) {
      const k = key(ref)
      if (seen.has(k)) continue
      seen.add(k)
      ;(async () => {
        const state = await fetchDetail(ref)
        if (cancelled || !state || state.gated) return
        fetch(state.streamUrl, { headers: { Range: 'bytes=0-131071' } }).catch(() => {})
      })()
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.type, current.slug])

  useEffect(() => {
    if (!switchError) return
    const t = setTimeout(() => setSwitchError(null), 5000)
    return () => clearTimeout(t)
  }, [switchError])

  const canPrev = historyIndex > 0
  const canNext = historyIndex < history.length - 1 || (!current.gated && current.suggestions.length > 0)
  const prevLabel = canPrev ? cacheRef.current!.get(key(history[historyIndex - 1]))?.state.title : undefined
  const nextLabel = historyIndex < history.length - 1
    ? cacheRef.current!.get(key(history[historyIndex + 1]))?.state.title
    : (!current.gated ? current.suggestions[0]?.title : undefined)

  const navProps = { canPrev, canNext, prevLabel, nextLabel, onPrev: goPrev, onNext: goNext, disabled: switching }

  return (
    <div className="space-y-6">
      {!current.gated ? (
        <NoteMetaCard note={current.meta} />
      ) : (
        <div className="rounded-xl border p-6">
          <h1 className="text-xl font-bold">{current.title}</h1>
        </div>
      )}

      {mountedDocs.map(d => (
        <div key={d.key} className={d.key === key({ type: current.type, slug: current.slug }) && !current.gated ? '' : 'hidden'}>
          <PDFViewer
            streamUrl={d.state.streamUrl}
            title={d.state.title}
            isPremium={d.state.isPremium}
            totalPages={d.state.totalPages}
            userEmail={d.state.userEmail}
            nav={navProps}
          />
        </div>
      ))}
      {current.gated && (
        <div className="relative">
          <PremiumGateInline />
          <DocumentNavArrows {...navProps} />
        </div>
      )}

      {switchError && <p className="text-sm text-red-500 text-center">{switchError}</p>}

      {!current.gated && (
        <SuggestedMaterials suggestions={current.suggestions} onSelect={goToSuggestion} disabled={switching} />
      )}
    </div>
  )
}
