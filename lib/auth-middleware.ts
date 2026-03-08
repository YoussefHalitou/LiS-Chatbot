/**
 * Authentication Middleware for API Routes
 *
 * Verifies Supabase JWT tokens from the Authorization header.
 * Returns the authenticated user and their role from t_users.
 *
 * Usage in API routes:
 *   const { user, role, error } = await authenticateRequest(req)
 *   if (error) return error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

export interface AuthResult {
  user: {
    id: string
    email?: string
  } | null
  role: string | null
  accessToken: string | null
  error: NextResponse | null
}

/**
 * Authenticate an API request by verifying the Supabase JWT.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it with Supabase Auth, and looks up the user's role.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  // Extract token from Authorization header
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return {
      user: null,
      role: null,
      accessToken: null,
      error: NextResponse.json(
        { error: 'Nicht authentifiziert. Bitte melde dich an.' },
        { status: 401 }
      ),
    }
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Auth] Supabase URL or service role key not configured')
    return {
      user: null,
      role: null,
      accessToken: null,
      error: NextResponse.json(
        { error: 'Server-Konfigurationsfehler.' },
        { status: 500 }
      ),
    }
  }

  try {
    // Create a one-off admin client to verify the token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT and get the user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return {
        user: null,
        role: null,
        accessToken: null,
        error: NextResponse.json(
          { error: 'Ungültiges oder abgelaufenes Token. Bitte melde dich erneut an.' },
          { status: 401 }
        ),
      }
    }

    // Look up the user's role from t_users
    let role: string | null = null
    try {
      const { data: userData } = await supabaseAdmin
        .from('t_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      role = userData?.role ?? null
    } catch {
      // If t_users lookup fails, continue with null role
      // The user is still authenticated, just without RBAC info
      console.warn(`[Auth] Could not look up role for user ${user.id}`)
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      role,
      accessToken: token,
      error: null,
    }
  } catch (err) {
    console.error('[Auth] Token verification failed:', err)
    return {
      user: null,
      role: null,
      accessToken: null,
      error: NextResponse.json(
        { error: 'Authentifizierung fehlgeschlagen.' },
        { status: 401 }
      ),
    }
  }
}
