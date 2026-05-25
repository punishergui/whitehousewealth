'use client'

import { create } from 'zustand'
import type { DashboardData } from '@/types'

interface DashboardStore {
  data: DashboardData | null
  isLoading: boolean
  lastRefreshed: string | null
  setData: (data: DashboardData) => void
  setLoading: (loading: boolean) => void
  refresh: () => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  data: null,
  isLoading: false,
  lastRefreshed: null,

  setData: (data: DashboardData) =>
    set({
      data,
      lastRefreshed: new Date().toISOString(),
    }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  refresh: () => set({ lastRefreshed: new Date().toISOString() }),
}))
