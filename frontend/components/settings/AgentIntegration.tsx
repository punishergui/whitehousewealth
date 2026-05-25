'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

interface AgentJob {
  id: string
  task: string
  status: 'pending' | 'completed' | 'failed'
  note?: string
  created_at: string
  completed_at?: string
}

interface AgentIntegrationProps {
  /** Masked API key: first 8 chars exposed. If undefined, shows placeholder. */
  apiKeyPrefix?: string
  /** WHW base URL for the agent endpoint reference. */
  baseUrl?: string
}

const statusIcon = {
  pending: <Clock size={12} className="text-yellow-400" />,
  completed: <CheckCircle size={12} className="text-emerald-400" />,
  failed: <AlertCircle size={12} className="text-red-400" />,
}

const statusColor = {
  pending: 'text-yellow-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
}

export function AgentIntegration({ apiKeyPrefix, baseUrl }: AgentIntegrationProps) {
  const [revealed, setRevealed] = useState(false)
  const [jobs, setJobs] = useState<AgentJob[]>([])
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const endpoint = `${baseUrl || 'http://10.0.10.10:8000'}/api/agent`

  const fetchJobs = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('whwos_token') : null
      const res = await fetch('/api/agent/jobs/pending', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setJobs(data.slice(0, 10))
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    setToast(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('whwos_token') : null
      await fetch('/api/sync-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      setToast('Sync job created — Hermes will pick it up shortly.')
      await fetchJobs()
    } catch {
      setToast('Failed to trigger sync — check connection.')
    } finally {
      setSyncing(false)
      setTimeout(() => setToast(null), 6000)
    }
  }

  const maskedKey = apiKeyPrefix
    ? `${apiKeyPrefix.slice(0, 8)}••••••••••••••••••••••••`
    : '(not configured)'

  return (
    <div className="space-y-4">
      {/* API Key */}
      <GlassCard title="Agent API Key" padding="md">
        <div className="space-y-3">
          <p className="text-xs text-white/40">
            The external Hermes agent authenticates to WHW using this key in the{' '}
            <code className="text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded text-[10px]">
              X-Agent-Key
            </code>{' '}
            header. Keep it secret.
          </p>

          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3">
            <code className="flex-1 text-sm text-white/70 font-mono tracking-wide">
              {revealed ? (apiKeyPrefix ?? '(not set)') : maskedKey}
            </code>
            <button
              onClick={() => setRevealed((v) => !v)}
              className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors"
              aria-label={revealed ? 'Hide key' : 'Reveal key'}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <p className="text-[10px] text-white/20">
            To rotate: generate a new key with{' '}
            <code className="text-white/40">openssl rand -hex 32</code>, update{' '}
            <code className="text-white/40">AGENT_API_KEY</code> in your{' '}
            <code className="text-white/40">.env</code>, and restart the api container.
          </p>
        </div>
      </GlassCard>

      {/* Endpoint reference */}
      <GlassCard title="Endpoint Base URL" padding="md">
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3">
            <code className="flex-1 text-sm text-white/70 font-mono break-all">{endpoint}</code>
          </div>
          <p className="text-[10px] text-white/20">
            Configure this as <code className="text-white/40">WHW_BASE_URL</code> in your
            Hermes agent environment.
          </p>
        </div>
      </GlassCard>

      {/* Recent jobs */}
      <GlassCard title="Recent Agent Jobs" padding="md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/30">Last 10 jobs</p>
            <button
              onClick={fetchJobs}
              className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-white/20 italic">Loading...</p>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-white/20 italic">No jobs yet — trigger a sync to get started.</p>
          ) : (
            <div className="space-y-1.5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                >
                  {statusIcon[job.status] ?? statusIcon.pending}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/70">{job.task}</span>
                      <span className={`text-[10px] font-medium ${statusColor[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/20 truncate">
                      {new Date(job.created_at).toLocaleString()}
                      {job.completed_at && ` → ${new Date(job.completed_at).toLocaleString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Trigger sync */}
      <GlassCard padding="md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">Trigger Sync Now</p>
            <p className="text-xs text-white/30 mt-0.5">
              Creates an &ldquo;all&rdquo; job — Hermes will categorize, brief, and set priorities.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Requesting…' : 'Sync AI'}
            </button>
            {toast && (
              <p className="text-[10px] text-emerald-400 text-right max-w-[200px]">{toast}</p>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
