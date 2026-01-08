/**
 * Sidebar Navigation Component
 *
 * Collapsible sidebar with role-based menu items.
 * Shows different navigation options based on user's role (RoleId 1-9).
 *
 * UPDATED: Now uses RoleId (1-9) system
 * UPDATED: Added Master Data group with Product, Price, Inventory submenus
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  Warehouse,
  Package,
  FileText,
  DollarSign,
  Shirt,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  ChevronUp,
  Tag,
  Boxes,
  Layers,
  TrendingUp,
  Activity,
  Clock,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, type RoleId } from '@/types/database'
import { useSignOut } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// ============================================
// TYPES
// ============================================

interface NavItem {
  title: string
  path?: string
  icon: React.ElementType
  roleIds: RoleId[]  // Changed from 'roles' to 'roleIds'
  badge?: string
  children?: NavItem[]  // For nested menu items
  defaultOpen?: boolean // For accordion groups
}

interface NavGroup {
  title: string
  icon: React.ElementType
  roleIds: RoleId[]
  defaultOpen?: boolean
  children: NavItem[]
}

// ============================================
// NAVIGATION CONFIGURATION
// ============================================

/**
 * Menu items with their allowed Role IDs
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
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: Warehouse,
    roleIds: [1, 2, 3, 4, 5, 6, 7, 8],  // All roles except unassigned
  },
  {
    title: 'Inventory',
    path: '/inventory',
    icon: Package,
    roleIds: [1, 2, 6, 7, 8],  // admin_holding, staff_holding, outlet_admin, warehouse_staff, superuser
  },
  {
    title: 'Purchase Orders',
    path: '/purchase-orders',
    icon: FileText,
    roleIds: [1, 2, 7, 8],  // admin_holding, staff_holding, warehouse_staff, superuser
  },
  {
    title: 'Finance',
    path: '/finance',
    icon: DollarSign,
    roleIds: [1, 5, 8],  // admin_holding, finance, superuser
  },
  {
    title: 'Laundry',
    path: '/laundry',
    icon: Shirt,
    roleIds: [3, 4, 8],  // laundry_admin, laundry_staff, superuser
  },
  {
    title: 'Users',
    path: '/users',
    icon: Users,
    roleIds: [1, 8],  // admin_holding, superuser
    badge: 'Admin',
  },
]

/**
 * Master Data Navigation Groups
 * Product management and related master data
 */
const masterDataGroups: NavGroup[] = [
  {
    title: 'Master Data',
    icon: Boxes,
    roleIds: [1, 2, 3, 4, 5, 6, 7, 8],  // All authenticated users (Type is visible to all)
    defaultOpen: true,
    children: [
      {
        title: 'Type',
        path: '/master-type',
        icon: Layers,
        roleIds: [1, 2, 3, 4, 5, 6, 7, 8],  // All authenticated users
      },
      {
        title: 'Product',
        path: '/product',
        icon: Tag,
        roleIds: [1, 5, 6, 8],  // admin_holding, finance, outlet_admin, superuser
      },
      {
        title: 'Price & Unit',
        path: '/price-unit',
        icon: DollarSign,
        roleIds: [1, 5, 6, 8],  // admin_holding, finance, outlet_admin, superuser
      },
      // Future submenus (placeholders)
      // {
      //   title: 'Inventory',  // This is for inventory master data, not transactions
      //   path: '/inventory-master',
      //   icon: Package,
      //   roleIds: [1, 2, 6, 7, 8],
      // },
    ],
  },
]

/**
 * PoS Dashboard Navigation Groups
 * Analytical dashboards
 */
const posDashboardGroups: NavGroup[] = [
  {
    title: 'PoS Dashboard',
    icon: TrendingUp,
    roleIds: [1, 5, 6, 8],  // admin_holding, finance, outlet_admin, superuser
    defaultOpen: true,
    children: [
      { title: 'Financial', path: '/dashboard/financial', icon: TrendingUp, roleIds: [1, 5, 6, 8] },
      { title: 'Operational', path: '/dashboard/operational', icon: Activity, roleIds: [1, 5, 6, 8] },
      { title: 'Product & Service Mix', path: '/dashboard/product-mix', icon: Tag, roleIds: [1, 5, 6, 8] },
      { title: 'Peak Hours Analysis', path: '/dashboard/peak-hours', icon: Clock, roleIds: [1, 5, 6, 8] },
    ],
  },
]

