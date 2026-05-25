'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppNotification } from '@/types'

interface UIStore {
  sidebarCollapsed: boolean
  activeSection: string
  notifications: AppNotification[]
  isMobileMenuOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveSection: (section: string) => void
  addNotification: (notification: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  setMobileMenuOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeSection: 'dashboard',
      notifications: [],
      isMobileMenuOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),

      setActiveSection: (section: string) =>
        set({ activeSection: section }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif_${Date.now()}`,
              created_at: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ],
        })),

      markNotificationRead: (id: string) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setMobileMenuOpen: (open: boolean) => set({ isMobileMenuOpen: open }),
    }),
    {
      name: 'whwos-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
