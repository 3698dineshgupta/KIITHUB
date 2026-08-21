'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Matches app/api/presence/heartbeat/route.ts's HEARTBEAT_INTERVAL_SEC.
const HEARTBEAT_INTERVAL_MS = 30_000

function ping() {
  fetch('/api/presence/heartbeat', { method: 'POST', keepalive: true }).catch(() => {})
}

// Mounted once, globally (see app/layout.tsx). Renders nothing — purely a
// side-effect component that keeps User.lastActiveAt / totalTimeSpentSec
// current for signed-in users so the admin panel can show who's online and
// how much time each user has actually spent on the site.
export function PresenceHeartbeat() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return

    // Skips a background/hidden tab: a heartbeat here would count idle
    // background time as "time spent", which is the exact thing the fixed
    // per-beat increment (rather than measuring wall-clock gaps) is meant
    // to avoid — an interval alone isn't enough since setInterval keeps
    // firing in background tabs.
    const tick = () => {
      if (document.visibilityState === 'visible') ping()
    }

    // Fire immediately so "online now" reflects a fresh sign-in/reload
    // within seconds instead of waiting for the first interval tick.
    tick()
    const interval = setInterval(tick, HEARTBEAT_INTERVAL_MS)

    // Coming back to a tab that's been hidden long enough to have missed
    // ticks should re-establish "online" right away rather than waiting up
    // to a full interval.
    const onVisibility = () => { if (document.visibilityState === 'visible') ping() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status])

  return null
}
