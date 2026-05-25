'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useTransactions } from '@/hooks/useTransactions'
import { MOCK_TRANSACTIONS } from '@/lib/mockData'
import type { Transaction, TransactionType } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#10b981',
  Income: '#3b82f6',
  'Gas & Fuel': '#f59e0b',
  Entertainment: '#8b5cf6',
  'Dining Out': '#ef4444',
  'Auto Payment': '#6366f1',
  Mortgage: '#8b5cf6',
  'Health & Fitness': '#06b6d4',
  Shopping: '#f97316',
  Utilities: '#f59e0b',
  Subscriptions: '#ec4899',
}

const PAGE_SIZE = 8

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#6b7280'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {category}
    </span>
  )
}

interface ExpandedRowProps {
  tx: Transaction
}

function ExpandedRow({ tx }: ExpandedRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-3 pt-0 bg-white/[0.02] border-t border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-white/30 uppercase tracking-wider text-[10px]">Account</p>
          <p className="text-white/70 mt-0.5">{tx.account_name}</p>
        </div>
        <div>
          <p className="text-white/30 uppercase tracking-wider text-[10px]">Status</p>
          <p className="mt-0.5">
            <span className={`font-semibold ${tx.status === 'posted' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-white/60'}`}>
              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
            </span>
          </p>
        </div>
        <div>
          <p className="text-white/30 uppercase tracking-wider text-[10px]">Type</p>
          <p className="text-white/70 mt-0.5 capitalize">{tx.type}</p>
        </div>
        {tx.notes && (
          <div>
            <p className="text-white/30 uppercase tracking-wider text-[10px]">Notes</p>
            <p className="text-white/70 mt-0.5">{tx.notes}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface TransactionTableProps {
  initialTransactions?: Transaction[]
}

export function TransactionTable({ initialTransactions }: TransactionTableProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data } = useTransactions()
  const allTransactions = initialTransactions ?? data?.transactions ?? MOCK_TRANSACTIONS

  const categories = useMemo(() => {
    const cats = new Set(allTransactions.map((t) => t.category))
    return Array.from(cats).sort()
  }, [allTransactions])

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      const matchSearch =
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.merchant_name.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !categoryFilter || t.category === categoryFilter
      const matchType = !typeFilter || t.type === typeFilter
      return matchSearch && matchCategory && matchType
    })
  }, [allTransactions, search, categoryFilter, typeFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  return (
    <GlassCard title="Transaction Explorer" padding="md">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="bg-white/[0.03] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1) }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40 transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="credit">Income</option>
            <option value="debit">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="text-[10px] text-white/25 uppercase tracking-wider border-b border-white/[0.05]">
              <th className="text-left pb-2 pl-1 font-semibold">Date</th>
              <th className="text-left pb-2 font-semibold">Description</th>
              <th className="text-left pb-2 font-semibold hidden sm:table-cell">Category</th>
              <th className="text-right pb-2 pr-1 font-semibold">Amount</th>
              <th className="pb-2 w-6" />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-white/30">
                  No transactions found
                </td>
              </tr>
            ) : (
              paged.map((tx) => (
                <>
                  <tr
                    key={tx.id}
                    onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 pl-1 text-xs text-white/40 whitespace-nowrap">
                      {formatDate(tx.date, 'MMM d')}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-xs font-medium text-white/80 truncate max-w-[160px]">
                        {tx.merchant_name}
                      </div>
                      <div className="text-[10px] text-white/30 truncate max-w-[160px]">
                        {tx.description}
                      </div>
                    </td>
                    <td className="py-2.5 hidden sm:table-cell">
                      <CategoryBadge category={tx.category} />
                    </td>
                    <td className={`py-2.5 pr-1 text-right text-sm font-bold tabular-nums whitespace-nowrap ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'credit' ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td className="py-2.5 text-white/20 group-hover:text-white/40 transition-colors">
                      {expandedId === tx.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedId === tx.id && (
                      <tr key={`${tx.id}-expanded`}>
                        <td colSpan={5} className="p-0">
                          <ExpandedRow tx={tx} />
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
          <p className="text-[10px] text-white/30">
            {filtered.length} transactions
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-white/40 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
