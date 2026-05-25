'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Check } from 'lucide-react'
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

function SyncAgentButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSync = async () => {
    if (state === 'loading') return
    setState('loading')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('whwos_token') : null
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/agent/sync-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // The frontend doesn't hold the agent key — this hits a user-auth'd endpoint to
        // queue a job that the Hermes agent will pick up on its next poll.
        body: JSON.stringify({ task: 'all', note: 'Manual sync from dashboard' }),
      })
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('idle')
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all duration-200 text-xs font-medium disabled:opacity-60"
    >
      {state === 'done' ? (
        <Check size={12} className="text-emerald-400" />
      ) : (
        <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : ''} />
      )}
      {state === 'done' ? 'Queued' : state === 'loading' ? 'Syncing…' : 'Sync AI'}
    </button>
  )
}

export function CommandCenter({ data }: CommandCenterProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="p-4 lg:p-6 space-y-4"
    >
      {/* ─── Header bar ─── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/30 uppercase tracking-widest">Command Center</p>
        <SyncAgentButton />
      </div>

      {/* ─── Row 1: Hero metrics ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Safe to Spend — spans 1 col on lg */}
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <SafeToSpendCard data={data} />
        </motion.div>

        {/* Cash Position */}
        <motion.div variants={fadeUp}>
          <CashPositionCard
            accounts={data.accounts}
            totalCash={data.total_liquid_cash}
          />
        </motion.div>

        {/* Emergency Fund */}
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
        {/* Weekly Priorities */}
        <motion.div variants={fadeUp}>
          <WeeklyPriorities priorities={data.weekly_priorities} />
        </motion.div>

        {/* Debt Waterfall — takes more space */}
        <motion.div variants={fadeUp}>
          <DebtWaterfall debts={data.debts} />
        </motion.div>

        {/* Upcoming Bills */}
        <motion.div variants={fadeUp}>
          <UpcomingBills bills={data.upcoming_bills} />
        </motion.div>
      </div>

      {/* ─── Row 3: Sinking Funds + Forecast + Hermes + Scenarios ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sinking Funds — 2 cols */}
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <SinkingFunds funds={data.sinking_funds} />
        </motion.div>

        {/* Monthly Forecast — 1.5 cols */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <MonthlyForecast forecast={data.monthly_forecast} />
        </motion.div>

        {/* Hermes Briefing + Quick Scenarios */}
        <motion.div variants={fadeUp} className="lg:col-span-1 space-y-4">
          <HermesBriefing briefing={data.hermes_briefing} />
          <QuickScenarios />
        </motion.div>
      </div>
    </motion.div>
  )
}
