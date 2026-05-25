'use client'

import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatAPR, getAPRColor } from '@/lib/formatters'
import type { Debt } from '@/types'

interface LiabilityBreakdownProps {
  debts: Debt[]
}

export function LiabilityBreakdown({ debts }: LiabilityBreakdownProps) {
  const total = debts.reduce((s, d) => s + d.balance, 0)
  const maxBalance = Math.max(...debts.map((d) => d.balance))

  const sortedDebts = [...debts].sort((a, b) => b.balance - a.balance)

  return (
    <GlassCard
      title="Liability Breakdown"
      subtitle={`${formatCurrency(total)} total debt`}
      glowColor="red"
      padding="md"
    >
      <div className="space-y-4">
        {sortedDebts.map((debt, i) => {
          const pct = maxBalance > 0 ? (debt.balance / maxBalance) * 100 : 0

          return (
            <motion.div
              key={debt.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: debt.color ?? '#ef4444' }}
                  />
                  <span className="text-xs font-medium text-white/70 truncate">{debt.name}</span>
                  {debt.promo_expiry && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                      0% promo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className={`font-semibold ${getAPRColor(debt.promo_expiry ? 0 : debt.apr)}`}>
                    {formatAPR(debt.promo_expiry ? 0 : debt.apr)}
                  </span>
                  <span className="text-white/70 font-bold tabular-nums">
                    {formatCurrency(debt.balance)}
                  </span>
                </div>
              </div>

              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 + 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: debt.color ?? '#ef4444' }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/25">
                <span className="capitalize">{debt.type.replace('_', ' ')}</span>
                <span>Min: {formatCurrency(debt.min_payment)}/mo</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.03] p-2.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Total Debt</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-2.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Monthly Payments</p>
          <p className="text-sm font-bold text-white/70 mt-0.5">
            {formatCurrency(debts.reduce((s, d) => s + d.monthly_payment, 0))}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
