/**
 * API Route for Authentication
 * Handles user authentication with Supabase Auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not initialized' },
        { status: 500 }
      )
    }

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json(
        { user: null, error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json({ user, error: null })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not initialized' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { action, email, password } = body

    if (!action || !email || !password) {
      return NextResponse.json(
        { error: 'action, email, and password are required' },
        { status: 400 }
      )
    }

    if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${req.nextUrl.origin}/`,
        },
      })

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      // If email confirmation is disabled, session will be available immediately
      // If email confirmation is enabled, session will be null until email is confirmed
      if (data.user && data.session) {
        // Email confirmation is disabled - user is logged in immediately
        return NextResponse.json({ 
          user: data.user, 
          error: null,
          session: data.session
        })
      } else if (data.user && !data.session) {
        // Email confirmation is enabled - user needs to confirm email
        return NextResponse.json({ 
          user: data.user, 
          error: null,
          message: 'Registrierung erfolgreich! Bitte prüfe deine E-Mails, um dein Konto zu bestätigen.',
          requiresConfirmation: true
        })
      }

      return NextResponse.json({ user: data.user, error: null })
    } else if (action === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }

      return NextResponse.json({ user: data.user, error: null })
    } else if (action === 'signout') {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, error: null })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use signup, signin, or signout' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in auth action:', error)
    return NextResponse.json(
      { error: 'Failed to process auth action' },
      { status: 500 }
    )
  }
}

