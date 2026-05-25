'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FlaskConical } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { SCENARIO_DEFINITIONS } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'

export function QuickScenarios() {
  const quickScenarios = SCENARIO_DEFINITIONS.slice(0, 6)

  return (
    <GlassCard
      title="Quick Scenarios"
      subtitle="Run a simulation"
      headerAction={
        <Link
          href="/scenarios"
          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          View all <ArrowRight size={10} />
        </Link>
      }
      padding="md"
    >
      <div className="space-y-1.5">
        {quickScenarios.map((scenario, index) => (
          <motion.div
            key={scenario.type}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Link
              href={`/scenarios?type=${scenario.type}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">{scenario.icon}</span>
                <div>
                  <p className="text-xs font-medium text-white/70 group-hover:text-white/90 transition-colors">
                    {scenario.name}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5">
                    ~{formatCurrency(Math.abs(scenario.typical_cost), { compact: true })}
                  </p>
                </div>
              </div>
              <FlaskConical
                size={12}
                className="text-white/20 group-hover:text-blue-400 transition-colors duration-200"
              />
            </Link>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  )
}
