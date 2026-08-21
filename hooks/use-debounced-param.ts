'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Local, instantly-responsive input state that only calls `onCommit`
 * (typically a URL search-param update that triggers a server refetch)
 * after the user pauses typing for `delayMs` — instead of firing a new
 * search/navigation on every keystroke.
 */
export function useDebouncedParam(initial: string, onCommit: (value: string) => void, delayMs = 500) {
  const [value, setValue] = useState(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const onChange = (next: string) => {
    setValue(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onCommitRef.current(next), delayMs)
  }

  // For programmatic resets (e.g. a "Clear filters" button) that should
  // update the visible input immediately with no pending debounce firing
  // afterward and clobbering it.
  const reset = (next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setValue(next)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { value, onChange, reset }
}
