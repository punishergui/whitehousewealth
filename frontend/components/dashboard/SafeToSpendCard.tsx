'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Info, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { DashboardData } from '@/types'

interface SafeToSpendCardProps {
  data: DashboardData
}

function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let startTime: number
    let animationId: number
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [target, duration])
  return value
}

export function SafeToSpendCard({ data }: SafeToSpendCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const animatedValue = useCountUp(data.safe_to_spend)
  const isPositive = data.safe_to_spend > 0

  const breakdownItems = [
    { label: 'Total liquid cash', value: data.safe_to_spend_breakdown.total_cash, positive: true },
    { label: 'Bills due (30 days)', value: -data.safe_to_spend_breakdown.upcoming_bills_30d, positive: false },
    { label: 'Buffer reserve', value: -data.safe_to_spend_breakdown.buffer_reserve, positive: false },
    { label: 'Sinking fund reserve', value: -data.safe_to_spend_breakdown.sinking_fund_reserve, positive: false },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 ${isPositive
          ? 'bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5'
          : 'bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/5'
        }`}
      />

      {/* Glass layer */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08]" />

      {/* Top glow line */}
      <div
        className={`absolute inset-x-0 top-0 h-px ${isPositive
          ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent'
          : 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent'
        }`}
      />

      {/* Pulse ring */}
      {isPositive && (
        <div className="absolute top-6 left-6 w-2 h-2 rounded-full bg-emerald-400">
          <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </div>
      )}

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Safe to Spend
            </p>
            <InfoTooltip content="Liquid cash minus your emergency reserve, sinking funds, and bills due in the next 14 days. This is what you can spend without derailing your plan." />
          </div>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-white/30 hover:text-white/60 transition-colors duration-200"
            aria-label="Show breakdown"
          >
            <Info size={14} />
          </button>
        </div>

        {/* Main number */}
        <div className="mt-3 mb-1">
          <motion.span
            key={animatedValue}
            className={`text-5xl font-black tabular-nums tracking-tight ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
            style={isPositive ? {
              textShadow: '0 0 30px rgba(16,185,129,0.5), 0 0 60px rgba(16,185,129,0.2)'
            } : {
              textShadow: '0 0 30px rgba(239,68,68,0.5), 0 0 60px rgba(239,68,68,0.2)'
            }}
          >
            {formatCurrency(animatedValue)}
          </motion.span>
        </div>

        <p className="text-xs text-white/30 mb-4">Available to spend freely this month</p>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.06] rounded-full mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(100, (data.safe_to_spend / data.total_liquid_cash) * 100)}%`
            }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            className={`h-full rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}`}
          />
        </div>

        {/* Breakdown */}
        {showBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl bg-black/20 border border-white/[0.06] p-3 space-y-2 mb-3"
          >
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Formula Breakdown</p>
            {breakdownItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-white/50">{item.label}</span>
                <span className={`text-xs font-semibold tabular-nums ${item.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.positive ? '+' : ''}{formatCurrency(item.value)}
                </span>
              </div>
            ))}
            <div className="h-px bg-white/[0.06] my-1" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/80">Safe to Spend</span>
              <span className={`text-sm font-black tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(data.safe_to_spend)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl bg-black/20 p-2.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Liquid Cash</p>
            <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(data.total_liquid_cash)}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-2.5">
            <div className="flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-400" />
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Net Worth</p>
            </div>
            <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(data.net_worth, { compact: true })}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
