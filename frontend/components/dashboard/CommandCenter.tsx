'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { SafeToSpendCard } from './SafeToSpendCard'
import { CashPositionCard } from './CashPositionCard'
import { EmergencyFundGauge } from './EmergencyFundGauge'
import { WeeklyPriorities } from './WeeklyPriorities'
import { DebtWaterfall } from './DebtWaterfall'
import { UpcomingBills } from './UpcomingBills'
import { SinkingFunds } from './SinkingFunds'
import { MonthlyForecast } from './MonthlyForecast'
import { HermesBriefing } from './HermesBriefing'
import { QuickScenarios } from './QuickScenarios'
import type { DashboardData } from '@/types'

interface CommandCenterProps {
  data: DashboardData
  onRefresh?: () => void
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function CommandCenter({ data, onRefresh }: CommandCenterProps) {
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleSyncAI = async () => {
    if (syncing) return
    setSyncing(true)
    setToast(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('whwos_token') : null
      await fetch('/api/sync-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      setToast('AI sync requested — results appear in ~30 seconds.')

      // Auto-refresh every 5s for 60s to pick up agent results
      let elapsed = 0
      pollRef.current = setInterval(() => {
        elapsed += 5
        onRefresh?.()
        if (elapsed >= 60) {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      }, 5000)
    } catch {
      setToast('Sync request failed — check your connection.')
    } finally {
      setSyncing(false)
      setTimeout(() => setToast(null), 8000)
    }
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="p-4 lg:p-6 space-y-4"
    >
      {/* ─── Header row with Sync AI button ─── */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/25">Updated less than a minute ago</p>
        <div className="flex items-center gap-3">
          {toast && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-emerald-400"
            >
              {toast}
            </motion.span>
          )}
          <button
            onClick={handleSyncAI}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            Sync AI
          </button>
        </div>
      </div>

      {/* ─── Row 1: Hero metrics ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <SafeToSpendCard data={data} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <CashPositionCard
            accounts={data.accounts}
            totalCash={data.total_liquid_cash}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <EmergencyFundGauge
            current={data.emergency_fund.current}
            target={data.emergency_fund.target}
            months_runway={data.emergency_fund.months_runway}
            monthly_expenses={data.emergency_fund.monthly_expenses}
          />
        </motion.div>
      </div>

      {/* ─── Row 2: Priorities + Debt + Bills ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp}>
          <WeeklyPriorities priorities={data.priorities} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <DebtWaterfall debts={data.debts} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <UpcomingBills bills={data.upcoming_bills} />
        </motion.div>
      </div>

      {/* ─── Row 3: Sinking Funds + Forecast + Hermes + Scenarios ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <SinkingFunds funds={data.sinking_funds} />
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2">
          <MonthlyForecast forecast={data.monthly_forecast} />
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-1 space-y-4">
          <HermesBriefing briefing={data.briefing} />
          <QuickScenarios />
        </motion.div>
      </div>
    </motion.div>
  )
}
