'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle, AlertTriangle, XCircle, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { LogicTrace } from './LogicTrace'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useScenarios } from '@/hooks/useScenarios'
import type { ScenarioType, ScenarioResult } from '@/types'

const SCENARIO_CONFIGS: Record<ScenarioType, {
  fields: Array<{ key: string; label: string; type: 'number' | 'text'; placeholder: string; prefix?: string; default?: number }>
}> = {
  disney_trip: {
    fields: [
      { key: 'amount', label: 'Total Trip Cost', type: 'number', placeholder: '6500', prefix: '$', default: 6500 },
      { key: 'vacation_fund', label: 'Vacation Fund Available', type: 'number', placeholder: '3200', prefix: '$', default: 3200 },
    ],
  },
  branson_trip: {
    fields: [
      { key: 'amount', label: 'Total Trip Cost', type: 'number', placeholder: '3200', prefix: '$', default: 3200 },
    ],
  },
  arkansas_vacation: {
    fields: [
      { key: 'amount', label: 'Total Trip Cost', type: 'number', placeholder: '1800', prefix: '$', default: 1800 },
    ],
  },
  atv_purchase: {
    fields: [
      { key: 'amount', label: 'Purchase Price', type: 'number', placeholder: '8500', prefix: '$', default: 8500 },
      { key: 'down_payment', label: 'Down Payment', type: 'number', placeholder: '2000', prefix: '$', default: 2000 },
    ],
  },
  truck_purchase: {
    fields: [
      { key: 'amount', label: 'Vehicle Price', type: 'number', placeholder: '45000', prefix: '$', default: 45000 },
      { key: 'down_payment', label: 'Down Payment', type: 'number', placeholder: '5000', prefix: '$', default: 5000 },
    ],
  },
  ashley_quits: {
    fields: [
      { key: 'income_reduction', label: "Ashley's Monthly Income", type: 'number', placeholder: '4800', prefix: '$', default: 4800 },
      { key: 'duration_months', label: 'Months Out of Work', type: 'number', placeholder: '6', default: 6 },
    ],
  },
  extra_debt_payment: {
    fields: [
      { key: 'amount', label: 'Extra Payment Amount', type: 'number', placeholder: '1000', prefix: '$', default: 1000 },
    ],
  },
  tax_refund: {
    fields: [
      { key: 'amount', label: 'Expected Tax Refund', type: 'number', placeholder: '3500', prefix: '$', default: 3500 },
    ],
  },
  refinance_debt: {
    fields: [
      { key: 'amount', label: 'Balance to Refinance', type: 'number', placeholder: '18400', prefix: '$', default: 18400 },
      { key: 'new_rate', label: 'New APR (%)', type: 'number', placeholder: '4.5', default: 4.5 },
    ],
  },
  emergency_event: {
    fields: [
      { key: 'amount', label: 'Emergency Cost', type: 'number', placeholder: '3000', prefix: '$', default: 3000 },
    ],
  },
  custom: {
    fields: [
      { key: 'amount', label: 'Amount', type: 'number', placeholder: '1000', prefix: '$', default: 1000 },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'Describe this scenario' },
    ],
  },
}

function VerdictBadge({ verdict }: { verdict: ScenarioResult['verdict'] }) {
  if (verdict === 'DO_IT') {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 px-5 py-3">
        <CheckCircle size={20} className="text-emerald-400" />
        <span className="text-xl font-black text-emerald-400">DO IT</span>
        <span className="text-lg">✓</span>
      </div>
    )
  }
  if (verdict === 'CAUTION') {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/25 px-5 py-3">
        <AlertTriangle size={20} className="text-amber-400" />
        <span className="text-xl font-black text-amber-400">CAUTION</span>
        <span className="text-lg">⚠</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-red-500/15 border border-red-500/25 px-5 py-3">
      <XCircle size={20} className="text-red-400" />
      <span className="text-xl font-black text-red-400">NOT NOW</span>
      <span className="text-lg">✗</span>
    </div>
  )
}

interface ScenarioRunnerProps {
  scenarioType: ScenarioType
  scenarioName: string
}

