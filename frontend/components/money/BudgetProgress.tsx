'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPercent, calcProgress } from '@/lib/formatters'
import { useBudgets } from '@/hooks/useTransactions'
import { MOCK_BUDGETS } from '@/lib/mockData'
import type { Budget } from '@/types'

function BudgetBar({ budget, index }: { budget: Budget; index: number }) {
  const pct = calcProgress(budget.spent, budget.amount)
  const isOver = pct >= 100
  const isNear = pct >= 80

  const barColor = isOver
    ? '#ef4444'
    : isNear
    ? '#f59e0b'
    : budget.color ?? '#10b981'

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isOver && <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />}
          {isNear && !isOver && <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />}
          <span className="text-xs font-medium text-white/70">{budget.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={isOver ? 'text-red-400 font-bold' : 'text-white/50'}>
            {formatCurrency(budget.spent)}
          </span>
          <span className="text-white/20">/</span>
          <span className="text-white/40">{formatCurrency(budget.amount)}</span>
          <span
            className="text-[10px] font-bold"
            style={{ color: barColor }}
          >
            {formatPercent(pct, { decimals: 0 })}
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: index * 0.05 + 0.1 }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>

      {isOver && (
        <p className="text-[10px] text-red-400/70">
          Over budget by {formatCurrency(budget.spent - budget.amount)}
        </p>
      )}
    </motion.div>
  )
}

export function BudgetProgress() {
  const { data: budgets, isLoading } = useBudgets()
  const displayBudgets = budgets ?? MOCK_BUDGETS

  const totalBudget = displayBudgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = displayBudgets.reduce((s, b) => s + b.spent, 0)
  const overBudgetCount = displayBudgets.filter((b) => b.spent > b.amount).length

  return (
    <GlassCard
      title="Budget Progress"
      subtitle={`${displayBudgets.length} categories · ${overBudgetCount > 0 ? `${overBudgetCount} over budget` : 'All on track'}`}
      glowColor={overBudgetCount > 0 ? 'red' : 'emerald'}
      padding="md"
    >
      {/* Summary bar */}
      <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Monthly Total</span>
          <span className="text-xs text-white/50">
            <span className={totalSpent > totalBudget ? 'text-red-400 font-bold' : 'text-white/70 font-semibold'}>
              {formatCurrency(totalSpent)}
            </span>
            {' '}/ {formatCurrency(totalBudget)}
          </span>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              backgroundColor: totalSpent > totalBudget ? '#ef4444' : totalSpent / totalBudget > 0.8 ? '#f59e0b' : '#10b981'
            }}
          />
        </div>
      </div>

      {/* Individual budgets */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5 animate-pulse">
              <div className="h-3 bg-white/[0.05] rounded w-2/3" />
              <div className="h-1.5 bg-white/[0.05] rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayBudgets.map((budget, i) => (
            <BudgetBar key={budget.id} budget={budget} index={i} />
          ))}
        </div>
      )}
    </GlassCard>
  )
}
