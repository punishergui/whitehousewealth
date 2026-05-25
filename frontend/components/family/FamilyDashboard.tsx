'use client'

import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, XCircle, ShoppingCart, Calendar, Plane } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, calcProgress, formatDate } from '@/lib/formatters'
import { useDashboard } from '@/hooks/useDashboard'
import { MOCK_DASHBOARD_DATA } from '@/lib/mockData'
import type { SinkingFund } from '@/types'

function SafetyIndicator({ amount }: { amount: number }) {
  if (amount >= 2000) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle size={20} className="text-emerald-400" />
        <span className="text-sm font-bold text-emerald-400">You&apos;re good to go!</span>
      </div>
    )
  }
  if (amount >= 500) {
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className="text-amber-400" />
        <span className="text-sm font-bold text-amber-400">Spend carefully</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <XCircle size={20} className="text-red-400" />
      <span className="text-sm font-bold text-red-400">Hold off on spending</span>
    </div>
  )
}

export function FamilyDashboard() {
  const { data } = useDashboard()
  const dashData = data ?? MOCK_DASHBOARD_DATA

  const safeToSpend = dashData.safe_to_spend
  const heroColor =
    safeToSpend >= 2000 ? '#10b981' : safeToSpend >= 500 ? '#f59e0b' : '#ef4444'

  const groceryBudget = { spent: 372, total: 800 }
  const groceryRemaining = groceryBudget.total - groceryBudget.spent
  const groceryPct = calcProgress(groceryBudget.spent, groceryBudget.total)

  const dueBills = dashData.upcoming_bills
    .filter((b) => b.status === 'due' || b.status === 'upcoming')
    .slice(0, 4)

  const vacationFunds = dashData.sinking_funds.filter((sf: SinkingFund) =>
    sf.name.toLowerCase().includes('vacation') ||
    sf.name.toLowerCase().includes('disney') ||
    sf.name.toLowerCase().includes('arkansas') ||
    sf.name.toLowerCase().includes('trip')
  )

  const allFunds = vacationFunds.length > 0 ? vacationFunds : dashData.sinking_funds.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-4 lg:p-8 space-y-6 max-w-3xl mx-auto"
    >
      {/* Hero safe-to-spend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${heroColor}15, ${heroColor}06)`,
          border: `1.5px solid ${heroColor}30`,
          boxShadow: `0 0 40px ${heroColor}15`,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${heroColor}60, transparent)` }} />
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-white/40 uppercase tracking-[0.2em] mb-3">
            OK to Spend This Week
          </p>
          <p
            className="text-7xl font-black tabular-nums mb-2"
            style={{
              color: heroColor,
              textShadow: `0 0 40px ${heroColor}60, 0 0 80px ${heroColor}30`,
            }}
          >
            {formatCurrency(safeToSpend)}
          </p>
          <div className="flex justify-center mt-3">
            <SafetyIndicator amount={safeToSpend} />
          </div>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Grocery budget */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <GlassCard padding="md">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-white/70">Grocery Budget</span>
            </div>

            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[10px] text-white/30">Remaining</p>
                <p className="text-3xl font-black text-emerald-400">{formatCurrency(groceryRemaining)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/30">Spent</p>
                <p className="text-sm font-bold text-white/50">{formatCurrency(groceryBudget.spent)}</p>
                <p className="text-[10px] text-white/25">of {formatCurrency(groceryBudget.total)}</p>
              </div>
            </div>

            <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${groceryPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: groceryPct > 80 ? '#ef4444' : '#10b981' }}
              />
            </div>
            <p className="text-[10px] text-white/25 mt-1.5 text-right">{groceryPct.toFixed(0)}% used</p>
          </GlassCard>
        </motion.div>

        {/* Bills this week */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <GlassCard padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-blue-400" />
              <span className="text-sm font-bold text-white/70">Bills Coming Up</span>
            </div>

            <div className="space-y-2">
              {dueBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70">{bill.name}</p>
                    <p className="text-[10px] text-white/30">Due {formatDate(bill.due_date, 'MMM d')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white/80 tabular-nums">
                      {formatCurrency(bill.amount)}
                    </p>
                    {bill.status === 'due' && (
                      <p className="text-[10px] text-amber-400">Due soon!</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Vacation / savings funds */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Plane size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-white/60 uppercase tracking-wider">Family Savings Goals</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allFunds.map((fund, i) => {
            const pct = calcProgress(fund.current, fund.target)
            const fundColor = fund.color || '#3b82f6'
            return (
              <motion.div
                key={fund.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08, duration: 0.35 }}
                className="rounded-2xl p-4 border border-white/[0.07]"
                style={{ background: `${fundColor}08` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white/70">{fund.name}</span>
                  <span className="text-lg">{fund.icon === 'plane' ? '✈️' : fund.icon === 'car' ? '🚗' : fund.icon === 'gift' ? '🎁' : '🏠'}</span>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <p className="text-2xl font-black tabular-nums" style={{ color: fundColor }}>
                    {formatCurrency(fund.current)}
                  </p>
                  <p className="text-xs text-white/30">of {formatCurrency(fund.target)}</p>
                </div>

                <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 + i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: fundColor }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-white/25">
                  <span>{pct.toFixed(0)}% funded</span>
                  <span>+{formatCurrency(fund.monthly_contribution)}/mo</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Emergency fund status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02] text-center"
      >
        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Emergency Fund</p>
        <p className="text-2xl font-black text-white/60">
          {dashData.emergency_fund.months_runway.toFixed(1)}{' '}
          <span className="text-base font-normal text-white/30">months of expenses</span>
        </p>
        <p className="text-xs text-white/25 mt-1">
          {formatCurrency(dashData.emergency_fund.current)} saved of {formatCurrency(dashData.emergency_fund.target)} goal
        </p>
      </motion.div>
    </motion.div>
  )
}