// Combine flat items and groups
const allNavItems: (NavItem | NavGroup)[] = [
  ...navItems,
  ...posDashboardGroups,
  ...masterDataGroups,
]

// ============================================
// COMPONENTS
// ============================================

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

import { Footer } from './Footer'

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const { user } = useAuthUser()
  const signOut = useSignOut()

  const navbarTitle = import.meta.env.VITE_NAVBAR_TITLE || 'WMS'

  // Filter nav items based on user role
  const availableItems = user
    ? allNavItems.filter((item) => {
      // SUPERUSER (8) sees everything
      if (user.user_role === 8) return true
      // Check if user's role is in the allowed roles for this item
      return item.roleIds.includes(user.user_role)
    })
    : []

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const handleSignOut = async () => {
    const result = await signOut.mutateAsync()
    if (result.isSuccess) {
      toast.success('Signed out successfully')
    } else {
      toast.error(result.error || 'Failed to sign out')
    }
  }

  // Check if item is a NavGroup
  const isNavGroup = (item: NavItem | NavGroup): item is NavGroup => {
    return 'children' in item
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">{navbarTitle}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('h-8 w-8', isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {availableItems.map((item) => {
            const Icon = item.icon

            // Handle NavGroup (Master Data with submenus)
            if (isNavGroup(item)) {
              const isOpen = openGroups[item.title] ?? item.defaultOpen ?? false
              const hasActiveChild = item.children.some((child) =>
                child.path ? isActivePath(child.path) : false
              )

              return (
                <li key={item.title}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      'hover:bg-pastel-blue/50 hover:text-blue-800',
                      hasActiveChild && 'bg-pastel-blue text-blue-900 font-medium hover:bg-pastel-blue/80'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.title}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Group Children */}
                  {!isCollapsed && isOpen && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const active = child.path ? isActivePath(child.path) : false

                        return (
                          <li key={child.title}>
                            <Link
                              to={child.path || '#'}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                'hover:bg-pastel-blue/50 hover:text-blue-800',
                                active && 'bg-pastel-blue text-blue-900 font-medium hover:bg-pastel-blue/80'
                              )}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span onClick={onNavigate}>{child.title}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            }

            // Handle regular NavItem
            const active = item.path ? isActivePath(item.path) : false

            return (
              <li key={item.path}>
                <Link
                  to={item.path || '#'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    'hover:bg-pastel-blue/50 hover:text-blue-800',
                    active && 'bg-pastel-blue text-blue-900 font-medium hover:bg-pastel-blue/80'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1" onClick={onNavigate}>{item.title}</span>
                      {item.badge && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info & Sign Out */}
      <div className="border-t p-4">
        {!isCollapsed && user && (
          <div className="mb-3 space-y-1 text-sm">
            <p className="font-medium">{user.email}</p>
            <p className="text-muted-foreground text-xs">{ROLE_LABELS[user.user_role]}</p>
            {user.outlet && (
              <p className="text-muted-foreground text-xs">
                {user.outlet.name_outlet}
              </p>
            )}
            {user.kode_outlet && (
              <p className="text-muted-foreground text-xs">
                Outlet: {user.kode_outlet}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onNavigate) onNavigate()
                // Use window.location or router link
              }}
              className="w-full mt-2 h-7 text-xs"
              asChild
            >
              <Link to="/change-password">
                <Lock className="mr-2 h-3 w-3" />
                Change Password
              </Link>
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className={cn('w-full gap-2', isCollapsed && 'justify-center')}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  )
}

// ============================================
// LAYOUT COMPONENT
// ============================================

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const appName = import.meta.env.VITE_APP_NAME || 'Warehouse Management System'
  const companyName = import.meta.env.VITE_COMPANY_NAME || ''
  const headerTitle = companyName ? `${appName} - ${companyName}` : appName
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <Sidebar onNavigate={() => setIsMobileOpen(false)} className="w-full border-r-0" />
              </SheetContent>
            </Sheet>

            <h1 className="text-xl font-semibold truncate md:text-2xl">{headerTitle}</h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
