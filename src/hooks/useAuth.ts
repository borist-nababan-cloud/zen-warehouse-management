/**
 * Authentication Hooks
 *
 * These hooks use TanStack Query to manage authentication state.
 * They provide caching, loading states, and error handling out of the box.
 *
 * UPDATED: Now uses RoleId (1-9) system instead of text-based roles
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  getStoredUserRole,
  updatePassword,
} from '@/services/authService'
import type { LoginFormData, RoleId } from '@/types/database'

// Query keys for cache management
export const authQueryKeys = {
  user: ['auth', 'user'] as const,
  session: ['auth', 'session'] as const,
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to get the current authenticated user
 * Uses TanStack Query for caching and automatic refetching
 */
export function useAuthUser() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: authQueryKeys.user,
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  // Set up auth state listener
  // This ensures the UI updates when auth state changes
  useQuery({
    queryKey: authQueryKeys.session,
    queryFn: async () => {
      const unsubscribe = onAuthStateChange((_event, _session) => {
        // Invalidate user query on auth state change
        queryClient.invalidateQueries({ queryKey: authQueryKeys.user })
      })

      return unsubscribe
    },
  })

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isAuthenticated: !!query.data,
  }
}

/**
 * Hook for sign in mutation
 * Handles the login form submission
 * Returns special error code 'UNASSIGNED_USER' for unassigned users
 */
export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginFormData) => signIn(credentials),
    onSuccess: () => {
      // Invalidate user query to refetch after login
      queryClient.invalidateQueries({ queryKey: authQueryKeys.user })
    },
  })
}

/**
 * Hook for sign out mutation
 * Handles logout
 */
export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Clear all queries after logout
      queryClient.clear()
    },
  })
}

/**
 * Hook for password update mutation
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string) => updatePassword(password),
  })
}

/**
 * Hook to check if user has specific role (by RoleId)
 * @param allowedRoles - Array of role IDs that are allowed
 *
 * @example
 * const { hasRole } = useHasRoleById([1, 8]) // admin_holding or SUPERUSER
 */
export function useHasRoleById(allowedRoles: RoleId[]) {
  const { user, isLoading } = useAuthUser()

  return {
    hasRole: user ? allowedRoles.includes(user.user_role) : false,
    isLoading,
  }
}

/**
 * Hook to check if user can access specific menu
 * @param menu - Menu identifier (e.g., 'dashboard', 'inventory', 'finance')
 *
 * @example
 * const { canAccess } = useCanAccessMenu('finance')
 */
export function useCanAccessMenu(menu: string) {
  const { user, isLoading } = useAuthUser()

  // Get stored role from localStorage for immediate access
  const storedRole = getStoredUserRole()

  // SUPERUSER (8) can access everything
  if (user?.user_role === 8 || storedRole === 8) {
    return { canAccess: true, isLoading }
  }

  // UNASSIGNED (9) has no access
  if (user?.user_role === 9 || storedRole === 9) {
    return { canAccess: false, isLoading }
  }

  // Check menu permissions based on role
  const role = user?.user_role ?? storedRole

  const menuPermissions: Record<RoleId, string[]> = {
    1: ['dashboard', 'inventory', 'purchase-orders', 'finance', 'users'],
    2: ['dashboard', 'inventory', 'purchase-orders'],
    3: ['dashboard', 'laundry'],
    4: ['dashboard', 'laundry'],
    5: ['dashboard', 'finance'],
    6: ['dashboard', 'inventory'],
    7: ['dashboard', 'inventory', 'purchase-orders', 'sto', 'production', 'type'],
    8: ['*'],
    9: [],
    10: ['dashboard', 'finance', 'inventory', 'purchase-orders', 'sto', 'production', 'product', 'price-unit', 'supplier'],
  }

  const permissions = role ? menuPermissions[role] : []

  return {
    canAccess: permissions.includes('*') || permissions.includes(menu),
    isLoading,
  }
}

/**
 * Hook to get current user's role ID
 */
export function useUserRole() {
  const { user, isLoading } = useAuthUser()

  return {
    roleId: user?.user_role ?? getStoredUserRole() ?? null,
    isLoading,
  }
}

/**
 * Hook to check if user is SUPERUSER (role 8)
 */
export function useIsSuperuser() {
  const { user, isLoading } = useAuthUser()
  const storedRole = getStoredUserRole()

  return {
    isSuperuser: user?.user_role === 8 || storedRole === 8,
    isLoading,
  }
}

/**
 * Hook to get current user's kode_outlet
 */
export function useKodeOutlet() {
  const { user, isLoading } = useAuthUser()

  return {
    kodeOutlet: user?.kode_outlet ?? null,
    isLoading,
  }
}

/**
 * Hook to check if user is from Holding (can see all outlets)
 */
export function useIsHolding() {
  const { user, isLoading } = useAuthUser()
  const storedRole = getStoredUserRole()

  const isHoldingRole = user?.user_role === 1 || user?.user_role === 2 || storedRole === 1 || storedRole === 2
  const isSuperuser = user?.user_role === 8 || storedRole === 8
  const isHoldingOutlet = user?.kode_outlet === '111'

  return {
    isHolding: isSuperuser || isHoldingRole || isHoldingOutlet,
    isLoading,
  }
}
