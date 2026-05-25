'use client'

import { motion } from 'framer-motion'
import type { LogicTraceStep } from '@/types'

interface LogicTraceProps {
  steps: LogicTraceStep[]
}

export function LogicTrace({ steps }: LogicTraceProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const isNegative = step.result.startsWith('-') || step.result.startsWith('(')
        const isPositive = step.result.startsWith('+')
        const resultColor =
          step.impact === 'negative' || isNegative
            ? '#ef4444'
            : step.impact === 'positive' || isPositive
            ? '#10b981'
            : 'rgba(255,255,255,0.6)'

        return (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
            className="flex gap-3"
          >
            {/* Timeline column */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 z-10"
                style={{
                  backgroundColor: `${resultColor}20`,
                  border: `1.5px solid ${resultColor}40`,
                  color: resultColor,
                }}
              >
                {step.step}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-white/[0.08] mt-1 mb-1" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 min-w-0 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/70">{step.label}</p>
                  <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">{step.calculation}</p>
                  {step.detail && (
                    <p
                      className="text-[11px] mt-1 font-medium"
                      style={{ color: resultColor }}
                    >
                      {step.detail}
                    </p>
                  )}
                </div>
                <div
                  className="text-sm font-black tabular-nums flex-shrink-0 mt-0.5"
                  style={{ color: resultColor }}
                >
                  {step.result}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
