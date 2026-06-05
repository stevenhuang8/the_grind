'use client'

import { UserStats } from '@/types'

interface Props {
  stats: UserStats
}

export default function StatsPanel({ stats }: Props) {
  return (
    <div className="flex items-center gap-5 px-6 py-2 bg-surface border-b border-grind-border text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">Apps</span>
        <span className="font-semibold text-foreground">{stats.totalApplications}</span>
      </div>
      <div className="h-3 w-px bg-grind-border" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">Response</span>
        <span className="font-semibold text-foreground">{stats.responseRate}%</span>
      </div>
      <div className="h-3 w-px bg-grind-border" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">Streak</span>
        <span className="font-semibold text-foreground">
          {stats.streak > 0 ? `${stats.streak}d` : '0d'}
          {stats.streak >= 3 && <span className="ml-1">🔥</span>}
        </span>
      </div>
    </div>
  )
}
