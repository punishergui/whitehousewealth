'use client'

import { motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { TransactionTable } from '@/components/money/TransactionTable'
import { BudgetProgress } from '@/components/money/BudgetProgress'
import { CategoryBreakdown } from '@/components/money/CategoryBreakdown'
import { SpendingTrends } from '@/components/money/SpendingTrends'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

export default function MoneyPage() {
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
          <h1 className="text-2xl font-black text-white tracking-tight">Money Ops</h1>
          <p className="text-sm text-white/30 mt-0.5">Transactions, budgets, and spending analysis</p>
        </motion.div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div variants={fadeUp} className="lg:col-span-1">
            <CategoryBreakdown />
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <SpendingTrends />
          </motion.div>
        </div>

        {/* Budget + Transactions row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <BudgetProgress />
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <TransactionTable />
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  )
}
