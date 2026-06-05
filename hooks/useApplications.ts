import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Application, Stage, STAGE_XP } from '@/types'

type NewApplication = Omit<Application, 'id' | 'user_id' | 'xp_awarded' | 'created_at' | 'updated_at'>

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = useCallback(async () => {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
    setApplications(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  async function addApplication(input: NewApplication): Promise<Application | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('applications')
      .insert({
        ...input,
        user_id: user.id,
        xp_awarded: STAGE_XP[input.stage],
      })
      .select()
      .single()

    if (error || !data) return null
    setApplications(prev => [data, ...prev])
    return data
  }

  async function updateStage(id: string, stage: Stage): Promise<Application | null> {
    const { data, error } = await supabase
      .from('applications')
      .update({ stage, xp_awarded: STAGE_XP[stage] })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return null
    setApplications(prev => prev.map(a => a.id === id ? data : a))
    return data
  }

  async function deleteApplication(id: string): Promise<void> {
    await supabase.from('applications').delete().eq('id', id)
    setApplications(prev => prev.filter(a => a.id !== id))
  }

  return { applications, loading, addApplication, updateStage, deleteApplication }
}
