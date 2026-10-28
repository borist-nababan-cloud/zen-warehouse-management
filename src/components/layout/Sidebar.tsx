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
  Tags,
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
  PackageCheck,
  Undo2,
  Store,
  Moon,
  Sun
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, type RoleId } from '@/types/database'
import { useSignOut } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
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
  // POS Dashboard temporarily disabled - will be modified/updated later
  /*
  {
    title: 'POS Dashboard',
    path: '#',
    icon: Activity,
    roleIds: [5, 6, 8, 10],
    children: [
      { title: 'Keuangan', path: '/dashboard/financial', icon: DollarSign, roleIds: [5, 6, 8, 10] },
      { title: 'Operasional', path: '/dashboard/operational', icon: Activity, roleIds: [5, 6, 8, 10] },
      { title: 'Bauran Produk', path: '/dashboard/product-mix', icon: Boxes, roleIds: [5, 6, 8, 10] },
      { title: 'Jam Sibuk', path: '/dashboard/peak-hours', icon: Clock, roleIds: [5, 6, 8, 10] },
    ]
  },
  */
  {
    title: 'Dasbor Utama',
    path: '/dashboard',
    icon: Warehouse,
    roleIds: [3, 4, 5, 6, 7, 8, 10],
  },
  {
    title: 'Inventaris & Stok',
    path: '#', // Group header
    icon: Package,
    roleIds: [5, 6, 7, 8, 10],
    children: [
      { title: 'Stock Opname', path: '/inventory/stock-opname', icon: ClipboardList, roleIds: [6, 7] },
      { title: 'Penyusutan / Pemusnahan', path: '/inventory/shrinkage', icon: AlertTriangle, roleIds: [6, 7] },
      { title: 'Laporan Nilai Stok', path: '/inventory/report', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
      { title: 'Laporan Kuantitas Stok', path: '/inventory/report-qty', icon: Boxes, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Laporan Penyusutan', path: '/inventory/report-shrinkage', icon: AlertOctagon, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Laporan Selisih Opname', path: '/inventory/report-opname-variance', icon: Scale, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Laporan Pemakaian Internal', path: '/inventory/report-internal-usage', icon: LogOut, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Laporan Retur Internal', path: '/inventory/report-internal-return', icon: Undo2, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Pemakaian Internal', path: '/inventory/internal-usage', icon: LogOut, roleIds: [6, 7, 10] },
      { title: 'Retur Internal', path: '/inventory/internal-return', icon: Undo2, roleIds: [6, 7, 10] }
    ]
  },
  {
    title: 'Manajemen Pengguna',
    path: '/users',
    icon: Users,
    roleIds: [6, 8],
    badge: 'Admin',
  },
]

// -- NEW GROUPS --

const goodsReceiptGroup: NavGroup = {
  title: 'Penerimaan Barang (GR)',
  icon: FileText,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Pesanan Pembelian (PO)', path: '/procurement/purchase-orders', icon: FileText, roleIds: [6, 10] },
    { title: 'Penerimaan Supplier (GR)', path: '/procurement/goods-receipts', icon: Package, roleIds: [7] },
    { title: 'Faktur Pembelian (PO)', path: '/procurement/invoicing-po', icon: FileText, roleIds: [6, 10] },
    { title: 'Laporan PO Tertunda', path: '/procurement/report-outstanding-po', icon: AlertOctagon, roleIds: [5, 6, 8, 10] },
    { title: 'Kinerja Pemasok', path: '/procurement/report-supplier-performance', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
    { title: 'Laporan Pesanan (PO)', path: '/procurement/report-po', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
    { title: 'Laporan Penerimaan Supplier', path: '/procurement/report-gr', icon: Activity, roleIds: [5, 6, 7, 8, 10] },
  ]
}

const goodsIssuedGroup: NavGroup = {
  title: 'Pengeluaran Barang (GI)',
  icon: Truck,
  roleIds: [1, 2, 6, 7, 8],
  children: [
    { title: 'Retur ke Supplier', path: '/goods-issued/gi-return-sto', icon: LogOut, roleIds: [8] },
    { title: 'Laporan Pengeluaran (GI)', path: '/goods-issued/report-gi', icon: Activity, roleIds: [8] },
  ]
}

const stockTransferGroup: NavGroup = {
  title: 'Transfer Stok (STO)',
  icon: Boxes,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Request Kirim Barang', path: '/sto/requests', icon: ClipboardList, roleIds: [6, 10] },
    { title: 'Kirim Barang Ke Outlet (STO)', path: '/sto', icon: FileText, roleIds: [6, 10] },
    { title: 'Kotak Persetujuan STO', path: '/sto/approval', icon: Users, roleIds: [6, 10] },
    { title: 'Pengiriman STO (Issue)', path: '/sto/issue', icon: Truck, roleIds: [7] },
    { title: 'Penerimaan STO (Receipt)', path: '/sto/receipt', icon: Package, roleIds: [7] },
    { title: 'Faktur STO', path: '/sto/invoicing', icon: DollarSign, roleIds: [6, 10] },
    { title: 'Laporan Request Barang', path: '/sto/report-requests', icon: FileText, roleIds: [5, 6, 7, 8, 10] },
    { title: 'Ringkasan Laporan STO', path: '/sto/report-summary', icon: Activity, roleIds: [6, 10] },
    { title: 'Laporan STO Dalam Transit', path: '/sto/report-transit', icon: Truck, roleIds: [6, 7, 10] },
    { title: 'Laporan Order STO', path: '/sto/report-order', icon: FileText, roleIds: [5, 6, 8, 10] },
    { title: 'Laporan Item Order STO', path: '/sto/report-order-items', icon: List, roleIds: [5, 6, 7, 8, 10] },
    { title: 'Laporan Penerimaan STO', path: '/sto/report-receipt', icon: Wallet, roleIds: [5, 6, 8, 10] },
    { title: 'Daftar Item Penerimaan STO', path: '/sto/report-receipt-items', icon: PackageCheck, roleIds: [5, 6, 7, 8, 10] },
  ]
}

const productionGroup: NavGroup = {
  title: 'Produksi',
  icon: Factory,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Manajemen Resep', path: '/production/recipes', icon: BookOpen, roleIds: [6, 10] },
    { title: 'Proses Produksi', path: '/production/run', icon: ClipboardList, roleIds: [7] },
    { title: 'Laporan Biaya & Hasil', path: '/production/cost-yield', icon: TrendingUp, roleIds: [5, 6, 8, 10] },
  ]
}

