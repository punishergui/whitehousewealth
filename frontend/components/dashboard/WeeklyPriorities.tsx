'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Info, Zap, TrendingUp, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { AgentPriority } from '@/types'

interface WeeklyPrioritiesProps {
  priorities?: AgentPriority[]
}

const severityConfig = {
  urgent: { icon: Zap, color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  positive: { icon: TrendingUp, color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  info: { icon: Info, color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
} as const

export function WeeklyPriorities({ priorities }: WeeklyPrioritiesProps) {
  if (!priorities || priorities.length === 0) {
    return (
      <GlassCard
        title="This Week's Priorities"
        subtitle="AI-generated action items"
        padding="md"
      >
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <p className="text-sm text-white/30 italic">
            AI hasn&apos;t run yet — click Sync AI.
          </p>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard
      title="This Week's Priorities"
      subtitle="AI-generated action items"
      padding="md"
    >
      <div className="space-y-2">
        {priorities.map((priority, index) => {
          const cfg = severityConfig[priority.severity as keyof typeof severityConfig] ?? severityConfig.info
          const Icon = cfg.icon

          return (
            <motion.div
              key={priority.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer group hover:scale-[1.01]',
                cfg.bg,
                cfg.border
              )}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${cfg.color}25` }}
              >
                <Icon size={14} style={{ color: cfg.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs font-semibold text-white/90 leading-tight">{priority.title}</p>
                  {priority.severity === 'urgent' && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  )}
                </div>
                {priority.subtitle && (
                  <p className="text-[10px] text-white/40 leading-tight">{priority.subtitle}</p>
                )}
                {priority.deadline && (
                  <p className="text-[10px] mt-1" style={{ color: cfg.color }}>
                    Deadline: {formatDate(priority.deadline, 'MMM d')}
                  </p>
                )}
              </div>

              {priority.amount != null && (
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {formatCurrency(priority.amount, { compact: true })}
                  </span>
                </div>
              )}

              <ChevronRight size={12} className="text-white/20 group-hover:text-white/40 flex-shrink-0 mt-1 transition-colors" />
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
