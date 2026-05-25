'use client'

import { motion } from 'framer-motion'
import { Home, Zap, Wifi, Shield, Tv, Dumbbell, Calendar, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Bill } from '@/types'
import { differenceInDays, parseISO } from 'date-fns'

interface UpcomingBillsProps {
  bills: Bill[]
}

const iconMap: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  home: Home,
  zap: Zap,
  wifi: Wifi,
  shield: Shield,
  tv: Tv,
  dumbbell: Dumbbell,
}

function getDaysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date())
}

function getBillStatus(bill: Bill): { label: string; color: string; urgent: boolean } {
  const days = getDaysUntil(bill.due_date)
  if (bill.status === 'overdue' || days < 0) return { label: 'Overdue', color: '#ef4444', urgent: true }
  if (days === 0) return { label: 'Due today', color: '#ef4444', urgent: true }
  if (days <= 2) return { label: `Due in ${days}d`, color: '#f97316', urgent: true }
  if (days <= 7) return { label: `Due in ${days}d`, color: '#f59e0b', urgent: false }
  return { label: formatDate(bill.due_date, 'MMM d'), color: '#ffffff50', urgent: false }
}

export function UpcomingBills({ bills }: UpcomingBillsProps) {
  const sortedBills = [...bills].sort(
    (a, b) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
  )

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)

  return (
    <GlassCard
      title="Upcoming Bills"
      subtitle={formatCurrency(totalAmount) + ' due soon'}
      padding="md"
    >
      <div className="space-y-2">
        {sortedBills.slice(0, 6).map((bill, index) => {
          const Icon = iconMap[bill.icon ?? 'home'] ?? Calendar
          const status = getBillStatus(bill)

          return (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={clsx(
                'flex items-center justify-between py-2 px-2.5 rounded-xl transition-all duration-200',
                status.urgent
                  ? 'bg-red-500/5 border border-red-500/15'
                  : 'bg-white/[0.02] border border-transparent hover:border-white/[0.06]'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                    status.urgent ? 'bg-red-500/15' : 'bg-white/[0.06]'
                  )}
                >
                  {status.urgent ? (
                    <AlertCircle size={13} className="text-red-400" />
                  ) : (
                    <Icon size={13} className="text-white/40" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-white/80">{bill.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 mt-0.5">
                    <span>{bill.category}</span>
                    {bill.auto_pay && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400/60">Auto-pay</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{formatCurrency(bill.amount)}</p>
                <p className="text-[10px] font-medium" style={{ color: status.color }}>
                  {status.label}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
