'use client'

import { AppShell } from '@/components/layout/AppShell'
import { CommandCenter } from '@/components/dashboard/CommandCenter'
import { useDashboard } from '@/hooks/useDashboard'
import { MOCK_DASHBOARD_DATA } from '@/lib/mockData'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const dashboardData = data ?? MOCK_DASHBOARD_DATA

  return (
    <AppShell>
      {isLoading && !data ? (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 size={28} className="animate-spin text-blue-400 opacity-60" />
        </div>
      ) : (
        <CommandCenter data={dashboardData} />
      )}
    </AppShell>
  )
}
