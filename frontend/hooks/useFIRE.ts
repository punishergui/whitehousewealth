'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fireApi } from '@/lib/api'
import type { FIREAssumptions } from '@/types'

export function useFIRE() {
  return useQuery({
    queryKey: ['fire'],
    queryFn: () => fireApi.getFIREData(),
    staleTime: 1000 * 60 * 30,
  })
}

export function useUpdateFIREAssumptions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assumptions: Partial<FIREAssumptions>) =>
      fireApi.updateFIREAssumptions(assumptions),
    onSuccess: (data) => {
      queryClient.setQueryData(['fire'], data)
    },
  })
}
