'use client'

import { AppShell } from '@/components/layout/AppShell'
import { FamilyDashboard } from '@/components/family/FamilyDashboard'

export default function FamilyPage() {
  return (
    <AppShell>
      <FamilyDashboard />
    </AppShell>
  )
}
