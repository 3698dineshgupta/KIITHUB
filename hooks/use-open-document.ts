import { useCallback } from 'react'
import { useDocumentLoaderStore } from '@/store'

/**
 * Click handler for note/PYQ/syllabus cards: triggers the full-screen
 * "opening document" overlay right away, before Next.js navigation even
 * starts. Skips modifier-clicks (ctrl/cmd/middle-click) so opening a
 * document in a new tab still works as expected.
 */
export function useOpenDocument() {
  const openLoader = useDocumentLoaderStore(s => s.openLoader)

  return useCallback(
    (title: string) => (e: React.MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      openLoader(title)
    },
    [openLoader]
  )
}
