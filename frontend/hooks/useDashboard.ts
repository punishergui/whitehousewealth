'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { useDashboardStore } from '@/store/dashboardStore'

export function useDashboard() {
  const { setData, setLoading } = useDashboardStore()

  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      setLoading(true)
      try {
        const data = await dashboardApi.getDashboardData()
        setData(data)
        return data
      } finally {
        setLoading(false)
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}
