'use client'

import { useDraggable } from '@dnd-kit/core'
import { Application, STAGE_XP } from '@/types'
import { daysAgo } from '@/lib/utils'

interface Props {
  application: Application
  onDelete: (id: string) => void
  onSelect?: (application: Application) => void
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export default function ApplicationCard({ application, onDelete, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const days = daysAgo(application.applied_date)
  const xp = STAGE_XP[application.stage]
  const hostname = application.url ? safeHostname(application.url) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect?.(application)}
      className={[
        'bg-card border border-grind-border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none transition-all',
        isDragging ? 'opacity-40' : 'hover:border-[#3a3a3a]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{application.company}</div>
          <div className="text-xs text-muted truncate mt-0.5">{application.role}</div>
        </div>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(application.id) }}
          className="text-muted hover:text-red-400 text-xs shrink-0 mt-0.5 transition-colors"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {days === 0 ? 'Today' : days === 1 ? '1d ago' : `${days}d ago`}
        </span>
        {xp > 0 && (
          <span className="text-xs text-gold font-mono">+{xp} XP</span>
        )}
      </div>

      {hostname && (
        <a
          href={application.url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          className="text-xs text-muted hover:text-gold block mt-1.5 truncate transition-colors"
        >
          ↗ {hostname}
        </a>
      )}
    </div>
  )
}
