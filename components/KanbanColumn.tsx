'use client'

import { useDroppable } from '@dnd-kit/core'
import { Stage, STAGE_LABELS, Application } from '@/types'
import ApplicationCard from './ApplicationCard'

const STAGE_COLORS: Record<Stage, string> = {
  applied:     '#3d5a80',
  in_review:   '#9b6a00',
  interview:   '#1a6b3a',
  final_round: '#6b1a8b',
  offer:       '#c9a84c',
  rejected:    '#8b1a1a',
  ghosted:     '#444444',
}

interface Props {
  stage: Stage
  applications: Application[]
  onDelete: (id: string) => void
}

export default function KanbanColumn({ stage, applications, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col w-60 shrink-0">
      <div
        className="px-3 py-2 mb-2 border-t-2"
        style={{ borderColor: STAGE_COLORS[stage] }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            {STAGE_LABELS[stage]}
          </span>
          <span className="text-xs text-muted font-mono">{applications.length}</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex-1 min-h-40 rounded p-2 flex flex-col gap-2 transition-colors',
          isOver
            ? 'bg-surface border border-dashed border-gold/30'
            : 'bg-surface/20',
        ].join(' ')}
      >
        {applications.map(app => (
          <ApplicationCard key={app.id} application={app} onDelete={onDelete} />
        ))}
        {applications.length === 0 && (
          <div className="flex items-center justify-center flex-1 min-h-20 text-xs text-muted/40">
            drop here
          </div>
        )}
      </div>
    </div>
  )
}
