'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  FlaskConical,
  Flame,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard, color: '#3b82f6' },
  { href: '/money', label: 'Money Ops', icon: DollarSign, color: '#10b981' },
  { href: '/wealth', label: 'Wealth', icon: TrendingUp, color: '#f59e0b' },
  { href: '/scenarios', label: 'Scenarios', icon: FlaskConical, color: '#8b5cf6' },
  { href: '/fire', label: 'FIRE', icon: Flame, color: '#ef4444' },
  { href: '/family', label: 'Family', icon: Users, color: '#ec4899' },
  { href: '/hermes', label: 'Hermes AI', icon: MessageSquare, color: '#06b6d4' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user } = useAuthStore()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full bg-[#080810] border-r border-white/[0.06] transition-all duration-300 ease-in-out flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]',
        sidebarCollapsed && 'justify-center px-2'
      )}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <Home size={15} className="text-blue-400" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="text-xs font-black tracking-[0.15em] text-white leading-none">WHWOS</div>
            <div className="text-[9px] text-white/30 tracking-[0.1em] uppercase mt-0.5">Wealth OS</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-xl opacity-20"
                  style={{ background: `radial-gradient(circle at 30% 50%, ${item.color}60, transparent 70%)` }}
                />
              )}
              <div
                className={clsx(
                  'flex-shrink-0 w-5 h-5 transition-all duration-200',
                  active ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'
                )}
                style={active ? { filter: `drop-shadow(0 0 6px ${item.color})` } : {}}
              >
                <Icon size={18} style={active ? { color: item.color } : {}} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {active && !sidebarCollapsed && (
                <div
                  className="ml-auto w-1 h-4 rounded-full flex-shrink-0"
                  style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-white/[0.06] pt-3">
        <Link
          href="/settings"
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200',
            sidebarCollapsed && 'justify-center px-2'
          )}
          title={sidebarCollapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {!sidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>

        {/* User avatar */}
        <div
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            {user?.name?.charAt(0) ?? 'J'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{user?.name ?? 'Josh White'}</div>
              <div className="text-[10px] text-white/30">Administrator</div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/20 transition-all duration-200 z-10 shadow-lg"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
