'use client'

import { UserStats, LEVELS } from '@/types'

interface Props {
  stats: UserStats
}

export default function XPBar({ stats }: Props) {
  const isMaxLevel = stats.level === LEVELS[LEVELS.length - 1].level

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-surface border-b border-grind-border">
      <div className="flex items-baseline gap-2 shrink-0">
        <span className="text-xs font-mono text-muted uppercase tracking-widest">LVL</span>
        <span className="text-2xl font-bold text-gold leading-none">{stats.level}</span>
      </div>

      <div className="flex-1 max-w-xs">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-foreground font-medium">{stats.title}</span>
          {!isMaxLevel && (
            <span className="text-muted">{stats.xpToNextLevel.toLocaleString()} XP to next</span>
          )}
        </div>
        <div className="h-1.5 bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-700"
            style={{ width: `${stats.xpProgress}%` }}
          />
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs text-muted">Total XP</div>
        <div className="text-sm font-mono font-semibold text-foreground">
          {stats.totalXP.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
