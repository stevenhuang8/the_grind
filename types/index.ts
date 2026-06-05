export type Stage =
  | 'applied'
  | 'in_review'
  | 'interview'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'ghosted'

export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  stage: Stage
  applied_date: string
  url?: string
  notes?: string
  xp_awarded: number
  created_at: string
  updated_at: string
}

export interface UserStats {
  totalApplications: number
  totalXP: number
  level: number
  title: string
  xpToNextLevel: number
  xpProgress: number // 0-100 percentage
  streak: number
  responseRate: number
}

export const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  in_review: 'In Review',
  interview: 'Interview',
  final_round: 'Final Round',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
}

export const STAGE_XP: Record<Stage, number> = {
  applied: 50,
  in_review: 25,
  interview: 200,
  final_round: 400,
  offer: 1000,
  rejected: 75,
  ghosted: 0,
}

export interface JobDocument {
  id: string
  application_id: string
  user_id: string
  file_name: string
  storage_path: string
  file_size?: number
  created_at: string
}

export interface Level {
  level: number
  title: string
  xpRequired: number
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Rookie', xpRequired: 0 },
  { level: 2, title: 'Applicant', xpRequired: 500 },
  { level: 3, title: 'Grinder', xpRequired: 1500 },
  { level: 4, title: 'Veteran', xpRequired: 3500 },
  { level: 5, title: 'The Relentless', xpRequired: 7000 },
  { level: 6, title: 'Grind Don', xpRequired: 12000 },
  { level: 7, title: 'Untouchable', xpRequired: 20000 },
]
