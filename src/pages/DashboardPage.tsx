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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Package,
  FileText,
  DollarSign,
  Shirt,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react'
import { ROLE_LABELS, type RoleId } from '@/types/database'
import { useEffect } from 'react'
import { useSignOut } from '@/hooks/useAuth'
import { toast } from 'sonner'

// ============================================
// TYPES
// ============================================

interface ModuleCard {
  title: string
  description: string
  icon: React.ElementType
  path: string
  roleIds: RoleId[]
  color: string
}

// ============================================
// MODULE CONFIGURATION
// ============================================

/**
 * Module cards with their allowed Role IDs
 * Role ID mapping:
 * 1  - admin_holding
 * 2  - staff_holding
 * 3  - laundry_admin
 * 4  - laundry_staff
 * 5  - finance
 * 6  - outlet_admin
 * 7  - warehouse_staff
 * 8  - SUPERUSER (has all access)
 * 9  - UNASSIGNED (no access)
 */
const moduleCards: ModuleCard[] = [
  {
    title: 'Inventory Management',
    description: 'Manage products and track inventory movements',
    icon: Package,
    path: '/inventory',
    roleIds: [1, 2, 6, 7, 8],  // admin_holding, staff_holding, outlet_admin, warehouse_staff, superuser
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Purchase Orders',
    description: 'Create and manage purchase orders',
    icon: FileText,
    path: '/purchase-orders',
    roleIds: [1, 2, 7, 8],  // admin_holding, staff_holding, warehouse_staff, superuser
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    title: 'Finance',
    description: 'Invoices, payments, and financial reports',
    icon: DollarSign,
    path: '/finance',
    roleIds: [1, 5, 8],  // admin_holding, finance, superuser
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: 'Laundry Operations',
    description: 'Manage laundry workflows and tracking',
    icon: Shirt,
    path: '/laundry',
    roleIds: [3, 4, 8],  // laundry_admin, laundry_staff, superuser
    color: 'bg-cyan-500/10 text-cyan-500',
  },
  {
    title: 'User Management',
    description: 'Manage users and assign roles',
    icon: Users,
    path: '/users',
    roleIds: [1, 8],  // admin_holding, superuser
    color: 'bg-orange-500/10 text-orange-500',
  },
]

// ============================================
// COMPONENTS
// ============================================

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  color: string
}

function StatCard({ title, value, icon: Icon, trend = 'neutral', color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend !== 'neutral' && (
          <div className="mt-4 flex items-center gap-1 text-xs">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {trend === 'up' ? '+12%' : '-5%'}
            </span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

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

function ModuleGrid() {
  const { user } = useAuthUser()
  const navigate = useNavigate()

  // Filter modules based on user role
  const availableModules = user
    ? moduleCards.filter((module) => {
        // SUPERUSER (8) sees everything
        if (user.user_role === 8) return true
        // Check if user's role is in the allowed roles for this module
        return module.roleIds.includes(user.user_role)
      })
    : []

  if (availableModules.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Modules Available</h3>
          <p className="text-muted-foreground">
            There are no modules available for your role. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {availableModules.map((module) => {
        const Icon = module.icon
        return (
          <Card
            key={module.path}
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            onClick={() => navigate(module.path)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${module.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-primary">→</span>
                </div>
              </div>
              <CardTitle className="mt-4">{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
          </Card>
        )
      })}
    </div>
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
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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

        {/* Stats Section - Placeholder for now */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Products"
              value="124"
              icon={Package}
              trend="up"
              color="bg-blue-500/10 text-blue-500"
            />
            <StatCard
              title="Active Orders"
              value="18"
              icon={FileText}
              trend="up"
              color="bg-purple-500/10 text-purple-500"
            />
            <StatCard
              title="Pending Tasks"
              value="5"
              icon={AlertCircle}
              color="bg-orange-500/10 text-orange-500"
            />
            <StatCard
              title="Revenue (MTD)"
              value="$12,450"
              icon={DollarSign}
              trend="up"
              color="bg-green-500/10 text-green-500"
            />
          </div>
        </div>

        {/* Available Modules */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Modules</h2>
          <ModuleGrid />
        </div>
      </div>
    </DashboardLayout>
  )
}
