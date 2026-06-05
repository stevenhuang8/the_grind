'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import KanbanBoard from '@/components/KanbanBoard'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        setChecking(false)
      }
    })
  }, [router])

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted text-xs tracking-widest uppercase">Loading</div>
      </div>
    )
  }

  if (!user) return null

  return <KanbanBoard />
}
