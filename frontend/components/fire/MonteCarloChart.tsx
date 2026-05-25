'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/formatters'
import type { MonteCarloPoint } from '@/types'

interface MonteCarloChartProps {
  data: MonteCarloPoint[]
  fiNumber: number
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.12] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/40 mb-2">Year {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white/50">{entry.name}</span>
          </div>
          <span className="text-white font-bold">{formatCurrency(entry.value, { compact: true })}</span>
        </div>
      ))}
    </div>
  )
}

export function MonteCarloChart({ data, fiNumber }: MonteCarloChartProps) {
  // Calculate confidence: percentage of years where p25 >= fiNumber by the last data point
  const lastPoint = data[data.length - 1]
  const confidence = lastPoint
    ? Math.round(Math.min(100, Math.max(0, (lastPoint.p50 / fiNumber) * 60)))
    : 0

  const chartData = data.map((p) => ({
    year: p.year,
    'Pessimistic (25th)': Math.round(p.p25),
    'Median (50th)': Math.round(p.p50),
    'Optimistic (75th)': Math.round(p.p75),
  }))

  return (
    <GlassCard
      title="Monte Carlo Simulation"
      subtitle="Portfolio projection across 1,000 scenarios"
      glowColor="blue"
      padding="md"
      headerAction={
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[10px] text-blue-400 font-bold">Confidence: {confidence}%</span>
        </div>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="mcOptimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mcMedian" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mcPessimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={fiNumber}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{
                value: `FI: ${formatCurrency(fiNumber, { compact: true })}`,
                position: 'insideTopRight',
                fill: '#10b981',
                fontSize: 9,
              }}
            />
            <Area
              type="monotone"
              dataKey="Optimistic (75th)"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#mcOptimistic)"
              dot={false}
              strokeDasharray="4 2"
            />
            <Area
              type="monotone"
              dataKey="Median (50th)"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#mcMedian)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="Pessimistic (25th)"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="url(#mcPessimistic)"
              dot={false}
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-5 mt-2">
        {[
          { label: 'Optimistic (75th)', color: '#10b981' },
          { label: 'Median (50th)', color: '#3b82f6' },
          { label: 'Pessimistic (25th)', color: '#f59e0b' },
          { label: 'FI Target', color: '#10b981', dashed: true },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: item.color,
                opacity: item.dashed ? 0.7 : 1,
              }}
            />
            <span className="text-[10px] text-white/30">{item.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
