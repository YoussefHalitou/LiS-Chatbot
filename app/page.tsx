'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Auth from '@/components/Auth'
import { getCurrentUser } from '@/lib/supabase-chat'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { user } = await getCurrentUser()
      setUser(user)
      setLoading(false)
    }
    checkAuth()

    // Listen for auth changes
    async function setupAuthListener() {
      const { supabase } = await import('@/lib/supabase')
      if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email)
          setUser(session?.user ?? null)
          if (session?.user) {
            setShowAuth(false) // Hide auth when user logs in
          }
        })

        return () => subscription.unsubscribe()
      }
    }
    const cleanup = setupAuthListener()

    return () => {
      cleanup.then(cleanupFn => cleanupFn?.())
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lädt...</p>
        </div>
      </div>
    )
  }

  // Show auth if user wants to login, otherwise show chat interface
  // Chat interface works with both authenticated (Supabase) and unauthenticated (localStorage) users
  return (
    <div className="min-h-screen">
      {showAuth ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-md">
            <Auth onAuthSuccess={async () => {
              // Update user state after successful auth
              const { user } = await getCurrentUser()
              setUser(user)
              setShowAuth(false)
            }} />
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAuth(false)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Zurück zum Chat
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ChatInterface
          user={user}
          onLoginClick={() => setShowAuth(true)}
          onLogout={async () => {
            const { supabase } = await import('@/lib/supabase')
            if (supabase) {
              await supabase.auth.signOut()
              setUser(null)
            }
          }}
        />
      )}
    </div>
  )
}

