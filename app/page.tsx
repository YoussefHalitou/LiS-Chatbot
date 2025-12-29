'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Auth from '@/components/Auth'
import { getCurrentUser } from '@/lib/supabase-chat'

export default function Home() {
  const [user, setUser] = useState<any>(null)
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
        <div className="relative">
          {/* Auth button in top right corner */}
          <div className="absolute top-4 right-4 z-50">
            {user ? (
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user.email}
                </span>
                <button
                  onClick={async () => {
                    const { supabase } = await import('@/lib/supabase')
                    if (supabase) {
                      await supabase.auth.signOut()
                      setUser(null)
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Abmelden
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
              >
                Anmelden
              </button>
            )}
          </div>
          <ChatInterface />
        </div>
      )}
    </div>
  )
}

