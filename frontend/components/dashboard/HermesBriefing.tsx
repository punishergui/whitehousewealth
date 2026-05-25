'use client'

import { motion } from 'framer-motion'
import { Bot, RefreshCw } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import type { AgentBriefing } from '@/types'

interface HermesBriefingProps {
  briefing?: AgentBriefing | null
}

function renderMarkdown(text: string): React.ReactNode {
  // Bold parsing only — full markdown rendered as-is in a pre-wrap block
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-white font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function HermesBriefing({ briefing }: HermesBriefingProps) {
  return (
    <GlassCard glowColor="blue" padding="md">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <Bot size={18} className="text-blue-400" />
          </div>
          <div className="flex justify-center mt-1">
            <div
              className={`w-1 h-1 rounded-full ${
                briefing
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.8)]'
                  : 'bg-white/20'
              }`}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Hermes AI</p>
            <span className="text-[10px] text-white/20">·</span>
            <p className="text-[10px] text-white/30">
              {briefing ? briefing.title : 'Morning Briefing'}
            </p>
            {briefing && (
              <>
                <span className="text-[10px] text-white/20">·</span>
                <p className="text-[10px] text-white/20">{briefing.for_date}</p>
              </>
            )}
          </div>

          {briefing ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap"
            >
              {renderMarkdown(briefing.body)}
            </motion.p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-white/30 italic">
              <RefreshCw size={12} className="flex-shrink-0" />
              <span>No briefing yet — run Sync AI to request one.</span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
