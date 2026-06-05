'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above first.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setMessage('Password reset email sent. Check your inbox.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-[0.15em] uppercase text-foreground mb-2">
            The Grind
          </h1>
          <p className="text-muted text-sm">
            Your job search is a campaign.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-surface border border-grind-border rounded text-foreground placeholder-muted text-sm focus:outline-none focus:border-gold transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-surface border border-grind-border rounded text-foreground placeholder-muted text-sm focus:outline-none focus:border-gold transition-colors"
          />

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-muted hover:text-gold transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-gold">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-black font-semibold rounded text-sm tracking-wide hover:bg-gold-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? '...' : mode === 'login' ? 'Enter the Grind' : 'Start the Campaign'}
          </button>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                className="text-gold hover:underline"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already grinding?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className="text-gold hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
