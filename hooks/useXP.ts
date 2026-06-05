import { useMemo } from 'react'
import { Application, UserStats } from '@/types'
import { computeStats } from '@/lib/xp'

export function useXP(applications: Application[]): UserStats {
  return useMemo(() => computeStats(applications), [applications])
}
