/**
 * Authentication Service Layer
 *
 * This service handles all authentication-related operations.
 * It abstracts the Supabase client calls and provides a clean API for the hooks.
 *
 * IMPORTANT: Do not call Supabase directly from components. Use this service.
 *
 * NEW LOGIN FLOW (with users_profile table):
 * 1. Sign in with email/password
 * 2. Check users_profile table
 * 3. If not exists: Insert with role=9 (UNASSIGNED) → Force logout
 * 4. If exists and role=9: Force logout with "Contact Admin" message
 * 5. If exists and role=1-8: Store kode_outlet in localStorage, proceed
 */

import { supabase } from '@/lib/supabase'
import type {
  AuthUser,
  UserProfile,
  LoginFormData,
  UpdateProfileFormData,
  ApiResponse,
  RoleId,
} from '@/types/database'

// ============================================
// LOCAL STORAGE KEYS
// ============================================

const STORAGE_KEY_KODE_OUTLET = 'kode_outlet'
const STORAGE_KEY_USER_ROLE = 'user_role'
const STORAGE_KEY_USER_EMAIL = 'user_email'

// ============================================
// ERROR TYPES
// ============================================

export class UnassignedUserError extends Error {
  constructor() {
    super('You are not assigned to use this application. Contact Administrator.')
    this.name = 'UnassignedUserError'
  }
}

export class UnauthorizedRoleError extends Error {
  constructor(message = 'Your role is not authorized to access Warehouse Management. Please use the Zen Internal App.') {
    super(message)
    this.name = 'UnauthorizedRoleError'
  }
}

// ============================================
// AUTHENTICATION OPERATIONS
// ============================================

/**
 * Sign in with Google OAuth 2.0
 * For Superuser (Role 8) and Outlet Admin (Role 6)
 * @param redirectTo - Optional redirect URL
 */
export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const targetUrl = redirectTo || `${window.location.origin}/auth/callback`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) throw error
}

/**
 * Sign in with email and password
 * NEW FLOW: Checks users_profile table and handles unassigned users
 *
 * @param credentials - Login credentials (email, password)
 * @returns ApiResponse with session data or error
 * @throws {UnassignedUserError} If user is not assigned (role=9)
 */
