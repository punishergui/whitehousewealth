'use client'

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPercent } from '@/lib/formatters'

interface FIREProgressProps {
  fiPercentage: number
  fiNumber: number
  currentSavings: number
}

const MILESTONES = [25, 50, 75, 100]

function getMilestoneColor(pct: number): string {
  if (pct >= 100) return '#10b981'
  if (pct >= 75) return '#3b82f6'
  if (pct >= 50) return '#f59e0b'
  if (pct >= 25) return '#f97316'
  return '#ef4444'
}

export function FIREProgress({ fiPercentage, fiNumber, currentSavings }: FIREProgressProps) {
  const clampedPct = Math.min(100, Math.max(0, fiPercentage))
  const color = getMilestoneColor(clampedPct)

  const chartData = [
    {
      name: 'FI Progress',
      value: clampedPct,
      fill: color,
    },
  ]

  return (
    <GlassCard title="FI Progress" subtitle="Financial independence gauge" padding="md">
      <div className="flex flex-col items-center">
        {/* Radial gauge */}
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="85%"
              barSize={12}
              data={chartData}
              startAngle={200}
              endAngle={-20}
            >
              {/* Background track */}
              <RadialBar
                background={{ fill: 'rgba(255,255,255,0.04)' }}
                dataKey="value"
                cornerRadius={6}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-4xl font-black tabular-nums"
              style={{ color, textShadow: `0 0 20px ${color}60` }}
            >
              {formatPercent(clampedPct, { decimals: 0 })}
            </motion.p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">FI Progress</p>
          </div>
        </div>

        {/* Milestone markers */}
        <div className="flex items-center gap-3 mt-2 mb-4">
          {MILESTONES.map((m) => {
            const reached = clampedPct >= m
            return (
              <div key={m} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: reached ? getMilestoneColor(m) : 'rgba(255,255,255,0.1)',
                    boxShadow: reached ? `0 0 8px ${getMilestoneColor(m)}80` : 'none',
                  }}
                />
                <span className="text-[10px] text-white/30">{m}%</span>
              </div>
            )
          })}
        </div>

        {/* Metrics */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Current Savings</p>
            <p className="text-sm font-bold text-white/80 mt-1">{formatCurrency(currentSavings, { compact: true })}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">FI Number</p>
            <p className="text-sm font-bold text-white/80 mt-1">{formatCurrency(fiNumber, { compact: true })}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
