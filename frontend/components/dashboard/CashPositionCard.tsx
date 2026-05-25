'use client'

import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { formatCurrency } from '@/lib/formatters'
import type { Account } from '@/types'

interface CashPositionCardProps {
  accounts: Account[]
  totalCash: number
}

export function CashPositionCard({ accounts, totalCash }: CashPositionCardProps) {
  const cashAccounts = accounts.filter(
    (a) => a.type === 'checking' || a.type === 'savings'
  )

  return (
    <GlassCard
      title="Cash Position"
      glowColor="blue"
      padding="md"
      headerAction={
        <InfoTooltip content="Combined balance of all checking and savings accounts — your immediately accessible cash, before reserves or obligations." />
      }
    >
      <div className="space-y-3">
        {/* Total */}
        <div className="flex items-end justify-between">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-white tabular-nums"
          >
            {formatCurrency(totalCash)}
          </motion.span>
          <span className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Liquid</span>
        </div>

        {/* Account breakdown */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          {cashAccounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.2 }}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: account.color, boxShadow: `0 0 6px ${account.color}60` }}
                />
                <div>
                  <p className="text-xs font-medium text-white/70">{account.name}</p>
                  <p className="text-[10px] text-white/30">{account.institution}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-white tabular-nums">
                {formatCurrency(account.balance)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="pt-2 border-t border-white/[0.06]">
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
            {cashAccounts.map((account) => (
              <div
                key={account.id}
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(account.balance / totalCash) * 100}%`,
                  backgroundColor: account.color,
                }}
              />
            ))}
          </div>
        </div>

        {/* Institution count */}
        <div className="flex items-center gap-1.5 text-white/30">
          <Building2 size={10} />
          <span className="text-[10px]">
            {new Set(cashAccounts.map((a) => a.institution)).size} institution
            {new Set(cashAccounts.map((a) => a.institution)).size !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </GlassCard>
  )
}
