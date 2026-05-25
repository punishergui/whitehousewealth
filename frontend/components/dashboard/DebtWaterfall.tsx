'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, AlertTriangle, Clock } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Debt } from '@/types'

interface DebtWaterfallProps {
  debts: Debt[]
}

type Strategy = 'avalanche' | 'snowball'

function getDebtColor(apr: number, hasPromo: boolean): string {
  if (hasPromo) return '#f97316'
  if (apr >= 25) return '#ef4444'
  if (apr >= 15) return '#f59e0b'
  return '#3b82f6'
}

function getPayoffMonths(debt: Debt): number {
  if (debt.balance <= 0) return 0
  const monthlyRate = debt.apr / 100 / 12
  if (monthlyRate === 0) return Math.ceil(debt.balance / debt.monthly_payment)
  return Math.ceil(
    -Math.log(1 - (monthlyRate * debt.balance) / debt.monthly_payment) / Math.log(1 + monthlyRate)
  )
}

function getPayoffDate(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return formatDate(date.toISOString(), 'MMM yyyy')
}

export function DebtWaterfall({ debts }: DebtWaterfallProps) {
  const [strategy, setStrategy] = useState<Strategy>('avalanche')

  const sortedDebts = [...debts].sort((a, b) => {
    if (strategy === 'avalanche') return b.apr - a.apr
    return a.balance - b.balance
  })

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMinPayments = debts.reduce((sum, d) => sum + d.min_payment, 0)

  return (
    <GlassCard
      title="Debt Waterfall"
      subtitle={`${debts.length} debts • ${formatCurrency(totalDebt)} total`}
      headerAction={
        <div className="flex bg-white/[0.05] rounded-lg p-0.5">
          {(['avalanche', 'snowball'] as Strategy[]).map((s) => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-200',
                strategy === s
                  ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                  : 'text-white/30 hover:text-white/60'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      }
      padding="md"
    >
      <div className="space-y-3">
        {sortedDebts.map((debt, index) => {
          const hasPromo = !!debt.promo_expiry && !!debt.promo_apr
          const color = getDebtColor(debt.apr, hasPromo)
          const barWidth = (debt.balance / totalDebt) * 100
          const payoffMonths = getPayoffMonths(debt)
          const payoffDate = getPayoffDate(payoffMonths)

          return (
            <motion.div
              key={debt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 }}
              className="group"
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}
                  >
                    <CreditCard size={10} style={{ color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white/80">{debt.name}</span>
                      {hasPromo && (
                        <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-1 py-0.5 rounded font-medium">
                          PROMO
                        </span>
                      )}
                      {debt.apr >= 25 && (
                        <AlertTriangle size={10} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/30 mt-0.5">
                      <span
                        className="font-semibold"
                        style={{ color }}
                      >
                        {hasPromo ? `0% → ${debt.apr}%` : `${debt.apr}%`} APR
                      </span>
                      {hasPromo && debt.promo_expiry && (
                        <>
                          <span>·</span>
                          <Clock size={8} />
                          <span className="text-orange-400">Promo ends {formatDate(debt.promo_expiry, 'MMM d')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{formatCurrency(debt.balance)}</div>
                  <div className="text-[10px] text-white/30">Payoff: {payoffDate}</div>
                </div>
              </div>

              {/* Balance bar */}
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.07 + 0.2 }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}50`,
                  }}
                />
              </div>

              {/* Payment info */}
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/25">
                  Min: {formatCurrency(debt.min_payment)}/mo
                </span>
                <span className="text-[10px] text-white/25">
                  Paying: {formatCurrency(debt.monthly_payment)}/mo
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Min Payments</p>
          <p className="text-sm font-bold text-white">{formatCurrency(totalMinPayments)}/mo</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Total Debt</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(totalDebt)}</p>
        </div>
      </div>
    </GlassCard>
  )
}
