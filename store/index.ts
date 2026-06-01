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
