import { create } from 'zustand'
import { FilterParams } from '@/types'

interface FilterState {
  filters: FilterParams
  setFilters: (filters: Partial<FilterParams>) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {},
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: {} }),
}))

interface UserState {
  isPremium: boolean
  premiumExpiry: Date | null
  setUserPremium: (isPremium: boolean, expiry?: Date | null) => void
}

export const useUserStore = create<UserState>((set) => ({
  isPremium: false,
  premiumExpiry: null,
  setUserPremium: (isPremium, expiry = null) =>
    set({ isPremium, premiumExpiry: expiry }),
}))

interface UIState {
  showPremiumModal: boolean
  setShowPremiumModal: (show: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  showPremiumModal: false,
  setShowPremiumModal: (show) => set({ showPremiumModal: show }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

export type DocumentLoadStage = 'verifying' | 'streaming' | 'rendering'

export const DOCUMENT_LOAD_STAGES: { key: DocumentLoadStage; label: string }[] = [
  { key: 'verifying', label: 'Verifying access' },
  { key: 'streaming', label: 'Preparing secure stream' },
  { key: 'rendering', label: 'Loading PDF viewer' },
]

interface DocumentLoaderState {
  isOpen: boolean
  title: string
  stage: DocumentLoadStage
  /** Bumped on every openLoader() call so a stale close from a previous
   *  navigation can never hide a loader opened by a newer click. */
  token: number
  openLoader: (title: string) => number
  setStage: (token: number, stage: DocumentLoadStage) => void
  closeLoader: (token: number) => void
}

export const useDocumentLoaderStore = create<DocumentLoaderState>((set, get) => ({
  isOpen: false,
  title: '',
  stage: 'verifying',
  token: 0,
  openLoader: (title) => {
    const token = get().token + 1
    set({ isOpen: true, title, stage: 'verifying', token })
    return token
  },
  setStage: (token, stage) => {
    if (token !== get().token) return
    set({ stage })
  },
  closeLoader: (token) => {
    if (token !== get().token) return
    set({ isOpen: false })
  },
}))

interface BugReportState {
  isOpen: boolean
  pageUrl: string
  open: (pageUrl?: string) => void
  close: () => void
}

// A single globally-mounted <ReportBugDialog/> (see app/layout.tsx) reads
// this store, so every trigger point (footer, profile, help page, document
// viewer) can just call open() instead of each rendering its own modal.
export const useBugReportStore = create<BugReportState>((set) => ({
  isOpen: false,
  pageUrl: '',
  open: (pageUrl) => set({ isOpen: true, pageUrl: pageUrl ?? (typeof window !== 'undefined' ? window.location.pathname : '') }),
  close: () => set({ isOpen: false }),
}))
