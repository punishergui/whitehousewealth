'use client'

import { motion } from 'framer-motion'
import { Plane, Car, Gift, Hammer, Plus } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, calcProgress } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { SinkingFund } from '@/types'

interface SinkingFundsProps {
  funds: SinkingFund[]
}

const iconMap: Record<string, React.ComponentType<{ size: number; className?: string; color?: string }>> = {
  plane: Plane,
  car: Car,
  gift: Gift,
  hammer: Hammer,
}

export function SinkingFunds({ funds }: SinkingFundsProps) {
  const totalSaved = funds.reduce((sum, f) => sum + f.current, 0)
  const totalTarget = funds.reduce((sum, f) => sum + f.target, 0)

  return (
    <GlassCard
      title="Sinking Funds"
      subtitle={`${formatCurrency(totalSaved)} saved of ${formatCurrency(totalTarget)}`}
      headerAction={
        <button className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all duration-200">
          <Plus size={12} />
        </button>
      }
      padding="md"
    >
      <div className="grid grid-cols-2 gap-2">
        {funds.map((fund, index) => {
          const Icon = iconMap[fund.icon] ?? Plane
          const progress = calcProgress(fund.current, fund.target)

          return (
            <motion.div
              key={fund.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 }}
              className="relative rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:bg-white/[0.05] transition-all duration-200 group"
            >
              {/* Color accent */}
              <div
                className="absolute inset-0 rounded-xl opacity-10"
                style={{ background: `linear-gradient(135deg, ${fund.color}40, transparent)` }}
              />

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${fund.color}20` }}
                  >
                    <Icon size={12} color={fund.color} />
                  </div>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: fund.color }}
                  >
                    {progress.toFixed(0)}%
                  </span>
                </div>

                <p className="text-xs font-semibold text-white/70 truncate mb-1">{fund.name}</p>

                {/* Progress bar */}
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.08 + 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: fund.color }}
                  />
                </div>

                <div className="flex justify-between">
                  <span className="text-[10px] text-white font-semibold">
                    {formatCurrency(fund.current, { compact: true })}
                  </span>
                  <span className="text-[10px] text-white/30">
                    /{formatCurrency(fund.target, { compact: true })}
                  </span>
                </div>

                <p className="text-[9px] text-white/20 mt-0.5">
                  +{formatCurrency(fund.monthly_contribution)}/mo
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
