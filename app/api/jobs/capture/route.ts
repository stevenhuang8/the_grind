import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-auth'
import { isRateLimited } from '@/lib/rate-limit'

// The extension sends up to 12,000 characters of page text plus the title and URL.
const MAX_PAGE_TEXT_LENGTH = 15_000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  if (isRateLimited(`capture:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS })
  }

  const body = await req.json().catch(() => null)
  if (typeof body?.pageText !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: CORS })
  }
  const pageText = body.pageText.slice(0, MAX_PAGE_TEXT_LENGTH)

  const prompt = `Extract the job posting details from the content below.

IMPORTANT: The page title often follows the pattern "[Job Title] at [Company Name] | [Site]" — treat this as your strongest signal for role and company name.

${pageText}

Return ONLY valid JSON with exactly these keys:
{
  "company": "company name",
  "role": "job title",
  "notes": "1-2 sentence summary of the role and key requirements"
}

If you cannot determine a field with confidence, use an empty string.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: 'You are a job data extractor. Return only valid JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  const raw = data.content?.[0]?.text ?? '{}'

  // Strip potential markdown code fences before parsing
  const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()

  let extracted: { company?: string; role?: string; notes?: string } = {}
  try {
    extracted = JSON.parse(cleaned)
  } catch {
    extracted = { company: '', role: '', notes: '' }
  }

  return NextResponse.json(extracted, { headers: CORS })
}
