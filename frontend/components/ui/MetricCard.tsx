'use client'

import { type ReactNode } from 'react'
import { clsx } from 'clsx'
import { TrendBadge } from './TrendBadge'
import { CurrencyDisplay } from './CurrencyDisplay'

interface MetricCardProps {
  label: string
  value: number | string
  isCurrency?: boolean
  trend?: number
  trendLabel?: string
  icon?: ReactNode
  glowColor?: 'blue' | 'emerald' | 'red' | 'gold' | 'none'
  className?: string
  valueSize?: 'sm' | 'md' | 'lg' | 'xl'
  subtitle?: string
}

const valueSizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
}

export function MetricCard({
  label,
  value,
  isCurrency = false,
  trend,
  trendLabel,
  icon,
  glowColor = 'none',
  className,
  valueSize = 'lg',
  subtitle,
}: MetricCardProps) {
  const glowMap = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    gold: 'border-yellow-500/20 bg-yellow-500/5',
    none: 'border-white/8 bg-white/4',
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border backdrop-blur-xl p-4 transition-all duration-200 hover:scale-[1.01]',
        glowMap[glowColor],
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="text-white/30 flex-shrink-0">{icon}</div>
        )}
      </div>

      <div className={clsx('font-bold text-white', valueSizeClasses[valueSize])}>
        {isCurrency && typeof value === 'number' ? (
          <CurrencyDisplay amount={value} size={valueSize} />
        ) : (
          String(value)
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-white/40 mt-1">{subtitle}</p>
      )}

      {trend !== undefined && (
        <div className="mt-2">
          <TrendBadge value={trend} label={trendLabel} />
        </div>
      )}
    </div>
  )
}
