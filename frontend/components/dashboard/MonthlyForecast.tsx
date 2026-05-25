'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/formatters'
import type { ForecastPoint } from '@/types'

interface MonthlyForecastProps {
  forecast: ForecastPoint[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-[#1a1a2e] border border-white/[0.12] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white/60">{entry.name}</span>
          </div>
          <span className="text-white font-semibold">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyForecast({ forecast }: MonthlyForecastProps) {
  // Sample every 10 days for display
  const chartData = forecast
    .filter((_, i) => i % 10 === 0 || i === 0 || i === 29 || i === 59 || i === 89)
    .map((point) => ({
      date: formatDate(point.date),
      '30-day': Math.round(point.balance_30),
      '60-day': Math.round(point.balance_60),
      '90-day': Math.round(point.balance_90),
    }))

  return (
    <GlassCard
      title="30/60/90 Day Forecast"
      subtitle="Cash flow projection"
      padding="md"
    >
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grad30" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad60" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad90" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="90-day"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              fill="url(#grad90)"
              strokeDasharray="4 2"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="60-day"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#grad60)"
              strokeDasharray="2 2"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="30-day"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#grad30)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        {[
          { label: '30-day', color: '#3b82f6' },
          { label: '60-day', color: '#10b981' },
          { label: '90-day', color: '#8b5cf6' },
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
