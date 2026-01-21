/**
 * Dashboard Page
 *
 * Main dashboard with role-based modules overview.
 * Displays user info and available modules based on role (RoleId 1-9).
 *
 * UPDATED: Now uses RoleId (1-9) system
 */

import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
} from 'lucide-react'
import { ROLE_LABELS, type RoleId } from '@/types/database'
import { useEffect } from 'react'
import { useSignOut } from '@/hooks/useAuth'
import { toast } from 'sonner'



// ============================================
// COMPONENTS
// ============================================



interface WelcomeCardProps {
  userRole: RoleId
  outletName?: string
  kodeOutlet?: string
}

function WelcomeCard({ userRole, outletName, kodeOutlet }: WelcomeCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl">
          Welcome back! 👋
        </CardTitle>
        <CardDescription className="text-base">
          You are logged in as <strong>{ROLE_LABELS[userRole]}</strong>
          {outletName && (
            <>
              {' '}at <strong>{outletName}</strong>
              {kodeOutlet && ` (${kodeOutlet})`}
            </>
          )}
          {!outletName && kodeOutlet && (
            <>
              {' '}at outlet <strong>{kodeOutlet}</strong>
            </>
          )}
          {userRole === 8 && (
            <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
              SUPERUSER
            </span>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}



// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export function DashboardPage() {
  const { user, isLoading } = useAuthUser()
  const signOut = useSignOut()
  const navigate = useNavigate()

  // Check if user is unassigned and redirect
  useEffect(() => {
    if (!isLoading && !user) {
      // No user data at all - redirect to login
      navigate('/login', { replace: true })
      return
    }

    if (!isLoading && user) {
      // User exists, check if they have a valid profile
      // If user_role is undefined or 9 (UNASSIGNED), they should be blocked
      if (!user.user_role || user.user_role === 9) {
        // User is unassigned - logout and show message
        const performLogout = async () => {
          await signOut.mutateAsync()
          toast.error('You are not assigned to use this application. Contact Administrator.', {
            duration: 5000,
            id: 'unassigned-user', // Prevent duplicate toasts
          })
          navigate('/login', { replace: true })
        }
        performLogout()
      }
    }
  }, [user, isLoading, signOut, navigate])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Don't render if user is unassigned (they will be redirected by useEffect)
  if (!user || !user.user_role || user.user_role === 9) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle text-muted-foreground"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You are not assigned to use this application. Contact Administrator.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        {user && (
          <WelcomeCard
            userRole={user.user_role}
            outletName={user.outlet?.name_outlet}
            kodeOutlet={user.kode_outlet ?? undefined}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
