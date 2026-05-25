'use client'

import { usePathname } from 'next/navigation'
import { Bell, RefreshCw, Search } from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatters'
import { useDashboardStore } from '@/store/dashboardStore'
import { clsx } from 'clsx'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Command Center', subtitle: 'Real-time financial overview' },
  '/money': { title: 'Money Ops', subtitle: 'Transactions & budgets' },
  '/wealth': { title: 'Wealth Dashboard', subtitle: 'Net worth & asset allocation' },
  '/scenarios': { title: 'Scenario Lab', subtitle: 'Decision simulation engine' },
  '/fire': { title: 'FIRE Module', subtitle: 'Financial independence tracker' },
  '/family': { title: 'Family Mode', subtitle: 'Simplified family view' },
  '/hermes': { title: 'Hermes AI', subtitle: 'Your financial advisor' },
  '/settings': { title: 'Settings', subtitle: 'System configuration' },
}

export function TopBar() {
  const pathname = usePathname()
  const { lastRefreshed } = useDashboardStore()
  const pageInfo = pageTitles[pathname] ?? { title: 'WHITE HOUSE WEALTH OS', subtitle: '' }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#080810]/80 backdrop-blur-xl flex-shrink-0">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm font-bold text-white leading-none">{pageInfo.title}</h1>
          {pageInfo.subtitle && (
            <p className="text-[11px] text-white/30 mt-0.5">{pageInfo.subtitle}</p>
          )}
        </div>
        {lastRefreshed && (
          <div className="hidden sm:flex items-center gap-1.5 text-white/20 text-[10px]">
            <RefreshCw size={9} />
            <span>Updated {formatRelativeTime(lastRefreshed)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/30 text-xs hover:bg-white/[0.06] hover:text-white/50 transition-all duration-200">
          <Search size={12} />
          <span>Search...</span>
          <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded ml-2">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
        </button>

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] text-white/30 font-medium">LIVE</span>
        </div>
      </div>
    </header>
  )
}