const financeGroup: NavGroup = {
  title: 'Keuangan & Akuntansi',
  icon: Landmark,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Daftar Rekening & Kas', path: '/finance/accounts', icon: DollarSign, roleIds: [6, 10] },
    { title: 'Transaksi Kas & Bank', path: '/finance/general-transactions', icon: Receipt, roleIds: [6, 10] },
    { title: 'Master Categori Transaksi', path: '/finance/categories', icon: Tag, roleIds: [5, 8] },
    { title: 'Laporan Umur Hutang (AP)', path: '/finance/report-ap-aging', icon: Clock, roleIds: [5, 6, 8, 10] },
    { title: 'Laporan Arus Kas', path: '/finance/report-cash-flow', icon: Banknote, roleIds: [5, 6, 8, 10] },
    { title: 'Laporan Faktur Pembelian', path: '/finance/invoices-report', icon: FileText, roleIds: [5, 6, 8, 10] },
    { title: 'Pembayaran Hutang Supplier', path: '/finance/paydown', icon: Truck, roleIds: [6, 10] },
    { title: 'Pelunasan STO', path: '/finance/sto-paydown', icon: Boxes, roleIds: [6, 10] },
    { title: 'Penyelesaian STO', path: '/finance/sto-settlement', icon: Wallet, roleIds: [6, 10] },
    { title: 'Laporan Piutang STO', path: '/finance/sto-ar-report', icon: TrendingUp, roleIds: [6, 10] },
  ]
}

