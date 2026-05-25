'use client'

import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
