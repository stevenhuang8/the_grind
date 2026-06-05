'use client'

import { useState } from 'react'
import { Stage, STAGE_LABELS } from '@/types'

export interface ApplicationFormData {
  company: string
  role: string
  url: string
  notes: string
  applied_date: string
  stage: Stage
}

interface Props {
  onAdd: (data: ApplicationFormData) => void
  onClose: () => void
}

export default function AddApplicationModal({ onAdd, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<ApplicationFormData>({
    company: '',
    role: '',
    url: '',
    notes: '',
    applied_date: today,
    stage: 'applied',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface border border-grind-border rounded-lg p-6 w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
            New Application
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xs transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">
                Company *
              </label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                required
                placeholder="Acme Corp"
                className="w-full px-3 py-2 bg-card border border-grind-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">
                Role *
              </label>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                placeholder="Software Engineer"
                className="w-full px-3 py-2 bg-card border border-grind-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">
                Stage
              </label>
              <select
                name="stage"
                value={form.stage}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-card border border-grind-border rounded text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
              >
                {(Object.entries(STAGE_LABELS) as [Stage, string][]).map(([val, label]) => (
                  <option key={val} value={val} className="bg-card">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">
                Date Applied
              </label>
              <input
                type="date"
                name="applied_date"
                value={form.applied_date}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-card border border-grind-border rounded text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">
              Job URL
            </label>
            <input
              name="url"
              value={form.url}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-card border border-grind-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Referral from John, async-first culture..."
              className="w-full px-3 py-2 bg-card border border-grind-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:border-gold transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-grind-border text-muted rounded text-sm hover:text-foreground hover:border-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-gold text-black rounded text-sm font-semibold hover:bg-gold-dim transition-colors"
            >
              Add Application
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
