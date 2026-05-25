'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { FIREModeSelector } from '@/components/fire/FIREModeSelector'
import { FIREProgress } from '@/components/fire/FIREProgress'
import { MonteCarloChart } from '@/components/fire/MonteCarloChart'
import { AssumptionsEditor } from '@/components/fire/AssumptionsEditor'
import { GlassCard } from '@/components/ui/GlassCard'
import { useFIRE, useUpdateFIREAssumptions } from '@/hooks/useFIRE'
import { MOCK_FIRE_DATA } from '@/lib/mockData'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { FIREMode, FIREAssumptions } from '@/types'
import { Calendar, TrendingUp, DollarSign, Target } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

export default function FIREPage() {
  const { data: fireData } = useFIRE()
  const { mutate: updateAssumptions, isPending: isUpdating } = useUpdateFIREAssumptions()
  const data = fireData ?? MOCK_FIRE_DATA

  const [selectedMode, setSelectedMode] = useState<FIREMode>(data.fire_mode)

  const getFINumber = () => {
    switch (selectedMode) {
      case 'lean': return data.lean_fi_number ?? data.fi_number
      case 'coast': return data.coast_fi_number ?? data.fi_number
      case 'fat': return data.fat_fi_number ?? data.fi_number
      case 'barista': return data.barista_fi_number ?? data.fi_number
      default: return data.fi_number
    }
  }

  const currentFINumber = getFINumber()
  const currentFIPct = Math.min(100, (data.current_savings / currentFINumber) * 100)

  const handleUpdateAssumptions = (updated: Partial<FIREAssumptions>) => {
    updateAssumptions(updated)
  }

  return (
    <AppShell>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="p-4 lg:p-6 space-y-4"
      >
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-black text-white tracking-tight">FIRE Module</h1>
          <p className="text-sm text-white/30 mt-0.5">
            Financial Independence, Retire Early — your path to freedom
          </p>
        </motion.div>

        {/* FIRE Mode Selector */}
        <motion.div variants={fadeUp}>
          <FIREModeSelector selected={selectedMode} onChange={setSelectedMode} />
        </motion.div>

        {/* Hero metrics */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GlassCard padding="sm" glowColor="emerald">
              <div className="flex items-center gap-2 mb-1">
                <Target size={13} className="text-emerald-400" />
                <p className="text-[10px] text-white/30 uppercase tracking-wider">FI Number</p>
              </div>
              <p className="text-xl font-black text-white tabular-nums">
                {formatCurrency(currentFINumber, { compact: true })}
              </p>
            </GlassCard>

            <GlassCard padding="sm" glowColor="blue">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={13} className="text-blue-400" />
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Saved So Far</p>
              </div>
              <p className="text-xl font-black text-white tabular-nums">
                {formatCurrency(data.current_savings, { compact: true })}
              </p>
            </GlassCard>

            <GlassCard padding="sm">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={13} className="text-purple-400" />
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Est. FI Date</p>
              </div>
              <p className="text-lg font-black text-white/80">
                {formatDate(data.estimated_fi_date, 'MMM yyyy')}
              </p>
            </GlassCard>

            <GlassCard padding="sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} className="text-amber-400" />
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Monthly Savings</p>
              </div>
              <p className="text-xl font-black text-white tabular-nums">
                {formatCurrency(data.monthly_contribution)}
              </p>
            </GlassCard>
          </div>
        </motion.div>

        {/* Main content: Progress + Chart + Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* FI Progress gauge */}
          <motion.div variants={fadeUp} className="lg:col-span-1">
            <FIREProgress
              fiPercentage={currentFIPct}
              fiNumber={currentFINumber}
              currentSavings={data.current_savings}
            />
          </motion.div>

          {/* Monte Carlo chart */}
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <MonteCarloChart
              data={data.monte_carlo}
              fiNumber={currentFINumber}
            />
          </motion.div>
        </div>

        {/* Assumptions Editor */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <AssumptionsEditor
                assumptions={data.assumptions}
                onUpdate={handleUpdateAssumptions}
                isUpdating={isUpdating}
              />
            </div>

            {/* Key insights */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              <GlassCard title="Years to FI" padding="sm">
                <p className="text-4xl font-black text-white/80 mt-1">
                  {data.years_to_fi.toFixed(1)}
                  <span className="text-lg text-white/30 font-normal ml-1">years</span>
                </p>
                <p className="text-xs text-white/30 mt-1">At current savings rate</p>
              </GlassCard>

              <GlassCard title="Monthly Savings Rate" padding="sm">
                <p className="text-4xl font-black text-emerald-400 mt-1">
                  {Math.round((data.monthly_contribution / 10000) * 100)}
                  <span className="text-lg text-white/30 font-normal ml-1">%</span>
                </p>
                <p className="text-xs text-white/30 mt-1">{formatCurrency(data.monthly_contribution)}/mo invested</p>
              </GlassCard>

              {data.lean_fi_number && (
                <GlassCard padding="sm">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Lean FI Number</p>
                  <p className="text-xl font-black text-white/70 mt-1">{formatCurrency(data.lean_fi_number, { compact: true })}</p>
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">3.5% withdrawal rate</p>
                </GlassCard>
              )}

              {data.coast_fi_number && (
                <GlassCard padding="sm">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Coast FI Number</p>
                  <p className="text-xl font-black text-white/70 mt-1">{formatCurrency(data.coast_fi_number, { compact: true })}</p>
                  <p className="text-[10px] text-blue-400/60 mt-0.5">Then let it grow!</p>
                </GlassCard>
              )}

              {data.barista_fi_number && (
                <GlassCard padding="sm">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Barista FI Number</p>
                  <p className="text-xl font-black text-white/70 mt-1">{formatCurrency(data.barista_fi_number, { compact: true })}</p>
                  <p className="text-[10px] text-pink-400/60 mt-0.5">Part-time income supplement</p>
                </GlassCard>
              )}

              {data.fat_fi_number && (
                <GlassCard padding="sm">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Fat FI Number</p>
                  <p className="text-xl font-black text-white/70 mt-1">{formatCurrency(data.fat_fi_number, { compact: true })}</p>
                  <p className="text-[10px] text-amber-400/60 mt-0.5">Luxurious retirement</p>
                </GlassCard>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  )
}
