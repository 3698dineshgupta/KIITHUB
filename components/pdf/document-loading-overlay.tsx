'use client'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'
import { useDocumentLoaderStore, DOCUMENT_LOAD_STAGES } from '@/store'
import { cn } from '@/lib/utils'

const STAGE_SUBTEXT: Record<string, string> = {
  verifying: 'Verifying access...',
  streaming: 'Preparing secure stream...',
  rendering: 'Loading PDF viewer...',
}

// Safety net: if something goes wrong (navigation error, premium gate we
// didn't account for, a genuinely slow connection) the overlay never gets
// permanently stuck blocking the page.
const MAX_OPEN_MS = 20000

export function DocumentLoadingOverlay() {
  const isOpen = useDocumentLoaderStore(s => s.isOpen)
  const title = useDocumentLoaderStore(s => s.title)
  const stage = useDocumentLoaderStore(s => s.stage)
  const token = useDocumentLoaderStore(s => s.token)
  const closeLoader = useDocumentLoaderStore(s => s.closeLoader)

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => closeLoader(token), MAX_OPEN_MS)
    return () => clearTimeout(t)
  }, [isOpen, token, closeLoader])

  const stageIndex = DOCUMENT_LOAD_STAGES.findIndex(s => s.key === stage)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm select-none"
          role="alert"
          aria-live="assertive"
          // Blocks interaction with the rest of the page (and further
          // card clicks) while a document is opening.
          onClick={e => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-5 p-8 rounded-2xl bg-card shadow-2xl border max-w-sm w-full mx-4"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-16 h-16 border-4 border-primary/20 rounded-full" />
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-primary text-xl">K</span>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Opening Secure Document...
              </h2>
              <p className="text-sm text-muted-foreground mt-1 truncate max-w-full">{title}</p>
              <p className="text-xs text-muted-foreground mt-2 animate-pulse">{STAGE_SUBTEXT[stage]}</p>
            </div>

            <div className="w-full space-y-2 pt-1">
              {DOCUMENT_LOAD_STAGES.map((s, i) => {
                const done = i < stageIndex
                const active = i === stageIndex
                return (
                  <div key={s.key} className="flex items-center gap-2.5 text-xs">
                    <span
                      className={cn(
                        'flex items-center justify-center h-4 w-4 rounded-full flex-shrink-0 transition-colors',
                        done ? 'bg-emerald-500 text-white' : active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {done ? <Check className="h-2.5 w-2.5" /> : active ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
                    </span>
                    <span className={cn('transition-colors', done ? 'text-foreground' : active ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
