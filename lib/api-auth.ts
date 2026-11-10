import { createClient, type User } from '@supabase/supabase-js'

// Resolves the Supabase user from an `Authorization: Bearer <token>` header.
export async function getRequestUser(req: Request): Promise<User | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return null

  // Fresh client per request to avoid session bleed
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}
