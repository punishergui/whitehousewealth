'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      // error is set in the store
    }
  }

  const fillDemo = () => {
    setEmail('joshua@johnson.family')
    setPassword('demo1234')
    clearError()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="relative rounded-2xl backdrop-blur-2xl bg-white/[0.04] border border-white/[0.10] shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          {/* Top gradient line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent rounded-t-2xl" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="relative mb-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                  <Home size={28} className="text-blue-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                  <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h1 className="text-xl font-black tracking-[0.12em] text-white">
                  WHITE HOUSE
                </h1>
                <h2 className="text-xl font-black tracking-[0.12em] bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                  WEALTH OS
                </h2>
                <p className="text-xs text-white/30 tracking-widest mt-1 uppercase">
                  Family Financial Command Center
                </p>
              </motion.div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4"
              >
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all duration-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </motion.button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider text-center mb-2">Demo Access</p>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-white/40">
                    <span className="text-white/20">Email: </span>
                    <span className="text-white/50 font-mono">joshua@johnson.family</span>
                  </p>
                  <p className="text-white/40 mt-0.5">
                    <span className="text-white/20">Password: </span>
                    <span className="text-white/50 font-mono">demo1234</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10"
                >
                  Use Demo
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/15 mt-6 tracking-wider">
          WHITE HOUSE WEALTH OS &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
