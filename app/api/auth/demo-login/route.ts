import { createClient } from '@supabase/supabase-js'
import { getFlag } from '@/lib/launchdarkly'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`demo-login:${ip}`, 5, 60_000)) {
    return Response.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }

  // The flag targets ref=recruiter, so evaluate that context: turning the flag
  // off disables this route as well as hiding the button.
  const enabled = await getFlag('demo-login', false, { ref: 'recruiter' })
  if (!enabled) {
    return Response.json({ error: 'Demo login is unavailable.' }, { status: 403 })
  }

  const email = process.env.DEMO_EMAIL
  const password = process.env.DEMO_PASSWORD

  if (!email || !password) {
    return Response.json({ error: 'Demo account not configured.' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return Response.json({ error: 'Demo login failed.' }, { status: 401 })
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
