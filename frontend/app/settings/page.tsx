'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Home, Zap, Bot, Moon, Sun, Check, AlertCircle, Loader2,
  RefreshCw, Copy, Activity,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/formatters'

// ── API helpers (inline to keep this page self-contained) ──────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('whwos_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { ...authHeader() } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ size: number; className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard padding="lg">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <Icon size={15} className="text-white/60" />
          </div>
          <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">{title}</h2>
        </div>
        {children}
      </GlassCard>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-white/40 uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors'

const readonlyClass =
  'w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5 text-sm text-white/40 cursor-not-allowed'

// ── Profile Section ────────────────────────────────────────────────────────────

function ProfileSection() {
  const [profile, setProfile] = useState<{
    first_name: string; last_name: string; email: string; phone: string
  } | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<{ user: typeof profile }>('/settings/profile')
      .then((d) => {
        setProfile(d.user)
        setForm({ first_name: d.user?.first_name ?? '', last_name: d.user?.last_name ?? '', phone: d.user?.phone ?? '' })
      })
      .catch(() => {
        // demo mode — prefill defaults
        setProfile({ first_name: 'Josh', last_name: 'White', email: 'josh@whitehouse.com', phone: '' })
        setForm({ first_name: 'Josh', last_name: 'White', phone: '' })
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await apiPatch('/settings/profile', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save — check your connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section icon={User} title="Profile">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="First Name">
          <input
            className={inputClass}
            value={form.first_name}
            onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
          />
        </Field>
        <Field label="Last Name">
          <input
            className={inputClass}
            value={form.last_name}
            onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Email">
          <input className={readonlyClass} value={profile?.email ?? ''} readOnly />
        </Field>
        <Field label="Phone">
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+1 (555) 000-0000"
          />
        </Field>
      </div>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-sm text-blue-400 font-semibold transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Profile'}
      </button>
    </Section>
  )
}

// ── Household Section ──────────────────────────────────────────────────────────

function HouseholdSection() {
  const [form, setForm] = useState({ name: '', currency: 'USD', timezone: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<{ name: string; currency: string; timezone: string }>('/settings/household')
      .then((d) => setForm({ name: d.name, currency: d.currency, timezone: d.timezone }))
      .catch(() => setForm({ name: 'The White House', currency: 'USD', timezone: 'America/Chicago' }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await apiPatch('/settings/household', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const TIMEZONES = [
    'America/Chicago', 'America/New_York', 'America/Los_Angeles',
    'America/Denver', 'America/Phoenix', 'Pacific/Honolulu',
  ]

  return (
    <Section icon={Home} title="Household">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="col-span-2">
          <Field label="Household Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="The Johnson Family"
            />
          </Field>
        </div>
        <Field label="Currency">
          <select
            className={inputClass}
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
          >
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="CAD">CAD — Canadian Dollar</option>
          </select>
        </Field>
        <Field label="Time Zone">
          <select
            className={inputClass}
            value={form.timezone}
            onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-sm text-blue-400 font-semibold transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Household'}
      </button>
    </Section>
  )
}

// ── Firefly Integration Section ────────────────────────────────────────────────

function FireflySection() {
  const [config, setConfig] = useState<{
    connected: boolean
    config: { base_url: string; last_successful_sync: string | null; is_active: boolean } | null
  } | null>(null)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    apiGet<typeof config>('/settings/firefly')
      .then(setConfig)
      .catch(() => setConfig({ connected: false, config: null }))
  }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    setSyncMsg('')
    try {
      await apiGet('/settings/firefly')
      setSyncMsg('Connection OK')
    } catch {
      setSyncMsg('Connection failed')
    } finally {
      setTesting(false)
    }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      await apiPost('/sync/trigger', { type: 'delta' })
      setSyncMsg('Sync triggered — check back in a moment.')
    } catch {
      setSyncMsg('Sync failed or not configured.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Section icon={Zap} title="Firefly III Integration">
      <div className="space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${config?.connected ? 'bg-emerald-400' : 'bg-white/20'}`}
            style={config?.connected ? { boxShadow: '0 0 8px rgba(52,211,153,0.6)' } : {}}
          />
          <span className="text-sm text-white/60">
            {config === null ? 'Checking…' : config.connected ? 'Connected' : 'Not configured'}
          </span>
        </div>

        {config?.config && (
          <div className="space-y-3">
            <Field label="Base URL">
              <input className={readonlyClass} value={config.config.base_url} readOnly />
            </Field>
            <Field label="Last Successful Sync">
              <input
                className={readonlyClass}
                value={config.config.last_successful_sync
                  ? new Date(config.config.last_successful_sync).toLocaleString()
                  : 'Never'}
                readOnly
              />
            </Field>
          </div>
        )}

        {!config?.config && config !== null && (
          <p className="text-xs text-white/30">
            No Firefly III config found. Add one via the API at{' '}
            <code className="text-white/50 bg-white/[0.05] px-1 rounded">POST /settings/firefly</code>.
          </p>
        )}

        {syncMsg && (
          <p className={`text-xs ${syncMsg.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>
            {syncMsg}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80 border border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition-all disabled:opacity-40"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
            Test Connection
          </button>
          <button
            onClick={handleManualSync}
            disabled={syncing || !config?.connected}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80 border border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition-all disabled:opacity-40"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Manual Sync
          </button>
        </div>
      </div>
    </Section>
  )
}

// ── Agent Integrations Section ─────────────────────────────────────────────────

type AgentJob = {
  id: string
  task: string
  status: string
  note: string | null
  created_at: string
  completed_at: string | null
}

function IntegrationsSection() {
  const [data, setData] = useState<{
    key_configured: boolean
    key_preview: string
    jobs: AgentJob[]
  } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiGet<typeof data>('/settings/agent')
      .then(setData)
      .catch(() => setData({ key_configured: false, key_preview: '', jobs: [] }))
  }, [])

  const handleCopy = () => {
    if (data?.key_preview) {
      navigator.clipboard.writeText(data.key_preview).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statusColor: Record<string, string> = {
    pending: 'text-amber-400',
    done: 'text-emerald-400',
    processing: 'text-blue-400',
  }

  return (
    <Section icon={Bot} title="Hermes Agent">
      <div className="space-y-5">
        {/* Key status */}
        <div className="space-y-2">
          <Field label="Agent API Key">
            <div className="flex gap-2">
              <input
                className={readonlyClass + ' flex-1'}
                value={data?.key_configured ? data.key_preview : 'Not configured'}
                readOnly
              />
              {data?.key_configured && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border border-white/[0.08] rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </Field>
          {!data?.key_configured && (
            <p className="text-[10px] text-amber-400/70">
              Set <code className="bg-white/[0.05] px-1 rounded">AGENT_API_KEY</code> in your <code className="bg-white/[0.05] px-1 rounded">.env</code> and restart the API container.
            </p>
          )}
        </div>

        {/* Recent jobs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={12} className="text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Recent Agent Jobs</span>
          </div>
          {data?.jobs.length === 0 ? (
            <p className="text-xs text-white/20 italic">No jobs yet — the Hermes agent hasn't connected.</p>
          ) : (
            <div className="space-y-1.5">
              {data?.jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white/70 truncate">{job.task}</p>
                    {job.note && <p className="text-[10px] text-white/30 truncate">{job.note}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold flex-shrink-0 ml-3 ${statusColor[job.status] ?? 'text-white/40'}`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

// ── Theme Toggle (stub) ────────────────────────────────────────────────────────

function ThemeSection() {
  const [dark, setDark] = useState(true)

  return (
    <Section icon={Moon} title="Appearance">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70 font-medium">Dark Mode</p>
          <p className="text-xs text-white/30 mt-0.5">Light mode coming in a future release.</p>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${dark ? 'bg-blue-500/50' : 'bg-white/10'}`}
          aria-label="Toggle theme"
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center ${dark ? 'translate-x-5' : ''}`}
          >
            {dark ? <Moon size={10} className="text-gray-600" /> : <Sun size={10} className="text-amber-500" />}
          </div>
        </button>
      </div>
    </Section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-sm text-white/30 mt-1">Manage your profile, household, and integrations.</p>
        </div>

        <ProfileSection />
        <HouseholdSection />
        <FireflySection />
        <IntegrationsSection />
        <ThemeSection />
      </div>
    </div>
  )
}
