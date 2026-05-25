'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatRunway } from '@/lib/formatters'

interface EmergencyFundGaugeProps {
  current: number
  target: number
  months_runway: number
  monthly_expenses: number
}

function getRunwayColor(months: number): string {
  if (months >= 6) return '#10b981'
  if (months >= 3) return '#f59e0b'
  return '#ef4444'
}

function getRunwayStatus(months: number): string {
  if (months >= 9) return 'Excellent'
  if (months >= 6) return 'Strong'
  if (months >= 3) return 'Building'
  return 'Critical'
}

export function EmergencyFundGauge({
  current,
  target,
  months_runway,
  monthly_expenses,
}: EmergencyFundGaugeProps) {
  const percentage = Math.min(100, (current / target) * 100)
  const color = getRunwayColor(months_runway)
  const status = getRunwayStatus(months_runway)
  const targetMonths = 6

  const chartData = [
    {
      name: 'Emergency Fund',
      value: percentage,
      fill: color,
    },
  ]

  return (
    <GlassCard title="Emergency Fund" padding="md">
      <div className="flex flex-col items-center">
        {/* Radial gauge */}
        <div className="relative w-32 h-20 mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="80%"
              innerRadius="60%"
              outerRadius="100%"
              barSize={8}
              data={chartData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              {/* Background track */}
              <RadialBar
                background={{ fill: 'rgba(255,255,255,0.04)' }}
                dataKey="value"
                cornerRadius={4}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-black tabular-nums"
              style={{ color }}
            >
              {months_runway.toFixed(1)}
            </motion.span>
            <span className="text-[10px] text-white/30 -mt-0.5">months</span>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
          style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}30` }}
        >
          <Shield size={8} className="inline mr-1" />
          {status}
        </div>

        {/* Progress details */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Current</span>
            <span className="text-white font-semibold">{formatCurrency(current)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Target ({targetMonths}mo)</span>
            <span className="text-white/60">{formatCurrency(target)}</span>
          </div>

          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
            />
          </div>

          <div className="flex justify-between text-xs pt-1">
            <span className="text-white/30">Monthly expenses</span>
            <span className="text-white/40">{formatCurrency(monthly_expenses)}/mo</span>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
