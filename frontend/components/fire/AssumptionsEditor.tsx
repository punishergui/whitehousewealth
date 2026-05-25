'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, RotateCcw } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { FIREAssumptions } from '@/types'

interface AssumptionsEditorProps {
  assumptions: FIREAssumptions
  onUpdate: (updated: Partial<FIREAssumptions>) => void
  isUpdating?: boolean
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  color: string
  onChange: (v: number) => void
}

function SliderField({ label, value, min, max, step, format, color, onChange }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-white/60">{label}</label>
        <span className="text-xs font-bold" style={{ color }}>{format(value)}</span>
      </div>
      <div className="relative h-2 bg-white/[0.05] rounded-full">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: 1 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-200"
          style={{ left: `calc(${pct}% - 8px)`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/20">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

export function AssumptionsEditor({ assumptions, onUpdate, isUpdating }: AssumptionsEditorProps) {
  const [local, setLocal] = useState<FIREAssumptions>(assumptions)
  const [dirty, setDirty] = useState(false)

  const update = <K extends keyof FIREAssumptions>(key: K, value: FIREAssumptions[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleRecalculate = () => {
    onUpdate(local)
    setDirty(false)
  }

  const handleReset = () => {
    setLocal(assumptions)
    setDirty(false)
  }

  return (
    <GlassCard title="Assumptions" subtitle="Adjust to recalculate" padding="md">
      <div className="space-y-5">
        {/* Age fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Current Age</label>
            <input
              type="number"
              value={local.fire_age - Math.round(local.annual_expenses / 10000)}
              onChange={() => {}}
              readOnly
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-sm text-white/50 text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Target FIRE Age</label>
            <input
              type="number"
              value={local.fire_age}
              onChange={(e) => update('fire_age', parseInt(e.target.value) || 55)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors text-center"
            />
          </div>
        </div>

        {/* Monthly contribution */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">
            Monthly Contribution
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input
              type="number"
              value={local.annual_expenses / 12}
              onChange={(e) => update('annual_expenses', (parseFloat(e.target.value) || 0) * 12)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              placeholder="2800"
            />
          </div>
        </div>

        {/* Annual expenses */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">
            Target Annual Spending in Retirement
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input
              type="number"
              value={local.annual_expenses}
              onChange={(e) => update('annual_expenses', parseFloat(e.target.value) || 0)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              placeholder="80000"
            />
          </div>
        </div>

        {/* Return rate slider */}
        <SliderField
          label="Expected Annual Return"
          value={local.expected_return}
          min={4}
          max={12}
          step={0.5}
          format={(v) => formatPercent(v)}
          color="#3b82f6"
          onChange={(v) => update('expected_return', v)}
        />

        {/* Inflation slider */}
        <SliderField
          label="Inflation Rate"
          value={local.inflation_rate}
          min={1}
          max={5}
          step={0.25}
          format={(v) => formatPercent(v)}
          color="#f59e0b"
          onChange={(v) => update('inflation_rate', v)}
        />

        {/* SWR */}
        <SliderField
          label="Safe Withdrawal Rate"
          value={local.swr}
          min={2}
          max={5}
          step={0.25}
          format={(v) => formatPercent(v)}
          color="#10b981"
          onChange={(v) => update('swr', v)}
        />

        {/* Derived FI number preview */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Implied FI Number</p>
          <p className="text-xl font-black text-white/70">
            {formatCurrency((local.annual_expenses / local.swr) * 100, { compact: false })}
          </p>
          <p className="text-[10px] text-white/20 mt-0.5">Annual expenses ÷ {formatPercent(local.swr)} SWR</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {dirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/[0.07] hover:bg-white/[0.04] transition-all"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleRecalculate}
            disabled={isUpdating}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-2.5 rounded-xl transition-all duration-200 shadow-[0_0_16px_rgba(239,68,68,0.25)] disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {isUpdating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Recalculating...</span>
              </>
            ) : (
              <span>Recalculate</span>
            )}
          </motion.button>
        </div>
      </div>
    </GlassCard>
  )
}
