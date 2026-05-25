'use client'

import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface GlassCardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  glowColor?: 'blue' | 'emerald' | 'red' | 'gold' | 'purple' | 'none'
  className?: string
  headerAction?: ReactNode
  padding?: 'sm' | 'md' | 'lg' | 'none'
  noBorder?: boolean
  onClick?: () => void
}

const glowClasses = {
  blue: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] border-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]',
  emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-500/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]',
  red: 'shadow-[0_0_20px_rgba(239,68,68,0.15)] border-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.25)]',
  gold: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] border-yellow-500/20 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]',
  purple: 'shadow-[0_0_20px_rgba(139,92,246,0.15)] border-purple-500/20 hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]',
  none: '',
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function GlassCard({
  title,
  subtitle,
  children,
  glowColor = 'none',
  className,
  headerAction,
  padding = 'md',
  noBorder = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      className={clsx(
        'relative rounded-2xl backdrop-blur-xl bg-white/[0.04] transition-all duration-300',
        !noBorder && 'border border-white/[0.08]',
        glowColor !== 'none' && glowClasses[glowColor],
        glowColor === 'none' && 'hover:bg-white/[0.06] hover:border-white/[0.12]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-2xl" />

      <div className={clsx(paddingClasses[padding])}>
        {(title || subtitle || headerAction) && (
          <div className="flex items-start justify-between mb-3">
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
              )}
            </div>
            {headerAction && (
              <div className="flex-shrink-0 ml-2">{headerAction}</div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
