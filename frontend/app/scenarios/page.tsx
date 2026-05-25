'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { ScenarioCard } from '@/components/scenarios/ScenarioCard'
import { ScenarioRunner } from '@/components/scenarios/ScenarioRunner'
import type { ScenarioType } from '@/types'

const SCENARIOS: Array<{
  id: ScenarioType
  name: string
  description: string
  emoji: string
  color: string
}> = [
  { id: 'disney_trip', name: 'Disney World Trip', description: 'Plan a family trip to Disney World and see the financial impact', emoji: '🏰', color: '#3b82f6' },
  { id: 'branson_trip', name: 'Branson Vacation', description: 'Weekend getaway to Branson, MO — shows, music, and fun', emoji: '🎭', color: '#8b5cf6' },
  { id: 'arkansas_vacation', name: 'Arkansas Trip', description: 'Camping and outdoors trip to Arkansas', emoji: '🏕️', color: '#10b981' },
  { id: 'atv_purchase', name: 'ATV Purchase', description: 'Buy an ATV — analyze cash vs financing options', emoji: '🏍️', color: '#f59e0b' },
  { id: 'truck_purchase', name: 'Truck Upgrade', description: 'Upgrade the truck — trade-in value and payment impact', emoji: '🚛', color: '#6366f1' },
  { id: 'ashley_quits', name: "Ashley Leaves Job", description: "Model what happens if Ashley leaves her job — income impact", emoji: '👩‍💼', color: '#ec4899' },
  { id: 'extra_debt_payment', name: 'Extra Debt Payment', description: 'Apply extra cash to debt — accelerate payoff timeline', emoji: '💳', color: '#ef4444' },
  { id: 'tax_refund', name: 'Tax Refund Allocation', description: 'Where should the tax refund go for maximum impact?', emoji: '💵', color: '#10b981' },
  { id: 'refinance_debt', name: 'Debt Refinance', description: 'Refinance high-interest debt to lower rate — savings analysis', emoji: '🏦', color: '#06b6d4' },
  { id: 'emergency_event', name: 'Emergency Event', description: 'Model an unexpected financial emergency and recovery plan', emoji: '🚨', color: '#f97316' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

export default function ScenariosPage() {
  const [selectedId, setSelectedId] = useState<ScenarioType | null>(null)
  const selectedScenario = SCENARIOS.find((s) => s.id === selectedId)

  return (
    <AppShell>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="p-4 lg:p-6 space-y-6"
      >
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-black text-white tracking-tight">Scenario Lab</h1>
          <p className="text-sm text-white/30 mt-0.5">
            Model financial decisions before you make them — instant impact analysis
          </p>
        </motion.div>

        {/* Scenario Grid */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                id={scenario.id}
                name={scenario.name}
                description={scenario.description}
                emoji={scenario.emoji}
                color={scenario.color}
                selected={selectedId === scenario.id}
                onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Scenario Runner Panel */}
        <AnimatePresence>
          {selectedScenario && (
            <motion.div
              key={selectedScenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35 }}
            >
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
              <ScenarioRunner
                scenarioType={selectedScenario.id}
                scenarioName={selectedScenario.name}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedId && (
          <motion.div
            variants={fadeUp}
            className="text-center py-8 text-white/20 text-sm"
          >
            Select a scenario above to model its financial impact
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  )
}
