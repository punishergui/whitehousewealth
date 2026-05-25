'use client'

import { Bot, MessageSquare, RefreshCw } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

export function ChatInterface() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6">
      <GlassCard glowColor="blue" padding="lg">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto py-4">
          {/* Icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(59,130,246,0.3)]">
              <Bot size={32} className="text-blue-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0f] border border-white/10 flex items-center justify-center">
              <MessageSquare size={10} className="text-white/40" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Hermes AI</h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Chat with Hermes via Discord, or use{' '}
              <span className="text-blue-400 font-medium">Sync AI</span> from the
              dashboard to request a new briefing.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/[0.06]" />

          {/* How it works */}
          <div className="w-full space-y-3 text-left">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">How it works</p>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw size={12} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/70">Sync AI</p>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Click Sync AI on the dashboard. Hermes reads your finances, writes a
                  briefing, and sets your weekly priorities — usually within 30 seconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquare size={12} className="text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/70">Discord Chat</p>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Ask Hermes anything in your private Discord server. Hermes has full
                  access to your WHW data and will respond in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
