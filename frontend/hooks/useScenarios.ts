'use client'

import { useMutation } from '@tanstack/react-query'
import { scenariosApi } from '@/lib/api'
import type { ScenarioParams, ScenarioResult } from '@/types'
import { useState } from 'react'

export function useScenarios() {
  const [result, setResult] = useState<ScenarioResult | null>(null)

  const mutation = useMutation({
    mutationFn: (params: ScenarioParams) => scenariosApi.runScenario(params),
    onSuccess: (data) => {
      setResult(data)
    },
  })

  return {
    runScenario: mutation.mutate,
    result,
    isRunning: mutation.isPending,
    error: mutation.error,
    clearResult: () => setResult(null),
  }
}
