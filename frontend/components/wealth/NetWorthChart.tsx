'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatChartMonth } from '@/lib/formatters'
import type { NetWorthPoint } from '@/types'
import { TrendBadge } from '@/components/ui/TrendBadge'

interface NetWorthChartProps {
  history: NetWorthPoint[]
  currentNetWorth: number
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.12] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/50 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white/60 capitalize">{entry.name}</span>
          </div>
          <span className="text-white font-bold">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function NetWorthChart({ history, currentNetWorth }: NetWorthChartProps) {
  const chartData = history.map((p) => ({
    date: formatChartMonth(p.date),
    'Net Worth': p.net_worth,
    Assets: p.assets,
    Liabilities: p.liabilities,
  }))

  const first = history[0]?.net_worth ?? 0
  const trend = first > 0 ? ((currentNetWorth - first) / first) * 100 : 0

  return (
    <GlassCard
      title="Net Worth Over Time"
      subtitle="12-month trajectory"
      glowColor="emerald"
      headerAction={<TrendBadge value={trend} label="YTD" />}
      padding="md"
    >
      <div className="flex items-center gap-6 mb-4">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Current Net Worth</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-black text-white tabular-nums"
            style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}
          >
            {formatCurrency(currentNetWorth)}
          </motion.p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="gwAssets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gwNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gwLiabilities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Assets" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gwAssets)" dot={false} strokeDasharray="4 2" />
            <Area type="monotone" dataKey="Liabilities" stroke="#ef4444" strokeWidth={1.5} fill="url(#gwLiabilities)" dot={false} strokeDasharray="4 2" />
            <Area type="monotone" dataKey="Net Worth" stroke="#10b981" strokeWidth={2.5} fill="url(#gwNetWorth)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-5 mt-2">
        {[
          { label: 'Net Worth', color: '#10b981' },
          { label: 'Assets', color: '#3b82f6' },
          { label: 'Liabilities', color: '#ef4444' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-white/30">{item.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