const paymentGroup: NavGroup = {
  title: 'Pembayaran',
  icon: DollarSign,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Proses Pembayaran', path: '/payment', icon: DollarSign, roleIds: [8] },
    { title: 'Laporan Pembayaran', path: '/payment/report', icon: FileText, roleIds: [8] },
  ]
}

const laundryGroup: NavGroup = {
  title: 'Binatu (Laundry)',
  icon: Shirt,
  roleIds: [5, 6, 7, 8, 10],
  children: [
    { title: 'Laundry Keluar', path: '/laundry/out', icon: Truck, roleIds: [8] },
    { title: 'Laundry Masuk', path: '/laundry/in', icon: Package, roleIds: [8] },
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
        title: 'Info Outlet',
        path: '/master/outlet-info',
        icon: Store,
        roleIds: [6],
      },
      {
        title: 'Kategori Produk',
        path: '/master-type',
        icon: Layers,
        roleIds: [5, 6, 7, 8, 10],
      },
      {
        title: 'Kategori Pemakaian',
        path: '/master/issue-categories',
        icon: Tags,
        roleIds: [5, 6, 8, 10],
      },
      {
        title: 'Kategori Penyusutan',
        path: '/master/shrinkage-categories',
        icon: AlertTriangle,
        roleIds: [5, 8],
      },
      {
        title: 'Master Produk',
        path: '/product',
        icon: Tag,
        roleIds: [6, 10],
      },
      {
        title: 'Harga & Satuan',
        path: '/price-unit',
        icon: DollarSign,
        roleIds: [6, 10],
      },
      {
        title: 'Pemasok (Supplier)',
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
  const { isDark, toggleTheme } = useTheme()

  const navbarTitle = import.meta.env.VITE_NAVBAR_TITLE || 'WMS'

  // Filter nav items based on user role
  const availableItems = user
    ? allNavItems.filter((item) => {
      // SUPERUSER (8) and WEB_ADMIN (18) see everything
      if (user.user_role === 8 || user.user_role === 18) return true
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
      toast.success('Berhasil keluar dari akun')
    } else {
      toast.error(result.error || 'Gagal keluar dari akun')
    }
  }

  // Check if item is a NavGroup
  const isNavGroup = (item: NavItem | NavGroup): item is NavGroup => {
    return 'children' in item
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-zen-border bg-white dark:bg-zen-stone transition-all duration-300 shadow-xs',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b border-zen-border/80 px-4 bg-white dark:bg-zen-stone">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-zen-matcha flex items-center justify-center shadow-xs overflow-hidden p-1 shrink-0">
              <img
                src="/Logo150x150.png"
                alt="Zen Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
              />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-zen-charcoal tracking-wide font-serif block">
                ZEN FAMILY SPA
              </span>
              <span className="text-[10px] font-semibold text-zen-moss block uppercase tracking-wider">
                {navbarTitle}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-xl bg-zen-matcha flex items-center justify-center shadow-xs overflow-hidden p-1">
            <img
              src="/Logo150x150.png"
              alt="Zen Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('h-8 w-8 text-zen-charcoal/70 hover:text-zen-charcoal hover:bg-zen-sand/20', isCollapsed && 'mx-auto mt-2')}
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
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                      'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/80',
                      hasActiveChild && 'bg-zen-sand/20 text-zen-charcoal font-semibold border-l-2 border-zen-matcha'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.title}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-zen-charcoal/60" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-zen-charcoal/60" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Group Children */}
                  {!isCollapsed && isOpen && (
                    <ul className="ml-5 mt-1 space-y-1 pl-2 border-l border-zen-border/70">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const active = child.path ? isActivePath(child.path) : false

                        // CHECK CHILD ROLE PERMISSION
                        if (user && user.user_role !== 8 && !child.roleIds.includes(user.user_role)) {
                          return null
                        }

                        return (
                          <li key={child.title}>
                            <Link
                              to={child.path || '#'}
                              className={cn(
                                'flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs transition-all',
                                'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/75',
                                active && 'bg-zen-matcha text-white font-medium shadow-xs hover:bg-zen-matcha/90 hover:text-white'
                              )}
                            >
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
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
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                    'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/80',
                    active && 'bg-zen-matcha text-white font-medium shadow-xs hover:bg-zen-matcha/90 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1" onClick={onNavigate}>{item.title}</span>
                      {item.badge && (
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          active ? "bg-white/20 text-white" : "bg-zen-matcha/15 text-zen-moss"
                        )}>
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
      <div className="border-t border-zen-border/70 p-3 bg-zen-linen/60">
        {!isCollapsed && user && (
          <div className="mb-2.5 space-y-1 text-xs">
            <p className="font-semibold text-zen-charcoal truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-zen-matcha/15 text-zen-moss rounded-full">
                {ROLE_LABELS[user.user_role]}
              </span>
              {user.kode_outlet && (
                <span className="inline-block px-1.5 py-0.5 text-[10px] text-zen-charcoal/60 bg-zen-sand/20 rounded">
                  Gerai: {user.kode_outlet}
                </span>
              )}
            </div>
            {user.outlet && (
              <p className="text-zen-charcoal/60 text-[11px] truncate">
                {user.outlet.name_outlet}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onNavigate) onNavigate()
              }}
              className="w-full mt-2 h-7 text-xs border-zen-border hover:bg-zen-sand/20 text-zen-charcoal"
              asChild
            >
              <Link to="/change-password">
                <Lock className="mr-1.5 h-3 w-3 text-zen-moss" />
                Ubah Kata Sandi
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="w-full mt-1.5 h-7 text-xs border-zen-border hover:bg-zen-sand/20 text-zen-charcoal dark:hover:bg-zen-stone/40"
            >
              {isDark ? (
                <>
                  <Sun className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                  Ganti Mode Terang
                </>
              ) : (
                <>
                  <Moon className="mr-1.5 h-3.5 w-3.5 text-zen-moss" />
                  Ganti Mode Gelap
                </>
              )}
            </Button>
          </div>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={isDark ? 'Ganti Mode Terang' : 'Ganti Mode Gelap'}
            className="w-full mb-1 text-zen-charcoal/80 hover:bg-zen-sand/20 justify-center"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-zen-moss" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className={cn('w-full gap-2 text-zen-charcoal/80 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs', isCollapsed && 'justify-center')}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Keluar Akun</span>}
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
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'Zen Family Spa & Reflexology'
  const appMode = (import.meta.env.VITE_APP_MODE || '').trim().toUpperCase()
  const isStaging = appMode === 'STAG'
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zen-linen">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Staging Top Banner */}
        {isStaging && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs shrink-0 select-none z-20 border-b border-amber-700/30">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-100 animate-pulse" />
            <span className="tracking-wide">
              Anda saat ini ada pada mode LATIHAN (STAGING) — Data dan transaksi di sini hanya untuk simulasi uji coba.
            </span>
          </div>
        )}

        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-zen-border bg-white/80 dark:bg-zen-stone/80 backdrop-blur-md px-4 md:px-6 shadow-xs">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-zen-charcoal hover:bg-zen-sand/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r border-zen-border">
                <Sidebar onNavigate={() => setIsMobileOpen(false)} className="w-full border-r-0" />
              </SheetContent>
            </Sheet>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold font-serif text-zen-charcoal tracking-wide truncate">
                  {appName}
                </h1>
                {isStaging && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    MODE LATIHAN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zen-charcoal/60 hidden sm:block">
                {companyName}
              </p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zen-linen text-zen-charcoal">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
