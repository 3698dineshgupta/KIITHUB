// Client-side only — fire-and-forget, called once per debounced search
// commit (never per keystroke) from inside the same callback that also
// fires a router.push for the new ?search= URL. See app/api/search-log/route.ts.
//
// Uses sendBeacon, not fetch: verified live that a plain fetch() call here
// — with or without keepalive — intermittently reaches the server with an
// empty body ("Unexpected end of JSON input"), specifically when fired
// from the same synchronous tick as that router.push's own navigation
// fetch. sendBeacon is the browser API built exactly for "queue this and
// don't care about the response, must survive concurrent navigation" —
// switching to it made the flakiness go away entirely rather than trying
// to out-guess fetch's navigation-interaction edge cases.
export function logSearch(query: string, page: 'notes' | 'pyq' | 'merchandise') {
  const q = query.trim()
  if (!q) return
  const blob = new Blob([JSON.stringify({ query: q, page })], { type: 'application/json' })
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/search-log', blob)
    return
  }
  fetch('/api/search-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: blob }).catch(() => {})
}
