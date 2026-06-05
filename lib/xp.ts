import { LEVELS, Level, UserStats, Application, STAGE_XP } from '@/types'

export function getLevelFromXP(xp: number): Level {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) current = level
    else break
  }
  return current
}

export function getNextLevel(currentLevel: number): Level | null {
  return LEVELS.find((l) => l.level === currentLevel + 1) ?? null
}

export function getXPProgress(xp: number): number {
  const current = getLevelFromXP(xp)
  const next = getNextLevel(current.level)
  if (!next) return 100
  const range = next.xpRequired - current.xpRequired
  const progress = xp - current.xpRequired
  return Math.round((progress / range) * 100)
}

export function computeStats(applications: Application[]): UserStats {
  const totalXP = applications.reduce((sum, a) => sum + a.xp_awarded, 0)
  const level = getLevelFromXP(totalXP)
  const next = getNextLevel(level.level)
  const responded = applications.filter(
    (a) => a.stage !== 'applied' && a.stage !== 'ghosted'
  ).length
  const responseRate =
    applications.length > 0
      ? Math.round((responded / applications.length) * 100)
      : 0

  return {
    totalApplications: applications.length,
    totalXP,
    level: level.level,
    title: level.title,
    xpToNextLevel: next ? next.xpRequired - totalXP : 0,
    xpProgress: getXPProgress(totalXP),
    streak: computeStreak(applications),
    responseRate,
  }
}

function computeStreak(applications: Application[]): number {
  if (applications.length === 0) return 0
  const dates = [
    ...new Set(applications.map((a) => a.applied_date)),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)

  for (const dateStr of dates) {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    const diff = Math.round(
      (current.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diff <= 1) {
      streak++
      current = d
    } else break
  }

  return streak
}
