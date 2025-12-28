/**
 * ProtectedRoute Component
 *
 * This component wraps routes that require authentication and/or specific roles.
 * It checks:
 * 1. If the user is authenticated
 * 2. If the user has the required role (by RoleId 1-9)
 * 3. Redirects unauthorized users to the login page
 *
 * UPDATED: Now uses RoleId (1-9) system
 */

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import type { RoleId } from '@/types/database'

// ============================================
// TYPES
// ============================================

interface ProtectedRouteProps {
  children: ReactNode
  /** Role IDs that are allowed to access this route. If undefined, any authenticated user can access. */
  allowedRoles?: RoleId[]
  /** Redirect path for unauthorized users. Defaults to '/login' */
  redirectTo?: string
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Protected Route Component
 *
 * Usage:
 * ```tsx
 * // Any authenticated user
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // Only specific roles (by RoleId)
 * <ProtectedRoute allowedRoles={[1, 5]}>  // admin_holding or finance
 *   <FinancePage />
 * </ProtectedRoute>
 *
 * // SUPERUSER and admin only
 * <ProtectedRoute allowedRoles={[1, 8]}>
 *   <AdminPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuthUser()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // Check role-based access
  if (allowedRoles && user) {
    // SUPERUSER (8) bypasses all role checks
    if (user.user_role === 8) {
      return <>{children}</>
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(user.user_role)) {
      // User is authenticated but doesn't have the required role
      // Redirect to unauthorized page
      return <Navigate to="/unauthorized" replace />
    }
  }

  // User is authenticated and has the required role
  return <>{children}</>
}

/**
 * Wrapper for public routes that should redirect authenticated users
 * e.g., Login page should redirect to dashboard if user is already logged in
 */
interface PublicRouteProps {
  children: ReactNode
  redirectTo?: string
}

export function PublicRoute({
  children,
  redirectTo = '/dashboard',
}: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuthUser()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
