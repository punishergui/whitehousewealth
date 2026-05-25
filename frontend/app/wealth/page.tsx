'use client'

import { motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { NetWorthChart } from '@/components/wealth/NetWorthChart'
import { AssetAllocation } from '@/components/wealth/AssetAllocation'
import { AccountsGrid } from '@/components/wealth/AccountsGrid'
import { LiabilityBreakdown } from '@/components/wealth/LiabilityBreakdown'
import { useWealth } from '@/hooks/useWealth'
import { MOCK_WEALTH_DATA } from '@/lib/mockData'
import { formatCurrency } from '@/lib/formatters'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
}

export default function WealthPage() {
  const { data } = useWealth()
  const wealthData = data ?? MOCK_WEALTH_DATA

  return (
    <AppShell>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="p-4 lg:p-6 space-y-4"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Wealth Dashboard</h1>
            <p className="text-sm text-white/30 mt-0.5">Assets, liabilities, and net worth tracking</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Net Worth</p>
            <p
              className="text-3xl font-black text-emerald-400 tabular-nums"
              style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}
            >
              {formatCurrency(wealthData.net_worth)}
            </p>
          </div>
        </motion.div>

        {/* Hero net worth on mobile */}
        <motion.div variants={fadeUp} className="sm:hidden rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Net Worth</p>
          <p className="text-4xl font-black text-emerald-400 tabular-nums">
            {formatCurrency(wealthData.net_worth)}
          </p>
        </motion.div>

        {/* Net Worth Chart */}
        <motion.div variants={fadeUp}>
          <NetWorthChart
            history={wealthData.net_worth_history}
            currentNetWorth={wealthData.net_worth}
          />
        </motion.div>

        {/* Asset Allocation + Liability Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div variants={fadeUp}>
            <AssetAllocation
              allocation={wealthData.asset_allocation}
              totalAssets={wealthData.total_assets}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <LiabilityBreakdown debts={wealthData.debts} />
          </motion.div>
        </div>

        {/* Accounts Grid */}
        <motion.div variants={fadeUp}>
          <AccountsGrid accounts={wealthData.accounts} />
        </motion.div>
      </motion.div>
    </AppShell>
  )
}
