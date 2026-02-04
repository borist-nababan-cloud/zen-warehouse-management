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
  Receipt,
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
  Truck,
  Landmark,
  Factory,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  AlertOctagon,
  Scale,
  Banknote,
  List,
  Wallet,
  PackageCheck
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
    title: 'POS Dashboard',
    path: '#',
    icon: Activity,
    roleIds: [5, 6, 8, 10],
    children: [
      { title: 'Financial', path: '/dashboard/financial', icon: DollarSign, roleIds: [5, 6, 8, 10] },
      { title: 'Operational', path: '/dashboard/operational', icon: Activity, roleIds: [5, 6, 8, 10] },
      { title: 'Product Mix', path: '/dashboard/product-mix', icon: Boxes, roleIds: [5, 6, 8, 10] },
      { title: 'Peak Hours', path: '/dashboard/peak-hours', icon: Clock, roleIds: [5, 6, 8, 10] },
    ]
  },
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: Warehouse,
    roleIds: [3, 4, 5, 6, 7, 8, 10],
  },
  {
    title: 'Inventory',
    path: '#', // Group header
    icon: Package,
    roleIds: [5, 6, 7, 8, 10],
    children: [
      { title: 'Stock Opname', path: '/inventory/stock-opname', icon: ClipboardList, roleIds: [6, 7] },
      { title: 'Shrinkage / Write-off', path: '/inventory/shrinkage', icon: AlertTriangle, roleIds: [6, 7] },
      { title: 'Report Inventory', path: '/inventory/report', icon: TrendingUp, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Report Qty Inventory', path: '/inventory/report-qty', icon: Boxes, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Report Shrinkage', path: '/inventory/report-shrinkage', icon: AlertOctagon, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Report Opname Variance', path: '/inventory/report-opname-variance', icon: Scale, roleIds: [5, 6, 7, 8, 10] }
    ]
  },
  {
    title: 'Users',
    path: '/users',
    icon: Users,
    roleIds: [8],
    badge: 'Admin',
  },
]

// -- NEW GROUPS --

const goodsReceiptGroup: NavGroup = {
  title: 'Goods Receipt',
  icon: FileText,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Purchase Order', path: '/procurement/purchase-orders', icon: FileText, roleIds: [6, 10] },
    { title: 'GR Supplier', path: '/procurement/goods-receipts', icon: Package, roleIds: [7] },
    { title: 'Invoicing PO', path: '/procurement/invoicing-po', icon: FileText, roleIds: [6, 10] },
    { title: 'Outstanding PO Report', path: '/procurement/report-outstanding-po', icon: AlertOctagon, roleIds: [5, 6, 8, 10] },
    { title: 'Supplier Performance', path: '/procurement/report-supplier-performance', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
    { title: 'Report PO', path: '/procurement/report-po', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
    { title: 'Report GR Supplier', path: '/procurement/report-gr', icon: Activity, roleIds: [5, 6, 7, 8, 10] },
  ]
}

const goodsIssuedGroup: NavGroup = {
  title: 'Goods Issued',
  icon: Truck,
  roleIds: [1, 2, 6, 7, 8], // Keeping group open for Holding/Admin as per MD Group Access text, though items are limited
  children: [
    { title: 'Return Supplier', path: '/goods-issued/gi-return-sto', icon: LogOut, roleIds: [8] },
    { title: 'Report GI', path: '/goods-issued/report-gi', icon: Activity, roleIds: [8] },
  ]
}

const stockTransferGroup: NavGroup = {
  title: 'Stock Transfer',
  icon: Boxes,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Transfer Orders', path: '/sto', icon: FileText, roleIds: [6, 10] },
    { title: 'Approval Inbox', path: '/sto/approval', icon: Users, roleIds: [6, 10] },
    { title: 'Goods Issue', path: '/sto/issue', icon: Truck, roleIds: [7] },
    { title: 'Goods Receipt', path: '/sto/receipt', icon: Package, roleIds: [7] },
    { title: 'STO Invoicing', path: '/sto/invoicing', icon: DollarSign, roleIds: [6, 10] },
    { title: 'Report Summary STO', path: '/sto/report-summary', icon: Activity, roleIds: [6, 10] },
    { title: 'Report STO Transit', path: '/sto/report-transit', icon: Truck, roleIds: [6, 7, 10] },
    { title: 'Report STO Order', path: '/sto/report-order', icon: FileText, roleIds: [5, 6, 8, 10] },
    { title: 'Report STO Order Items', path: '/sto/report-order-items', icon: List, roleIds: [5, 6, 7, 8, 10] },
    { title: 'Report STO Receipt', path: '/sto/report-receipt', icon: Wallet, roleIds: [5, 6, 8, 10] },
    { title: 'Report STO Receipt List', path: '/sto/report-receipt-items', icon: PackageCheck, roleIds: [5, 6, 7, 8, 10] },
  ]
}