export async function signIn(
  credentials: LoginFormData
): Promise<ApiResponse<{ user: AuthUser }>> {
  try {
    // Step 1: Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) throw error

    // Step 2: Check users_profile table
    const userProfileResult = await getUserProfile(data.user.id)

    // Step 3: If profile doesn't exist or has error, create with role=9 (UNASSIGNED)
    if (!userProfileResult.data || userProfileResult.error) {
      const createResult = await createUnassignedProfile(data.user.id, data.user.email || '')

      // If profile creation also failed, rethrow the error
      if (!createResult.isSuccess || createResult.error) {
        throw new Error(createResult.error || 'Failed to create user profile')
      }

      // Force logout
      await supabase.auth.signOut()

      throw new UnassignedUserError()
    }

    const profile = userProfileResult.data

    // Step 4: Check if user is UNASSIGNED (role=9) or MEMBER (role=17)
    // Both Role 9 and Role 17 cannot login to WHM
    if (profile.user_role === 9) {
      // Force logout
      await supabase.auth.signOut()
      throw new UnassignedUserError()
    }

    if (profile.user_role === 17) {
      // Force logout: Member role cannot login to WHM
      await supabase.auth.signOut()
      throw new UnauthorizedRoleError('Role Member (17) is not authorized to access Warehouse Management.')
    }

    // Step 5: Store in localStorage for future use
    localStorage.setItem(STORAGE_KEY_KODE_OUTLET, profile.kode_outlet || '')
    localStorage.setItem(STORAGE_KEY_USER_ROLE, profile.user_role.toString())
    localStorage.setItem(STORAGE_KEY_USER_EMAIL, profile.email || '')

    // Step 6: Fetch outlet data if kode_outlet exists
    let outlet = null
    if (profile.kode_outlet) {
      const outletResult = await getOutletByCode(profile.kode_outlet)
      outlet = outletResult.data
    }

    return {
      data: {
        user: {
          id: profile.uid,
          email: profile.email,
          user_role: profile.user_role,
          kode_outlet: profile.kode_outlet,
          profile: profile,
          outlet: outlet,
        },
      },
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    if (error instanceof UnassignedUserError) {
      return {
        data: null,
        error: 'UNASSIGNED_USER', // Special error code for frontend handling
        isSuccess: false,
      }
    }

    if (error instanceof UnauthorizedRoleError) {
      return {
        data: null,
        error: error.message || 'UNAUTHORIZED_ROLE',
        isSuccess: false,
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to sign in',
      isSuccess: false,
    }
  }
}

/**
 * Sign out the current user and clear localStorage
 * @returns ApiResponse indicating success or failure
 */
export async function signOut(): Promise<ApiResponse<void>> {
  try {
    // 1. Clear localStorage immediately
    localStorage.removeItem(STORAGE_KEY_KODE_OUTLET)
    localStorage.removeItem(STORAGE_KEY_USER_ROLE)
    localStorage.removeItem(STORAGE_KEY_USER_EMAIL)

    // 2. Clear any other app-specific storage if needed
    localStorage.clear() // Optional: clear everything to be safe, or stick to specific keys

    // 3. Attempt Supabase Sign Out (Best Effort)
    // We don't want to throw here if it fails (e.g., 403 Forbidden because already invalid)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.warn('Supabase signOut warning (handled):', error.message)
    }

    return {
      data: null,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    console.error('SignOut logic error:', error)
    // Even if something crashes, we consider logout successful for the UI
    return {
      data: null,
      error: null, 
      isSuccess: true,
    }
  }
}

/**
 * Update user password
 * @param password - New password
 * @returns ApiResponse indicating success or failure
 */
export async function updatePassword(password: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.auth.updateUser({ password })

    if (error) throw error

    return {
      data: null,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update password',
      isSuccess: false,
    }
  }
}

/**
 * Get the current session
 * @returns Current session or null
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
    return null
  }

  return data.session
}

/**
 * Get the current authenticated user from session
 * @returns AuthUser or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return null
    }

    const profile = await getUserProfile(session.user.id)

    if (!profile.data) {
      return null
    }

    // Check if user is unassigned (role 9) or member (role 17)
    // WHM blocks role 9 and 17 from logging in or maintaining session
    if (profile.data.user_role === 9 || profile.data.user_role === 17) {
      // Sign out unauthorized role
      await signOut()
      return null
    }

    // Synchronize localStorage with active session (critical for OAuth redirects)
    localStorage.setItem(STORAGE_KEY_KODE_OUTLET, profile.data.kode_outlet || '')
    localStorage.setItem(STORAGE_KEY_USER_ROLE, profile.data.user_role.toString())
    localStorage.setItem(STORAGE_KEY_USER_EMAIL, profile.data.email || session.user.email || '')

    let outlet = null
    if (profile.data.kode_outlet) {
      const outletResult = await getOutletByCode(profile.data.kode_outlet)
      outlet = outletResult.data
    }

    const provider = session.user.app_metadata?.provider ||
      (session.user.identities?.some((id) => id.provider === 'google') ? 'google' : 'email')

    return {
      id: profile.data.uid,
      email: profile.data.email,
      user_role: profile.data.user_role,
      kode_outlet: profile.data.kode_outlet,
      provider: provider,
      app_metadata: session.user.app_metadata,
      profile: profile.data,
      outlet: outlet,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// ============================================
// USER PROFILE OPERATIONS (New Schema)
// ============================================

/**
 * Get user profile from users_profile table
 * @param userId - User ID from auth.users
 * @returns UserProfile data
 */
export async function getUserProfile(
  userId: string
): Promise<ApiResponse<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('uid', userId)
      .maybeSingle()  // Use maybeSingle() instead of single() to return null instead of error when no rows

    if (error) throw error

    // data will be null if no profile exists (which is expected for new users)
    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get user profile',
      isSuccess: false,
    }
  }
}

