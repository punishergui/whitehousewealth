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
import type { AssetAllocationItem } from '@/types'

interface AssetAllocationProps {
  allocation: AssetAllocationItem[]
  totalAssets: number
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: AssetAllocationItem }>
}) => {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-[#1a1a2e] border border-white/[0.12] rounded-xl p-3 text-xs shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="text-white font-semibold">{item.name}</span>
      </div>
      <p className="text-white/60">{formatCurrency(item.value)}</p>
      <p className="text-white/40">{formatPercent(item.percentage)}</p>
    </div>
  )
}

export function AssetAllocation({ allocation, totalAssets }: AssetAllocationProps) {
  return (
    <GlassCard title="Asset Allocation" subtitle="By class" padding="md">
      <div className="flex items-center gap-4">
        {/* Donut chart */}
        <div className="w-28 h-28 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocation}
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={52}
                dataKey="value"
                strokeWidth={0}
              >
                {allocation.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-[10px] text-white/30">Total</span>
            <span className="text-xs font-bold text-white">
              {formatCurrency(totalAssets, { compact: true })}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {allocation.map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-white/60">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-white">{formatPercent(item.percentage)}</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