const productionGroup: NavGroup = {
  title: 'Production',
  icon: Factory,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Recipe Manager', path: '/production/recipes', icon: BookOpen, roleIds: [6, 10] },
    { title: 'Production Run', path: '/production/run', icon: ClipboardList, roleIds: [7] },
    { title: 'Cost & Yield Report', path: '/production/cost-yield', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
  ]
}

const financeGroup: NavGroup = {
  title: 'Financial',
  icon: Landmark,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Accounts', path: '/finance/accounts', icon: DollarSign, roleIds: [6, 10] },
    { title: 'General Transactions', path: '/finance/general-transactions', icon: Receipt, roleIds: [6, 10] },
    { title: 'Report AP Aging', path: '/finance/report-ap-aging', icon: Clock, roleIds: [5, 6, 8, 10] },
    { title: 'Report Cash Flow', path: '/finance/report-cash-flow', icon: Banknote, roleIds: [5, 6, 8, 10] }, // Role 1 Excluded per MD
    { title: 'Invoices Report', path: '/finance/invoices-report', icon: FileText, roleIds: [5, 6, 8, 10] },
    { title: 'Supplier Paydown', path: '/finance/paydown', icon: Truck, roleIds: [6, 10] },
    { title: 'STO Paydown', path: '/finance/sto-paydown', icon: Boxes, roleIds: [6, 10] },
  ]
}

const paymentGroup: NavGroup = {
  title: 'Payment',
  icon: DollarSign,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Payment', path: '/payment', icon: DollarSign, roleIds: [8] },
    { title: 'Payment Report', path: '/payment/report', icon: FileText, roleIds: [8] },
  ]
}

const laundryGroup: NavGroup = {
  title: 'Laundry',
  icon: Shirt,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Laundry Out', path: '/laundry/out', icon: Truck, roleIds: [8] },
    { title: 'Laundry In', path: '/laundry/in', icon: Package, roleIds: [8] },
  ]
}

/**
 * Master Data Navigation Groups
 */
const masterDataGroups: NavGroup[] = [
  {
    title: 'Master Data',
    icon: Boxes,
    roleIds: [5, 6, 7, 8, 10],
    defaultOpen: false,
    children: [
      {
        title: 'Type',
        path: '/master-type',
        icon: Layers,
        roleIds: [5, 6, 7, 8, 10],
      },
      {
        title: 'Product',
        path: '/product',
        icon: Tag,
        roleIds: [6, 10],
      },
      {
        title: 'Price & Unit',
        path: '/price-unit',
        icon: DollarSign,
        roleIds: [6, 10],
      },
      {
        title: 'Supplier',
        path: '/supplier',
        icon: Truck,
        roleIds: [6, 10],
      },
    ],
  },
]

/**
 * PoS Dashboard Navigation Groups
 */
const posDashboardGroups: NavGroup[] = [ // This is redundant now as it's included in navItems, keeping for compatibility if needed or removing
  // Actually, it's used in allNavItems. I will comment it out or empty it as it is already in `navItems`
  // Wait, in the original code, `posDashboardGroups` was defined separately.
  // In my first replacement chunk, I added PoS Dashboard to `navItems`.
  // So I should remove it from here or make it empty to avoid duplication.
  // Let's check `allNavItems` definition.
]

// Combine flat items and groups
const allNavItems: (NavItem | NavGroup)[] = [
  ...navItems,
  goodsReceiptGroup,
  goodsIssuedGroup,
  stockTransferGroup,
  productionGroup,
  financeGroup,
  paymentGroup,
  laundryGroup,
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
              // Check if group has any visible children for current user
              const visibleChildren = item.children.filter((child) =>
                user?.user_role === 8 || (user && child.roleIds.includes(user.user_role))
              )

              if (visibleChildren.length === 0) {
                return null
              }

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

                        // CHECK CHILD ROLE PERMISSION
                        // If SUPERUSER (8), allow. Else check if user role is in child.roleIds
                        if (user && user.user_role !== 8 && !child.roleIds.includes(user.user_role)) {
                          return null
                        }

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