/**
 * Create an unassigned user profile (role=9)
 * This is called when a user logs in but has no profile
 * Uses RPC function with SECURITY DEFINER to bypass RLS
 * @param userId - User ID from auth.users
 * @param email - User email
 * @returns Created profile
 */
async function createUnassignedProfile(
  userId: string,
  email: string
): Promise<ApiResponse<UserProfile>> {
  try {
    // Use RPC function instead of direct insert to bypass RLS
    const { data, error } = await supabase
      .rpc('create_user_profile', {
        p_uid: userId,
        p_user_role: 9,
        p_email: email,
        p_kode_outlet: null,
      })
      .single()

    if (error) throw error

    return {
      data: data as UserProfile | null,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create profile',
      isSuccess: false,
    }
  }
}

// ============================================
// OUTLET OPERATIONS
// ============================================

/**
 * Get outlet by kode_outlet
 * @param kodeOutlet - Outlet code
 * @returns Outlet data
 */
export async function getOutletByCode(kodeOutlet: string) {
  try {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('*')
      .eq('kode_outlet', kodeOutlet)
      .maybeSingle()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get outlet',
      isSuccess: false,
    }
  }
}

/**
 * Get all outlets
 * @returns List of all outlets
 */
export async function getAllOutlets() {
  try {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('*')
      .order('name_outlet', { ascending: true })

    if (error) throw error

    return {
      data: data || [],
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get outlets',
      isSuccess: false,
    }
  }
}

// ============================================
// LEGACY PROFILE OPERATIONS (to be deprecated)
// ============================================

/**
 * Get user profile by ID with location data (LEGACY)
 * @deprecated Use getUserProfile instead
 * @param userId - User ID from auth.users
 * @returns Profile with location data
 */
export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        *,
        location:locations(*)
      `
      )
      .eq('id', userId)
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get profile',
      isSuccess: false,
    }
  }
}

/**
 * Update user profile (LEGACY)
 * @deprecated Update to use new schema when needed
 * @param userId - User ID
 * @param updates - Fields to update
 * @returns Updated profile
 */
export async function updateProfile(
  userId: string,
  updates: UpdateProfileFormData
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(
        `
        *,
        location:locations(*)
      `
      )
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update profile',
      isSuccess: false,
    }
  }
}

// ============================================
// SESSION STATE LISTENER
// ============================================

/**
 * Subscribe to auth state changes
 * @param callback - Function to call on auth state change
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(_event, session)
  })

  return () => subscription.unsubscribe()
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

/**
 * Get stored kode_outlet from localStorage
 */
export function getStoredKodeOutlet(): string | null {
  return localStorage.getItem(STORAGE_KEY_KODE_OUTLET)
}

/**
 * Get stored user_role from localStorage
 */
export function getStoredUserRole(): RoleId | null {
  const roleStr = localStorage.getItem(STORAGE_KEY_USER_ROLE)
  if (roleStr === null) return null
  return parseInt(roleStr) as RoleId
}

/**
 * Get stored user email from localStorage
 */
export function getStoredUserEmail(): string | null {
  return localStorage.getItem(STORAGE_KEY_USER_EMAIL)
}

/**
 * Check if current user is SUPERUSER or WEB_ADMIN
 */
export function isCurrentUserSuperuser(): boolean {
  const role = getStoredUserRole()
  return role === 8 || role === 18
}

/**
 * Check if current user is Holding / Global (can see all outlets)
 */
export function isCurrentUserHolding(): boolean {
  const role = getStoredUserRole()
  return role === 8 || role === 18
}
