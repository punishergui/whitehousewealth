'use client'

import { motion } from 'framer-motion'
import type { FIREMode } from '@/types'

interface FIREModeInfo {
  id: FIREMode
  name: string
  emoji: string
  description: string
  wr: string
  color: string
}

const FIRE_MODES: FIREModeInfo[] = [
  {
    id: 'lean',
    name: 'Lean FIRE',
    emoji: '🪶',
    description: 'Minimal spending, early freedom',
    wr: '3.5% WR',
    color: '#10b981',
  },
  {
    id: 'coast',
    name: 'Coast FIRE',
    emoji: '🏖️',
    description: 'Save now, coast to retirement later',
    wr: 'Partial saving',
    color: '#3b82f6',
  },
  {
    id: 'fat',
    name: 'Fat FIRE',
    emoji: '👑',
    description: 'Luxurious retirement lifestyle',
    wr: '3% WR',
    color: '#f59e0b',
  },
  {
    id: 'barista',
    name: 'Barista FIRE',
    emoji: '☕',
    description: 'Semi-retire with part-time income',
    wr: '4%+ WR',
    color: '#ec4899',
  },
]

interface FIREModeSelectorProps {
  selected: FIREMode
  onChange: (mode: FIREMode) => void
}

export function FIREModeSelector({ selected, onChange }: FIREModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {FIRE_MODES.map((mode) => {
        const isSelected = selected === mode.id
        return (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(mode.id)}
            className="relative rounded-2xl p-4 text-left transition-all duration-300 overflow-hidden"
            style={{
              background: isSelected ? `linear-gradient(135deg, ${mode.color}20, ${mode.color}08)` : 'rgba(255,255,255,0.03)',
              border: isSelected ? `1.5px solid ${mode.color}40` : '1px solid rgba(255,255,255,0.07)',
              boxShadow: isSelected ? `0 0 20px ${mode.color}20` : 'none',
            }}
          >
            {isSelected && (
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${mode.color}60, transparent)` }}
              />
            )}
            <div className="text-2xl mb-2">{mode.emoji}</div>
            <div
              className="text-sm font-bold mb-0.5"
              style={{ color: isSelected ? mode.color : 'rgba(255,255,255,0.7)' }}
            >
              {mode.name}
            </div>
            <div className="text-[10px] text-white/30 mb-1 leading-relaxed">{mode.description}</div>
            <div
              className="text-[10px] font-bold"
              style={{ color: isSelected ? mode.color : 'rgba(255,255,255,0.2)' }}
            >
              {mode.wr}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
