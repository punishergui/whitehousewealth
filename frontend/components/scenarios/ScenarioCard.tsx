'use client'

import { motion } from 'framer-motion'
import type { ScenarioType } from '@/types'

interface ScenarioCardProps {
  id: ScenarioType
  name: string
  description: string
  emoji: string
  color: string
  selected?: boolean
  onSelect: (id: ScenarioType) => void
}

export function ScenarioCard({ id, name, description, emoji, color, selected, onSelect }: ScenarioCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(id)}
      className="relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${color}18, ${color}08)`
          : 'rgba(255,255,255,0.03)',
        border: selected ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.07)',
        boxShadow: selected ? `0 0 24px ${color}25` : 'none',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
          opacity: selected ? 1 : 0.3,
        }}
      />

      <div className="p-4">
        {/* Emoji icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 transition-all duration-300 group-hover:scale-110"
          style={{
            backgroundColor: `${color}15`,
            border: `1px solid ${color}25`,
            boxShadow: selected ? `0 0 16px ${color}30` : 'none',
          }}
        >
          {emoji}
        </div>

        <h3 className="text-sm font-bold text-white/80 mb-1">{name}</h3>
        <p className="text-xs text-white/35 leading-relaxed">{description}</p>

        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <span
            className="text-xs font-semibold transition-colors duration-200"
            style={{ color: selected ? color : 'rgba(255,255,255,0.3)' }}
          >
            {selected ? 'Selected — Configure below' : 'Run Scenario →'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
