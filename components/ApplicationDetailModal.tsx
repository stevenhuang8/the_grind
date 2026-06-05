'use client'

import { useEffect, useRef } from 'react'
import { Application, Stage, STAGE_LABELS } from '@/types'
import { useDocuments } from '@/hooks/useDocuments'

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
  application: Application
  onClose: () => void
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export default function ApplicationDetailModal({ application, onClose }: Props) {
  const { documents, loading: docsLoading, uploading, error, fetchDocuments, uploadDocument, deleteDocument } =
    useDocuments(application.id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadDocument(file)
    e.target.value = ''
  }

  const hostname = application.url ? safeHostname(application.url) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface border border-grind-border rounded-lg p-6 w-full max-w-md mx-4 z-10 max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0 pr-4">
            <h2 className="font-semibold text-foreground text-base leading-tight">{application.company}</h2>
            <p className="text-sm text-muted mt-0.5">{application.role}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-xs shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Info rows */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wide">Stage</span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: STAGE_COLORS[application.stage] }}
              />
              <span className="text-xs text-foreground">{STAGE_LABELS[application.stage]}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wide">Applied</span>
            <span className="text-xs text-foreground">{formatDate(application.applied_date)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wide">XP</span>
            <span className="text-xs text-gold font-mono">+{application.xp_awarded} XP</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wide">URL</span>
            {hostname ? (
              <a
                href={application.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-gold transition-colors"
              >
                ↗ {hostname}
              </a>
            ) : (
              <span className="text-xs text-muted/40">—</span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <span className="text-xs text-muted uppercase tracking-wide block mb-2">Notes</span>
          {application.notes ? (
            <p className="text-xs text-foreground/80 leading-relaxed bg-card rounded p-3 border border-grind-border whitespace-pre-wrap">
              {application.notes}
            </p>
          ) : (
            <p className="text-xs text-muted/40">No notes</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-grind-border mb-5" />

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted uppercase tracking-wide">Documents</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-gold hover:text-gold-dim transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : '+ Attach'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

          {docsLoading ? (
            <p className="text-xs text-muted/40">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="text-xs text-muted/40">No documents attached</p>
          ) : (
            <ul className="space-y-2">
              {documents.map(doc => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 bg-card border border-grind-border rounded px-3 py-2"
                >
                  <a
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground hover:text-gold transition-colors truncate"
                  >
                    {doc.file_name}
                    {doc.file_size && (
                      <span className="text-muted/60 ml-1.5">({formatBytes(doc.file_size)})</span>
                    )}
                  </a>
                  <button
                    onClick={() => deleteDocument(doc)}
                    className="text-muted hover:text-red-400 text-xs shrink-0 transition-colors"
                    aria-label="Delete document"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
