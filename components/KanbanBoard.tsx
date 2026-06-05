'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import { Stage, Application } from '@/types'
import { useApplications } from '@/hooks/useApplications'
import { useXP } from '@/hooks/useXP'
import { supabase } from '@/lib/supabase'
import XPBar from './XPBar'
import StatsPanel from './StatsPanel'
import KanbanColumn from './KanbanColumn'
import ApplicationCard from './ApplicationCard'
import AddApplicationModal, { ApplicationFormData } from './AddApplicationModal'
import AIReactionToast from './AIReactionToast'

const STAGE_ORDER: Stage[] = [
  'applied',
  'in_review',
  'interview',
  'final_round',
  'offer',
  'rejected',
  'ghosted',
]

async function fetchAIReaction(
  type: string,
  company: string,
  role: string,
  stage: Stage
): Promise<string> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, company, role, stage }),
    })
    if (!res.ok) return 'Keep grinding.'
    const data = await res.json()
    return data.text ?? 'Keep grinding.'
  } catch {
    return 'Keep grinding.'
  }
}

export default function KanbanBoard() {
  const { applications, loading, addApplication, updateStage, deleteApplication } =
    useApplications()
  const stats = useXP(applications)

  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find(a => a.id === event.active.id)
    setActiveApp(app ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null)
    const { active, over } = event
    if (!over) return

    const app = applications.find(a => a.id === active.id)
    const newStage = over.id as Stage
    if (!app || app.stage === newStage) return

    await updateStage(app.id, newStage)
    const reaction = await fetchAIReaction('reaction', app.company, app.role, newStage)
    setToast(reaction)
  }

  async function handleAdd(formData: ApplicationFormData) {
    setModalOpen(false)
    const app = await addApplication({
      company: formData.company,
      role: formData.role,
      url: formData.url || undefined,
      notes: formData.notes || undefined,
      applied_date: formData.applied_date,
      stage: formData.stage,
    })
    if (app) {
      const reaction = await fetchAIReaction('reaction', app.company, app.role, app.stage)
      setToast(reaction)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const appsByStage = STAGE_ORDER.reduce<Record<Stage, Application[]>>(
    (acc, stage) => {
      acc[stage] = applications.filter(a => a.stage === stage)
      return acc
    },
    {} as Record<Stage, Application[]>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-grind-border shrink-0">
        <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-gold">
          The Grind
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-1.5 bg-gold text-black text-xs font-semibold rounded tracking-wide hover:bg-gold-dim transition-colors"
          >
            + Application
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <XPBar stats={stats} />
      <StatsPanel stats={stats} />

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <div className="flex gap-4 min-w-max h-full pb-4">
            {STAGE_ORDER.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                applications={appsByStage[stage]}
                onDelete={deleteApplication}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeApp ? (
            <div className="rotate-1 shadow-2xl opacity-90">
              <ApplicationCard application={activeApp} onDelete={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen && (
        <AddApplicationModal onAdd={handleAdd} onClose={() => setModalOpen(false)} />
      )}

      {toast && (
        <AIReactionToast message={toast} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
