'use client'

import { useQuery } from '@tanstack/react-query'
import { wealthApi } from '@/lib/api'

export function useWealth() {
  return useQuery({
    queryKey: ['wealth'],
    queryFn: () => wealthApi.getWealthData(),
    staleTime: 1000 * 60 * 10,
  })
}

export function useNetWorthHistory(months: number = 12) {
  return useQuery({
    queryKey: ['net-worth-history', months],
    queryFn: () => wealthApi.getNetWorthHistory(months),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => wealthApi.getAccounts(),
    staleTime: 1000 * 60 * 5,
  })
}
