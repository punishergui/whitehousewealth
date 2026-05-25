'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface TrendBadgeProps {
  value: number
  label?: string
  inverse?: boolean
  size?: 'sm' | 'md'
}

export function TrendBadge({ value, label, inverse = false, size = 'sm' }: TrendBadgeProps) {
  const isPositive = inverse ? value < 0 : value > 0
  const isNegative = inverse ? value > 0 : value < 0
  const isNeutral = value === 0

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isPositive && 'bg-emerald-500/15 text-emerald-400',
        isNegative && 'bg-red-500/15 text-red-400',
        isNeutral && 'bg-white/10 text-white/50'
      )}
    >
      {isPositive && <TrendingUp size={size === 'sm' ? 10 : 12} />}
      {isNegative && <TrendingDown size={size === 'sm' ? 10 : 12} />}
      {isNeutral && <Minus size={size === 'sm' ? 10 : 12} />}
      <span>
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
        {label ? ` ${label}` : ''}
      </span>
    </div>
  )
}