export function ScenarioRunner({ scenarioType, scenarioName }: ScenarioRunnerProps) {
  const config = SCENARIO_CONFIGS[scenarioType] ?? SCENARIO_CONFIGS.custom
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    config.fields.forEach((f) => {
      if (f.default !== undefined) defaults[f.key] = String(f.default)
    })
    return defaults
  })
  const { runScenario, result, isRunning, clearResult } = useScenarios()

  const handleSubmit = () => {
    clearResult()
    const amount = parseFloat(formValues.amount ?? '0') || 0
    runScenario({
      type: scenarioType,
      amount,
      duration_months: formValues.duration_months ? parseInt(formValues.duration_months) : undefined,
      income_reduction: formValues.income_reduction ? parseFloat(formValues.income_reduction) : undefined,
      description: formValues.description,
      custom_params: formValues,
    })
  }

  return (
    <div className="space-y-4">
      {/* Input form */}
      <GlassCard title={scenarioName} subtitle="Configure and calculate impact" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                {field.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">{field.prefix}</span>
                )}
                <input
                  type={field.type}
                  value={formValues[field.key] ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors ${field.prefix ? 'pl-7 pr-4' : 'px-4'}`}
                />
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSubmit}
          disabled={isRunning}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Calculating Impact...</span>
            </>
          ) : (
            <span>Calculate Impact</span>
          )}
        </motion.button>
      </GlassCard>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-4"
          >
            {/* Verdict */}
            <GlassCard padding="md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <VerdictBadge verdict={result.verdict} />
                <div>
                  <p className="text-sm text-white/60 leading-relaxed">{result.verdict_reason}</p>
                </div>
              </div>
            </GlassCard>

            {/* Impact metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <GlassCard padding="sm">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Cash Impact</p>
                <p className={`text-lg font-black mt-1 tabular-nums ${result.cash_impact < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.cash_impact < 0 ? '' : '+'}{formatCurrency(result.cash_impact)}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {Math.abs(result.cash_impact_percent).toFixed(1)}% of liquid cash
                </p>
              </GlassCard>

              <GlassCard padding="sm">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Emergency Fund</p>
                <div className="flex items-center gap-1 mt-1">
                  {result.emergency_impact.delta < 0 ? (
                    <TrendingDown size={14} className="text-red-400" />
                  ) : (
                    <TrendingUp size={14} className="text-emerald-400" />
                  )}
                  <span className={`text-lg font-black tabular-nums ${result.emergency_impact.delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {result.emergency_impact.after_months.toFixed(1)}mo
                  </span>
                </div>
                <p className="text-[10px] text-white/25 mt-0.5">
                  Was {result.emergency_impact.before_months.toFixed(1)} months
                </p>
              </GlassCard>

              <GlassCard padding="sm">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Debt Timeline</p>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar size={13} className="text-blue-400" />
                  <span className="text-sm font-bold text-white/70">
                    {formatDate(result.debt_timeline_impact.new_payoff_date, 'MMM yyyy')}
                  </span>
                </div>
                {result.debt_timeline_impact.extra_interest > 0 && (
                  <p className="text-[10px] text-red-400/70 mt-0.5">
                    +{formatCurrency(result.debt_timeline_impact.extra_interest)} interest
                  </p>
                )}
              </GlassCard>

              <GlassCard padding="sm">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">FI Date Impact</p>
                <p className={`text-lg font-black mt-1 tabular-nums ${result.retirement_impact.delta_months > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {result.retirement_impact.delta_months > 0 ? '+' : ''}{result.retirement_impact.delta_months}mo
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">to FI date</p>
              </GlassCard>
            </div>

            {/* Warnings and Opportunities */}
            {(result.warnings.length > 0 || result.opportunities.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.warnings.length > 0 && (
                  <GlassCard glowColor="red" padding="sm">
                    <p className="text-[10px] text-red-400/60 uppercase tracking-wider font-semibold mb-2">Warnings</p>
                    <ul className="space-y-1.5">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-white/60">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                )}
                {result.opportunities.length > 0 && (
                  <GlassCard glowColor="emerald" padding="sm">
                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider font-semibold mb-2">Opportunities</p>
                    <ul className="space-y-1.5">
                      {result.opportunities.map((o, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-white/60">
                          <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Logic Trace */}
            {result.logic_trace.length > 0 && (
              <GlassCard title="Logic Trace" subtitle="Step-by-step calculation" padding="md">
                <LogicTrace steps={result.logic_trace} />
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
