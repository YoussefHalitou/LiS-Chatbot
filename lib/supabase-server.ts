/**
 * Per-Request Supabase Client (Server-Side)
 *
 * Creates a Supabase client scoped to the authenticated user's JWT.
 * This client respects Row-Level Security (RLS) policies, ensuring
 * users can only access data they are authorised to see.
 *
 * Use this for READ operations in API routes instead of supabaseAdmin.
 * supabaseAdmin bypasses RLS and should only be used for write operations
 * that are gated by RBAC checks.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

/**
 * Create a Supabase client that is scoped to the given user's access token.
 *
 * Queries made through this client will be subject to RLS policies,
 * so the user can only read/write rows they are permitted to access.
 */
export function createServerSupabaseClient(accessToken: string): SupabaseClient | null {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[SupabaseServer] Missing Supabase URL or anon key')
        return null
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    })
}
