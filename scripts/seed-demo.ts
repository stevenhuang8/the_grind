import { createClient } from '@supabase/supabase-js'
import { Stage, STAGE_XP } from '../types'

type SeedApplication = {
  company: string
  role: string
  stage: Stage
  daysAgo: number
  url?: string
  notes?: string
}

// Curated, in-character sample data — spread across every stage so all seven
// Kanban columns have cards, with dates spread over the last ~6 weeks.
const SEED_APPLICATIONS: SeedApplication[] = [
  { company: 'Vercel', role: 'Senior Frontend Engineer', stage: 'offer', daysAgo: 38, url: 'https://vercel.com/careers', notes: 'Final offer came in above range. Victory.' },
  { company: 'Stripe', role: 'Platform Engineer', stage: 'final_round', daysAgo: 12, url: 'https://stripe.com/jobs', notes: 'Onsite loop next week — 4 rounds.' },
  { company: 'Linear', role: 'Full Stack Engineer', stage: 'final_round', daysAgo: 9, notes: 'Take-home went well, waiting on final panel.' },
  { company: 'Figma', role: 'Product Engineer', stage: 'interview', daysAgo: 15, url: 'https://figma.com/careers' },
  { company: 'Notion', role: 'Backend Engineer', stage: 'interview', daysAgo: 7, notes: 'Recruiter screen + hiring manager call done.' },
  { company: 'Datadog', role: 'Software Engineer, Infrastructure', stage: 'interview', daysAgo: 4 },
  { company: 'Anthropic', role: 'Applied AI Engineer', stage: 'in_review', daysAgo: 6, url: 'https://anthropic.com/careers' },
  { company: 'Cloudflare', role: 'Systems Engineer', stage: 'in_review', daysAgo: 3 },
  { company: 'Airtable', role: 'Frontend Engineer', stage: 'applied', daysAgo: 2 },
  { company: 'Ramp', role: 'Full Stack Engineer', stage: 'applied', daysAgo: 1, url: 'https://ramp.com/careers' },
  { company: 'Retool', role: 'Product Engineer', stage: 'applied', daysAgo: 5 },
  { company: 'Scale AI', role: 'Backend Engineer', stage: 'rejected', daysAgo: 21, notes: 'Boss defeated them, apparently. Rejected after onsite.' },
  { company: 'Snowflake', role: 'Software Engineer', stage: 'rejected', daysAgo: 30 },
  { company: 'Brex', role: 'Senior Software Engineer', stage: 'ghosted', daysAgo: 27, notes: 'They fled the battle. No word after the recruiter screen.' },
  { company: 'Plaid', role: 'Full Stack Engineer', stage: 'ghosted', daysAgo: 33 },
]

function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.DEMO_EMAIL
  const password = process.env.DEMO_PASSWORD

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }
  if (!email || !password) {
    console.error('Missing DEMO_EMAIL / DEMO_PASSWORD in .env.local')
    process.exit(1)
  }

  return run(supabaseUrl, supabaseAnonKey, email, password)
}

async function run(supabaseUrl: string, supabaseAnonKey: string, email: string, password: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData.user) {
    console.error(
      `Demo sign-in failed: ${authError?.message ?? 'unknown error'}\n` +
      'Make sure the demo account exists in Supabase Auth (Dashboard → Authentication → Users) ' +
      'with credentials matching DEMO_EMAIL / DEMO_PASSWORD in .env.local.'
    )
    process.exit(1)
  }
  const userId = authData.user.id

  const { error: deleteError } = await supabase.from('applications').delete().eq('user_id', userId)
  if (deleteError) {
    console.error(`Failed to clear existing demo applications: ${deleteError.message}`)
    process.exit(1)
  }

  const today = new Date()
  const rows = SEED_APPLICATIONS.map(({ company, role, stage, daysAgo, url, notes }) => {
    const appliedDate = new Date(today)
    appliedDate.setDate(appliedDate.getDate() - daysAgo)
    return {
      user_id: userId,
      company,
      role,
      stage,
      applied_date: appliedDate.toISOString().slice(0, 10),
      url,
      notes,
      xp_awarded: STAGE_XP[stage],
    }
  })

  const { data: inserted, error: insertError } = await supabase.from('applications').insert(rows).select()
  if (insertError || !inserted) {
    console.error(`Failed to insert seed applications: ${insertError?.message ?? 'unknown error'}`)
    process.exit(1)
  }

  const byStage = inserted.reduce<Record<string, number>>((acc, row) => {
    acc[row.stage] = (acc[row.stage] ?? 0) + 1
    return acc
  }, {})

  console.log(`Seeded ${inserted.length} applications for demo user ${userId}:`)
  for (const [stage, count] of Object.entries(byStage)) {
    console.log(`  ${stage}: ${count}`)
  }
}

main()
