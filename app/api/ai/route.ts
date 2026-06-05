import { NextRequest, NextResponse } from 'next/server'
import { Stage } from '@/types'

const REACTION_PROMPTS: Record<Stage, string> = {
  applied: 'The user just applied to {company} for a {role} position. Give them a short, hype 1-2 sentence reaction. Tone: confident, like a coach before a game. No cringe.',
  in_review: 'The user got their application moved to review at {company} for {role}. Short encouraging reaction, 1-2 sentences. They\'re in the door.',
  interview: 'The user landed an interview at {company} for {role}. 1-2 sentences of genuine hype. Make them feel like a threat.',
  final_round: 'The user made it to the final round at {company} for {role}. 1-2 sentences. They\'re one step away. Build the tension.',
  offer: 'The user got an offer from {company} for {role}. 1-2 sentences. Campaign complete. Go all out.',
  rejected: 'The user got rejected from {company} for {role}. 1-2 sentences. Reframe it positively AND lightly roast the company. Don\'t be mean but be real.',
  ghosted: 'The user got ghosted by {company} after applying for {role}. 1-2 sentences. Trash talk the company (keep it classy), boost the user.',
}

export async function POST(req: NextRequest) {
  const { type, company, role, stage, stats } = await req.json()

  let prompt = ''

  if (type === 'reaction') {
    const template = REACTION_PROMPTS[stage as Stage] ?? REACTION_PROMPTS.applied
    prompt = template
      .replace('{company}', company)
      .replace('{role}', role)
  } else if (type === 'roast') {
    prompt = `Roast ${company} for ghosting/rejecting a candidate applying for ${role}. Be savage but keep it professional and witty. 2-3 sentences max. No asterisks or formatting.`
  } else if (type === 'recap') {
    prompt = `Write a weekly job search recap for someone who: applied to ${stats?.totalApplications ?? 0} jobs total, has a ${stats?.responseRate ?? 0}% response rate, and is level ${stats?.level ?? 1} "${stats?.title ?? 'Rookie'}". Keep it under 4 sentences, personal, motivating but real. Sign off with something punchy.`
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are Grind — a brutally honest, hype, witty AI companion for job seekers. You reframe rejection as XP, roast companies that ghost people, and celebrate every application as progress. Keep responses short, punchy, no bullet points, no em dashes.',
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text ?? 'Keep grinding.'

  return NextResponse.json({ text })
}
