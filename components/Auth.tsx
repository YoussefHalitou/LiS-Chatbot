'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthProps {
  onAuthSuccess?: () => void
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
    
    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user && onAuthSuccess) {
          onAuthSuccess()
        }
      })

      return () => subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAuthSuccess]) // checkUser is stable, doesn't need to be in deps

  async function checkUser() {
    if (!supabase) return
    
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user && onAuthSuccess) {
      onAuthSuccess()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!supabase) {
      setError('Supabase client not initialized')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        // Sign up directly with Supabase client
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })

        if (error) {
          setError(error.message)
        } else if (data.user && !data.session) {
          // Email confirmation required
          setError(null)
          alert('Registrierung erfolgreich! Bitte prüfe deine E-Mails, um dein Konto zu bestätigen.')
        } else if (data.user && data.session) {
          // User is logged in immediately (email confirmation disabled)
          setUser(data.user)
          if (onAuthSuccess) {
            onAuthSuccess()
          }
        }
      } else {
        // Sign in directly with Supabase client
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else if (data.user) {
          setUser(data.user)
          if (onAuthSuccess) {
            onAuthSuccess()
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Angemeldet als: <span className="font-medium">{user.email}</span>
          </p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Abmelden
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isSignUp ? 'Registrieren' : 'Anmelden'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Lädt...' : isSignUp ? 'Registrieren' : 'Anmelden'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
          }}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          {isSignUp
            ? 'Bereits ein Konto? Anmelden'
            : 'Noch kein Konto? Registrieren'}
        </button>
      </div>
    </div>
  )
}

