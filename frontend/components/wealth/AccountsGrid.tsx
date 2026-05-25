'use client'

import { motion } from 'framer-motion'
import {
  Building2,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Home,
  Bitcoin,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Account } from '@/types'

interface AccountsGridProps {
  accounts: Account[]
}

const typeIcons: Record<string, React.ComponentType<{ size: number; className?: string; color?: string }>> = {
  checking: Building2,
  savings: PiggyBank,
  investment: TrendingUp,
  retirement: TrendingUp,
  credit_card: CreditCard,
  mortgage: Home,
  real_estate: Home,
  crypto: Bitcoin,
  loan: CreditCard,
  other: Building2,
}

const typeLabels: Record<string, string> = {
  checking: 'Checking',
  savings: 'High-Yield Savings',
  investment: 'Brokerage',
  retirement: 'Retirement',
  credit_card: 'Credit Card',
  mortgage: 'Mortgage',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  loan: 'Loan',
  other: 'Account',
}

export function AccountsGrid({ accounts }: AccountsGridProps) {
  const totalAssets = accounts
    .filter((a) => !['credit_card', 'mortgage', 'loan'].includes(a.type))
    .reduce((sum, a) => sum + a.balance, 0)

  return (
    <GlassCard
      title="All Accounts"
      subtitle={`${accounts.length} accounts • ${formatCurrency(totalAssets)} total assets`}
      padding="md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((account, index) => {
          const Icon = typeIcons[account.type] ?? Building2
          const isDebt = ['credit_card', 'mortgage', 'loan'].includes(account.type)

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="relative rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 group overflow-hidden"
            >
              {/* Color accent */}
              <div
                className="absolute top-0 left-0 w-0.5 h-full rounded-l-xl"
                style={{ backgroundColor: account.color }}
              />

              {/* Top row */}
              <div className="flex items-start justify-between mb-3 pl-1.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${account.color}20`, border: `1px solid ${account.color}25` }}
                >
                  <Icon size={16} color={account.color} />
                </div>
                <span className="text-[10px] text-white/30 uppercase tracking-wider pt-0.5">
                  {typeLabels[account.type]}
                </span>
              </div>

              <div className="pl-1.5">
                <p className="text-xs font-semibold text-white/70 mb-0.5 truncate">{account.name}</p>
                <p className="text-[10px] text-white/25 mb-2">{account.institution}</p>

                <div className={clsx(
                  'text-xl font-black tabular-nums',
                  isDebt ? 'text-red-400' : 'text-white'
                )}>
                  {isDebt ? '-' : ''}{formatCurrency(account.balance)}
                </div>

                {account.interest_rate && (
                  <p className="text-[10px] text-emerald-400/70 mt-0.5">
                    {account.interest_rate}% APY
                  </p>
                )}
                {account.account_number_last4 && (
                  <p className="text-[10px] text-white/20 mt-0.5">
                    ···· {account.account_number_last4}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
