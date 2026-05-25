'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { useBudgets } from '@/hooks/useTransactions'
import { MOCK_BUDGETS } from '@/lib/mockData'

const CustomTooltip = ({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: { name: string; value: number; color: string; pct: number } }>
}) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.12] rounded-xl p-3 text-xs shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
        <span className="text-white font-semibold">{d.name}</span>
      </div>
      <p className="text-white/60">{formatCurrency(d.value)}</p>
      <p className="text-white/40">{formatPercent(d.pct)}</p>
    </div>
  )
}

export function CategoryBreakdown() {
  const { data: budgets } = useBudgets()
  const displayBudgets = budgets ?? MOCK_BUDGETS

  const total = displayBudgets.reduce((s, b) => s + b.spent, 0)

  const chartData = displayBudgets
    .filter((b) => b.spent > 0)
    .map((b) => ({
      name: b.name,
      value: b.spent,
      color: b.color ?? '#6b7280',
      pct: total > 0 ? (b.spent / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <GlassCard
      title="Spending by Category"
      subtitle="This month"
      padding="md"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Donut chart */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={64}
                dataKey="value"
                strokeWidth={2}
                stroke="#0a0a0f"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-[9px] text-white/30">Spent</span>
            <span className="text-sm font-black text-white">
              {formatCurrency(total, { compact: true })}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2 min-w-0">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-white/60 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-white/70">
                  {formatCurrency(item.value)}
                </span>
                <span
                  className="text-[10px] font-bold w-10 text-right"
                  style={{ color: item.color }}
                >
                  {formatPercent(item.pct, { decimals: 0 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
