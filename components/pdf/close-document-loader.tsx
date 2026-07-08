'use client'
import { useEffect } from 'react'
import { useDocumentLoaderStore } from '@/store'

/**
 * Drop into any branch of a note/PYQ detail page that does NOT render
 * PDFViewer (premium gate, sign-in prompt) so the full-screen "opening
 * document" overlay still closes once that branch has rendered.
 */
export function CloseDocumentLoader() {
  useEffect(() => {
    const { token, closeLoader } = useDocumentLoaderStore.getState()
    closeLoader(token)
  }, [])
  return null
}
