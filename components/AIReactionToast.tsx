'use client'

import { useEffect } from 'react'

interface Props {
  message: string
  onClose: () => void
}

export default function AIReactionToast({ message, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000)
    return () => clearTimeout(t)
  }, [message, onClose])

  return (
    <div className="fixed bottom-6 right-6 max-w-sm z-50">
      <div className="bg-surface border border-gold rounded-lg p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="text-lg leading-none mt-0.5 shrink-0">⚔️</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gold font-semibold uppercase tracking-widest mb-1.5">Grind</div>
            <p className="text-sm text-foreground leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-xs shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
