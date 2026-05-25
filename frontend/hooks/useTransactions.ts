'use client'

import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/lib/api'
import type { TransactionFilters } from '@/types'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.getTransactions(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => transactionsApi.getBudgets(),
    staleTime: 1000 * 60 * 10,
  })
}

export function useSpendingTrends(months: number = 6) {
  return useQuery({
    queryKey: ['spending-trends', months],
    queryFn: () => transactionsApi.getSpendingTrends(months),
    staleTime: 1000 * 60 * 30,
  })
}
