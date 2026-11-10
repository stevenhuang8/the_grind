import { supabase } from '@/lib/supabase'

// The demo account is marked by app_metadata.demo (see supabase/demo-lock.sql).
// The database rejects its writes, so the UI keeps demo changes in local state.
export async function isDemoSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user.app_metadata?.demo === true
}
