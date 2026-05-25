'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatChartMonth } from '@/lib/formatters'
import { useSpendingTrends } from '@/hooks/useTransactions'
import { MOCK_SPENDING_TRENDS } from '@/lib/mockData'

const MONTHLY_INCOME = 10000 // estimated combined income

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.12] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/40 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white/60">{entry.name}</span>
          </div>
          <span className={`font-bold ${entry.name === 'Net Cash Flow' ? (entry.value >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
            {entry.name === 'Net Cash Flow' && entry.value > 0 ? '+' : ''}
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SpendingTrends() {
  const { data: trends } = useSpendingTrends(6)
  const displayTrends = trends ?? MOCK_SPENDING_TRENDS

  const chartData = displayTrends.map((t) => ({
    month: formatChartMonth(t.month),
    Expenses: Math.round(t.total),
    Income: MONTHLY_INCOME,
    'Net Cash Flow': Math.round(MONTHLY_INCOME - t.total),
  }))

  return (
    <GlassCard
      title="Spending vs Income"
      subtitle="Last 6 months"
      padding="md"
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="stIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="stExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="month"
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
            <Bar dataKey="Income" fill="url(#stIncome)" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Expenses" fill="url(#stExpenses)" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Line
              type="monotone"
              dataKey="Net Cash Flow"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-5 mt-2">
        {[
          { label: 'Income', color: '#10b981' },
          { label: 'Expenses', color: '#ef4444' },
          { label: 'Net Cash Flow', color: '#3b82f6' },
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
