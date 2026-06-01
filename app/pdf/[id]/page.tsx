'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crown,
  Lock,
  Loader2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import type { PDFMetadata } from '@/types'

export default function PDFViewerPage() {
  const params = useParams()
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const viewerRef = useRef<HTMLIFrameElement>(null)

  const [pdf, setPdf] = useState<PDFMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [zoom, setZoom] = useState(100)

  // Disable right-click in the viewer area
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  // Load PDF metadata
  useEffect(() => {
    if (!params.id) return
    fetch(`/api/pdf/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPdf(d.pdf)
      })
      .finally(() => setLoading(false))
  }, [params.id])

  // Get profile & generate access token
  useEffect(() => {
    if (!isSignedIn || !params.id) return

    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUserEmail(d.user.email)
      })

    fetch(`/api/pdf/${params.id}/access`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setIsPremium(d.isPremium)
          if (d.requiresPremium && !d.isPremium) {
            setShowPremiumModal(true)
          } else {
            setStreamUrl(
              `/api/pdf/stream/${params.id}?token=${encodeURIComponent(d.token)}`
            )
          }
        }
      })
  }, [isSignedIn, params.id])

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-600 mb-4">PDF not found</p>
          <Link href="/pdf"><Button>Browse PDFs</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 bg-slate-900">
      {/* Top bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-4">
        <Link href="/pdf">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-white font-medium truncate">{pdf.title}</h1>
          <p className="text-sm text-slate-400 truncate">
            {pdf.subject} • Sem {pdf.semester} • {pdf.year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pdf.isPremium && (
            <Badge variant="premium" className="gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-300 min-w-[3rem] text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="relative" style={{ height: 'calc(100vh - 112px)' }}>
        {!isSignedIn ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 text-center max-w-md">
              <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sign in to view PDFs</h3>
              <p className="text-slate-600 mb-6">Create a free account to start accessing study materials</p>
              <Link href="/auth/sign-in"><Button className="w-full">Sign In</Button></Link>
            </Card>
          </div>
        ) : streamUrl ? (
          <div className="relative h-full">
            {/* Watermark overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
              style={{ opacity: 0.06 }}
            >
              <div
                className="text-white text-2xl font-bold rotate-[-45deg] whitespace-nowrap select-none"
                style={{ userSelect: 'none', fontSize: '24px' }}
              >
                {userEmail || 'KIITHUB'} • KIITHUB
              </div>
            </div>

            <iframe
              ref={viewerRef}
              src={`${streamUrl}#zoom=${zoom}&toolbar=0&navpanes=0`}
              className="w-full h-full border-none"
              title={pdf.title}
              onContextMenu={(e) => e.preventDefault()}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000/zoom}%` }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        )}
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <button
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-4">
              <Crown className="h-10 w-10 text-amber-500" />
            </div>

            <h3 className="text-2xl font-bold mb-2">Premium Content</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This PDF is exclusive to premium members. Unlock unlimited access to all study materials for just ₹299/year.
            </p>

            <div className="space-y-3 text-left mb-6">
              {[
                'Unlimited PDF access',
                'All premium notes & PYQs',
                'No daily limits',
                'Ad-free experience',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  {f}
                </div>
              ))}
            </div>

            <Link href="/premium">
              <Button variant="premium" size="lg" className="w-full">
                Unlock Premium — ₹299/year
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  )
}
