'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { JobDocument } from '@/types'

export type DocumentWithUrl = JobDocument & { signedUrl?: string }

export function useDocuments(applicationId: string) {
  const [documents, setDocuments] = useState<DocumentWithUrl[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })

    if (!data) {
      setLoading(false)
      return
    }

    const withUrls = await Promise.all(
      data.map(async (doc: JobDocument) => {
        const { data: urlData } = await supabase.storage
          .from('application-documents')
          .createSignedUrl(doc.storage_path, 3600)
        return { ...doc, signedUrl: urlData?.signedUrl }
      })
    )

    setDocuments(withUrls)
    setLoading(false)
  }, [applicationId])

  async function uploadDocument(file: File) {
    setUploading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Not authenticated')
      setUploading(false)
      return
    }

    const storagePath = `${userData.user.id}/${applicationId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('application-documents')
      .upload(storagePath, file)

    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('documents').insert({
      application_id: applicationId,
      user_id: userData.user.id,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
    })

    if (dbError) {
      setError('Failed to save document.')
      await supabase.storage.from('application-documents').remove([storagePath])
      setUploading(false)
      return
    }

    setUploading(false)
    await fetchDocuments()
  }

  async function deleteDocument(doc: JobDocument) {
    await supabase.storage.from('application-documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  return { documents, loading, uploading, error, fetchDocuments, uploadDocument, deleteDocument }
}
