'use client'

import { clsx } from 'clsx'
import { formatCurrency } from '@/lib/formatters'

interface CurrencyDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showSign?: boolean
  colorCoded?: boolean
  compact?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
  '2xl': 'text-5xl',
}

export function CurrencyDisplay({
  amount,
  size = 'md',
  showSign = false,
  colorCoded = false,
  compact = false,
  className,
}: CurrencyDisplayProps) {
  const formatted = formatCurrency(amount, { showSign, compact })

  return (
    <span
      className={clsx(
        'font-bold tabular-nums',
        sizeClasses[size],
        colorCoded && amount > 0 && 'text-emerald-400',
        colorCoded && amount < 0 && 'text-red-400',
        colorCoded && amount === 0 && 'text-white/60',
        !colorCoded && 'text-white',
        className
      )}
    >
      {formatted}
    </span>
  )
}
