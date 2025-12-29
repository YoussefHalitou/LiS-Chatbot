'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Auth from '@/components/Auth'
import { getCurrentUser } from '@/lib/supabase-chat'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null)
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

  // Show auth if not logged in, otherwise show chat interface
  // For now, we allow both authenticated and unauthenticated users
  // Unauthenticated users will use localStorage as fallback
  return <ChatInterface />
}

