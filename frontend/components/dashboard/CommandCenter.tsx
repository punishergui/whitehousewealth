'use client'

import { motion } from 'framer-motion'
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

export function CommandCenter({ data }: CommandCenterProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="p-4 lg:p-6 space-y-4"
    >
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
