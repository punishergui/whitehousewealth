'use client'

import { AppShell } from '@/components/layout/AppShell'
import { ChatInterface } from '@/components/hermes/ChatInterface'

export default function HermesPage() {
  return (
    <AppShell>
      <div className="h-full flex flex-col overflow-hidden">
        <ChatInterface />
      </div>
    </AppShell>
  )
}
