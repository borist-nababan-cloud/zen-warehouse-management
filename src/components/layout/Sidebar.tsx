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
import { usePWAInstall } from '@/hooks/usePWAInstall'
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
  CreditCard,
  Download,
  List,
  Wallet,
  PackageCheck,
  Undo2,
  Store,
  Moon,
  Sun,
  Globe,
  Sparkles,
  Megaphone,
  Camera,
  MessageSquareQuote,
  MessageSquare,
  MessageCircle,
  Headphones,
  CalendarRange,
  Target,
  UserCheck,
  ListChecks,
  FolderTree,
  ShieldAlert,
  AlertCircle,
  FileWarning,
  Gift,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, type RoleId } from '@/types/database'
import { useSignOut } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { NotificationBell } from '@/components/NotificationBell'

// ============================================
// TYPES
// ============================================

interface NavItem {
  title: string
  path?: string
  icon: React.ElementType
  roleIds: RoleId[]  // Changed from 'roles' to 'roleIds'
  strictRoles?: boolean // When true, Role 8/18 do not auto-bypass roleIds check
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
    roleIds: [5, 8, 13],
    children: [
      { title: 'Live Report', path: '/pos-dashboard/live', icon: Activity, roleIds: [5, 8, 13] },
      { title: 'Periodic Report', path: '/pos-dashboard/periodic', icon: CalendarRange, roleIds: [5, 8, 13] },
      { title: 'Master Target', path: '/pos-dashboard/master-target', icon: Target, roleIds: [5, 8, 13] },
      // Submenu lama tetap dinonaktifkan / disembunyikan sesuai arahan:
      // { title: 'Keuangan', path: '/dashboard/financial', icon: DollarSign, roleIds: [5, 6, 8, 10] },
      // { title: 'Operasional', path: '/dashboard/operational', icon: Activity, roleIds: [5, 6, 8, 10] },
      // { title: 'Bauran Produk', path: '/dashboard/product-mix', icon: Boxes, roleIds: [5, 6, 8, 10] },
      // { title: 'Jam Sibuk', path: '/dashboard/peak-hours', icon: Clock, roleIds: [5, 6, 8, 10] },
    ]
  },
  {
    title: 'Dashboard Utama',
    path: '/dashboard',
    icon: Warehouse,
    roleIds: [3, 4, 5, 6, 7, 8, 10, 20],
  },
  {
    title: 'POS',
    path: '#',
    icon: Store,
    roleIds: [5, 6, 8, 11, 13, 14, 15, 16, 19, 20],
    strictRoles: true,
    children: [
      {
        title: 'GC List',
        path: '/pos/gc-list',
        icon: Gift,
        roleIds: [5, 6, 8, 13, 14, 19, 20],
        strictRoles: true,
      },
      {
        title: 'Therapist Flow',
        path: '/pos/therapist-flow',
        icon: ArrowUpDown,
        roleIds: [5, 6, 8, 11, 13, 14, 15, 16, 19, 20],
        strictRoles: true,
      },
    ],
  },
  {
    title: 'Inventaris & Stok',
    path: '#', // Group header
    icon: Package,
    roleIds: [5, 6, 7, 8, 10, 13, 14],
    children: [
      { title: 'Stock Opname', path: '/inventory/stock-opname', icon: ClipboardList, roleIds: [6, 7] },
      { title: 'Persetujuan Opname', path: '/inventory/opname-approval', icon: PackageCheck, roleIds: [5, 8, 14] },
      { title: 'Penyusutan / Pemusnahan', path: '/inventory/shrinkage', icon: AlertTriangle, roleIds: [6, 7] },
      { title: 'Laporan Nilai Stok', path: '/inventory/report', icon: TrendingUp, roleIds: [5, 6, 8, 10, 14] },
      { title: 'Laporan Kuantitas Stok', path: '/inventory/report-qty', icon: Boxes, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Kartu Stok', path: '/inventory/stock-card', icon: BookOpen, roleIds: [5, 6, 7, 8, 13, 14] },
      { title: 'Laporan Penyusutan', path: '/inventory/report-shrinkage', icon: AlertOctagon, roleIds: [5, 6, 7, 8, 10] },
      { title: 'Laporan Selisih Opname', path: '/inventory/report-opname-variance', icon: Scale, roleIds: [5, 6, 7, 8, 10, 14] },
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
    roleIds: [2, 6, 8],
    badge: 'Admin',
  },
  {
    title: 'Pengumuman & Push',
    path: '/admin/announcements',
    icon: Megaphone,
    roleIds: [8],
    strictRoles: true,
    badge: 'Push',
  },
]

// -- NEW GROUPS --

const goodsReceiptGroup: NavGroup = {
  title: 'Pembelian (Supplier)',
  icon: FileText,
  roleIds: [5, 6, 7, 8, 10, 14],
  children: [
    { title: 'Pesanan Pembelian (PO)', path: '/procurement/purchase-orders', icon: FileText, roleIds: [6, 10] },
    { title: 'Penerimaan Supplier (GR)', path: '/procurement/goods-receipts', icon: Package, roleIds: [7] },
    { title: 'Faktur Pembelian (PO)', path: '/procurement/invoicing-po', icon: FileText, roleIds: [6, 10] },
    { title: 'Laporan PO Tertunda', path: '/procurement/report-outstanding-po', icon: AlertOctagon, roleIds: [5, 6, 8, 10] },
    { title: 'Kinerja Pemasok', path: '/procurement/report-supplier-performance', icon: TrendingUp, roleIds: [5, 6, 8, 10, 14] },
    { title: 'Laporan Pesanan (PO)', path: '/procurement/report-po', icon: TrendingUp, roleIds: [5, 6, 8, 10, 14] },
    { title: 'Laporan Penerimaan Supplier', path: '/procurement/report-gr', icon: Activity, roleIds: [5, 6, 7, 8, 10, 14] },
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
  roleIds: [5, 6, 7, 8, 10, 13, 14],
  children: [
    {
      title: 'Penerimaan',
      icon: PackageCheck,
      roleIds: [5, 6, 7, 8, 10, 14],
      children: [
        { title: 'Request Kirim Barang', path: '/sto/requests', icon: ClipboardList, roleIds: [6, 10] },
        { title: 'Kotak Persetujuan STO', path: '/sto/approval', icon: Users, roleIds: [6, 10] },
        { title: 'Penerimaan STO (Receipt)', path: '/sto/receipt', icon: Package, roleIds: [7] },
        { title: 'Faktur STO', path: '/sto/invoicing', icon: DollarSign, roleIds: [6, 10] },
        { title: 'Laporan Request Barang', path: '/sto/report-requests', icon: FileText, roleIds: [5, 6, 7, 8, 10] },
        { title: 'Laporan Item Order STO', path: '/sto/report-order-items/penerimaan', icon: List, roleIds: [5, 6, 7, 8, 10, 14] },
        { title: 'Laporan Penerimaan STO', path: '/sto/report-receipt', icon: Wallet, roleIds: [5, 6, 8, 10, 14] },
        { title: 'Daftar Item Penerimaan STO', path: '/sto/report-receipt-items', icon: PackageCheck, roleIds: [5, 6, 7, 8, 10, 14] },
      ],
    },
    {
      title: 'Pengiriman',
      icon: Truck,
      roleIds: [5, 6, 7, 8, 10, 14],
      children: [
        { title: 'Kirim Barang Ke Outlet (STO)', path: '/sto', icon: FileText, roleIds: [6, 10] },
        { title: 'Pengiriman STO (Issue)', path: '/sto/issue', icon: Truck, roleIds: [7] },
        { title: 'Laporan Item Order STO', path: '/sto/report-order-items/pengiriman', icon: List, roleIds: [5, 6, 7, 8, 10, 14] },
      ],
    },
    { title: 'Ringkasan Laporan STO', path: '/sto/report-summary', icon: Activity, roleIds: [5, 6, 8, 10, 13, 14], strictRoles: true },
    { title: 'Ringkasan Items STO', path: '/sto/report-summary-items', icon: List, roleIds: [5, 6, 8, 10, 13, 14], strictRoles: true },
    { title: 'Laporan STO Dalam Transit', path: '/sto/report-transit', icon: Truck, roleIds: [6, 7, 10] },
    { title: 'Laporan Order STO', path: '/sto/report-order', icon: FileText, roleIds: [5, 6, 8, 10] },
  ]
}

const productionGroup: NavGroup = {
  title: 'Produksi',
  icon: Factory,
  roleIds: [5, 6, 7, 8, 10, 14],
  children: [
    { title: 'Manajemen Resep', path: '/production/recipes', icon: BookOpen, roleIds: [6, 10] },
    { title: 'Proses Produksi', path: '/production/run', icon: ClipboardList, roleIds: [7] },
    { title: 'Laporan Biaya & Hasil', path: '/production/cost-yield', icon: TrendingUp, roleIds: [5, 6, 8, 10, 14] },
  ]
}

const financeGroup: NavGroup = {
  title: 'Keuangan & Akuntansi',
  icon: Landmark,
  roleIds: [5, 6, 7, 8, 10, 14],
  children: [
    {
      title: 'Pembayaran (AP)',
      icon: CreditCard,
      roleIds: [5, 6, 8, 10, 14],
      children: [
        { title: 'Pembayaran Hutang Supplier', path: '/finance/paydown', icon: Truck, roleIds: [6, 10] },
        { title: 'Pelunasan STO', path: '/finance/sto-paydown', icon: Boxes, roleIds: [6, 10] },
        { title: 'Laporan Umur Hutang (AP)', path: '/finance/report-ap-aging', icon: Clock, roleIds: [5, 6, 8, 10, 14] },
        { title: 'Laporan Faktur Pembelian', path: '/finance/invoices-report', icon: FileText, roleIds: [5, 6, 8, 10, 14] },
      ],
    },
    {
      title: 'Penerimaan (AR)',
      icon: Wallet,
      roleIds: [6, 8, 10, 14],
      children: [
        { title: 'Penyelesaian STO', path: '/finance/sto-settlement', icon: Wallet, roleIds: [6, 10] },
        { title: 'Laporan Piutang STO', path: '/finance/sto-ar-report', icon: TrendingUp, roleIds: [6, 10, 14] },
        { title: 'Pelunasan Customer', path: '/finance/customer-settlement', icon: Banknote, roleIds: [6], strictRoles: true },
      ],
    },
    { title: 'Daftar Rekening & Kas', path: '/finance/accounts', icon: DollarSign, roleIds: [6, 10] },
    { title: 'Transaksi Kas & Bank', path: '/finance/general-transactions', icon: Receipt, roleIds: [6, 10] },
    { title: 'Master Categori Transaksi', path: '/finance/categories', icon: Tag, roleIds: [5, 8] },
    { title: 'Laporan Arus Kas', path: '/finance/report-cash-flow', icon: Banknote, roleIds: [5, 6, 8, 10, 14] },
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
const customerSalesGroup: NavGroup = {
  title: 'Jual Customer',
  icon: Receipt,
  roleIds: [5, 6, 7, 8, 13],
  children: [
    { title: 'Pesanan Penjualan', path: '/customer-sales/orders', icon: FileText, roleIds: [6], strictRoles: true },
    { title: 'Pengiriman Barang (Issue)', path: '/customer-sales/shipments', icon: Truck, roleIds: [7], strictRoles: true },
    { title: 'Faktur Penjualan', path: '/customer-sales/invoicing', icon: Receipt, roleIds: [6], strictRoles: true },
    { title: 'Lap. Pengiriman Barang', path: '/customer-sales/report-shipments', icon: PackageCheck, roleIds: [5, 6, 7, 8, 13] },
    { title: 'Lap. Penjualan', path: '/customer-sales/report-sales', icon: TrendingUp, roleIds: [5, 6, 7, 8, 13] },
  ]
}

const masterDataGroups: NavGroup[] = [
  {
    title: 'Master Data',
    icon: Boxes,
    roleIds: [5, 6, 7, 8, 10, 13],
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
      {
        title: 'Customer',
        path: '/customer',
        icon: Users,
        roleIds: [5, 6, 8, 13],
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

const webDataGroup: NavGroup = {
  title: 'Web Data',
  icon: Globe,
  roleIds: [5, 8, 18, 13],
  defaultOpen: false,
  children: [
    {
      title: 'Master Fasilitas',
      path: '/web/facilities',
      icon: Sparkles,
      roleIds: [5, 8, 18, 13]
    },
    {
      title: 'Galeri Foto',
      path: '/web/gallery',
      icon: Camera,
      roleIds: [5, 8, 18, 13]
    },
    {
      title: 'Menu Layanan',
      path: '/web/services',
      icon: BookOpen,
      roleIds: [5, 8, 18, 13]
    },
    {
      title: 'Berita & Promo',
      path: '/web/news-promo',
      icon: Megaphone,
      roleIds: [5, 8, 18, 13]
    },
    {
      title: 'User Testimoni',
      path: '/web/testimonials',
      icon: MessageSquareQuote,
      roleIds: [5, 8, 18, 13]
    }
  ]
}

const crmGroup: NavGroup = {
  title: 'CRM',
  icon: MessageSquare,
  roleIds: [5, 6, 8, 10, 13, 18, 19],
  defaultOpen: false,
  children: [
    {
      title: 'Inbox Outlet',
      path: '/crm/inbox-outlet',
      icon: MessageCircle,
      roleIds: [5, 6, 8, 13, 19]
    },
    {
      title: 'Inbox',
      path: '/crm/inbox-holding',
      icon: Headphones,
      roleIds: [10, 8, 18]
    }
  ]
}


const hrdGroup: NavGroup = {
  title: 'HRD',
  icon: UserCheck,
  roleIds: [2, 5, 6, 8, 13, 14, 15, 16, 19],
  defaultOpen: false,
  children: [
    {
      title: 'Info Karyawan',
      path: '/hrd/karyawan-info',
      icon: Users,
      roleIds: [2, 5, 6, 8, 13, 14, 15],
    },
    {
      title: 'Kategori Evaluasi TR',
      path: '/hrd/tr-kategori',
      icon: FolderTree,
      roleIds: [2, 8, 16],
    },
    {
      title: 'Variabel Evaluasi TR',
      path: '/hrd/tr-variabel',
      icon: ListChecks,
      roleIds: [2, 8, 16],
    },
    {
      title: 'Buat Evaluasi TR',
      path: '/hrd/tr-buat-evaluasi',
      icon: UserCheck,
      roleIds: [8, 15, 16],
    },
    {
      title: 'Lap. Evaluasi',
      path: '/hrd/tr-laporan',
      icon: FileText,
      roleIds: [2, 5, 6, 8, 13, 14, 15, 16],
    },
    {
      title: 'Master Faults',
      path: '/hrd/master-faults',
      icon: ShieldAlert,
      roleIds: [2, 5, 8, 15, 16],
    },
    {
      title: 'TR Faults',
      path: '/hrd/tr-faults',
      icon: AlertCircle,
      roleIds: [5, 8, 14, 15, 16],
    },
    {
      title: 'Report TR Faults',
      path: '/hrd/report-tr-faults',
      icon: FileWarning,
      roleIds: [2, 5, 6, 8, 13, 14, 15, 16, 19],
    },
    {
      title: 'KPI Variable',
      path: '/hrd/kpi-variable',
      icon: ListChecks,
      roleIds: [2, 5, 8, 13, 14],
    },
    {
      title: 'KPI Mstr. Faults',
      path: '/hrd/kpi-master-faults',
      icon: ShieldAlert,
      roleIds: [2, 5, 8, 13, 14],
    },
    {
      title: 'Employee Faults',
      path: '/hrd/employee-faults',
      icon: AlertCircle,
      roleIds: [2, 5, 6, 8, 14],
    },
    {
      title: 'Employee KPI',
      path: '/hrd/employee-kpi',
      icon: UserCheck,
      roleIds: [2, 5, 6, 8, 14],
    },
    {
      title: 'Rep. Employee Faults',
      path: '/hrd/report-employee-faults',
      icon: FileWarning,
      roleIds: [2, 5, 6, 8, 13, 14],
    },
    {
      title: 'Report Employee KPI',
      path: '/hrd/report-employee-kpi',
      icon: FileText,
      roleIds: [2, 5, 6, 8, 13, 14],
    },
  ],
}

// Combine flat items and groups
const allNavItems: (NavItem | NavGroup)[] = [
  ...navItems,
  goodsReceiptGroup,
  goodsIssuedGroup,
  customerSalesGroup,
  stockTransferGroup,
  productionGroup,
  financeGroup,
  paymentGroup,
  laundryGroup,
  ...posDashboardGroups,
  ...masterDataGroups,
  crmGroup,
  webDataGroup,
  hrdGroup,
]

// ============================================
// COMPONENTS
// ============================================

interface SidebarProps {
  className?: string
  onNavigate?: () => void
  isMobile?: boolean
}

import { Footer } from './Footer'

export function Sidebar({ className, onNavigate, isMobile = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const collapsed = isMobile ? false : isCollapsed
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const { user } = useAuthUser()
  const signOut = useSignOut()
  const { isDark, toggleTheme } = useTheme()
  const { isInstalled, isInstallable, isIOSSafari, promptInstall } = usePWAInstall()
  const [showInstallHelp, setShowInstallHelp] = useState(false)

  const navbarTitle = import.meta.env.VITE_NAVBAR_TITLE || 'WMS'

  // Filter nav items based on user role
  const availableItems = user
    ? allNavItems.filter((item) => {
      // SUPERUSER (8) and WEB_ADMIN (18) see everything unless strictRoles is set
      if (!(item as NavItem).strictRoles && (user.user_role === 8 || user.user_role === 18)) return true
      // Check if user's role is in the allowed roles for this item
      return item.roleIds.includes(user.user_role)
    })
    : []

  const isActivePath = (path: string) => {
    if (path === '/sto') {
      return location.pathname === '/sto' || location.pathname.startsWith('/sto/create')
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const hasActiveNavItem = (navItem: NavItem): boolean => {
    if (navItem.path && isActivePath(navItem.path)) return true
    if (navItem.children) return navItem.children.some(hasActiveNavItem)
    return false
  }

  const canAccessNavItem = (navItem: NavItem): boolean => {
    if (!user) return false
    if (!navItem.strictRoles && (user.user_role === 8 || user.user_role === 18)) return true
    return navItem.roleIds.includes(user.user_role)
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

  const navContent = (
    <ul className="space-y-1">
      {availableItems.map((item) => {
        const Icon = item.icon

        // Handle NavGroup (Master Data with submenus)
        if (isNavGroup(item)) {
          // Check if group has any visible children for current user
          const visibleChildren = item.children.filter((child) => {
            if (!canAccessNavItem(child)) return false
            if (child.children) {
              return child.children.some(canAccessNavItem)
            }
            return true
          })

          if (visibleChildren.length === 0) {
            return null
          }

          const hasActiveChild = item.children.some(hasActiveNavItem)
          const isOpen = openGroups[item.title] ?? (hasActiveChild || item.defaultOpen) ?? false

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
                {!collapsed && (
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
              {!collapsed && isOpen && (
                <ul className="ml-5 mt-1 space-y-1 pl-2 border-l border-zen-border/70">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon

                    // CHECK CHILD ROLE PERMISSION
                    if (!canAccessNavItem(child)) {
                      return null
                    }

                    // Nested sub-group (e.g. Penerimaan / Pengiriman inside Transfer Stok (STO))
                    if (child.children && child.children.length > 0) {
                      const visibleSubChildren = child.children.filter(canAccessNavItem)
                      if (visibleSubChildren.length === 0) return null

                      const subGroupKey = `${item.title}::${child.title}`
                      const subHasActive = visibleSubChildren.some(hasActiveNavItem)
                      const subIsOpen = openGroups[subGroupKey] ?? (subHasActive || child.defaultOpen) ?? false

                      return (
                        <li key={child.title}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(subGroupKey)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all',
                              'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/80',
                              subHasActive && 'bg-zen-sand/20 text-zen-charcoal font-semibold'
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 text-left font-medium">{child.title}</span>
                            {subIsOpen ? (
                              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-zen-charcoal/60" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zen-charcoal/60" />
                            )}
                          </button>

                          {subIsOpen && (
                            <ul className="ml-3.5 mt-1 space-y-1 pl-2 border-l border-zen-border/70">
                              {visibleSubChildren.map((subChild) => {
                                const SubIcon = subChild.icon
                                const subActive = subChild.path ? isActivePath(subChild.path) : false
                                return (
                                  <li key={subChild.path || subChild.title}>
                                    <Link
                                      to={subChild.path || '#'}
                                      onClick={onNavigate}
                                      className={cn(
                                        'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] transition-all',
                                        'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/75',
                                        subActive && 'bg-zen-matcha text-white font-medium shadow-xs hover:bg-zen-matcha/90 hover:text-white'
                                      )}
                                    >
                                      <SubIcon className="h-3 w-3 shrink-0" />
                                      <span>{subChild.title}</span>
                                    </Link>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    }

                    const active = child.path ? isActivePath(child.path) : false

                    return (
                      <li key={child.title}>
                        <Link
                          to={child.path || '#'}
                          onClick={onNavigate}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs transition-all',
                            'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/75',
                            active && 'bg-zen-matcha text-white font-medium shadow-xs hover:bg-zen-matcha/90 hover:text-white'
                          )}
                        >
                          <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{child.title}</span>
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
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                'hover:bg-zen-matcha/10 hover:text-zen-moss text-zen-charcoal/80',
                active && 'bg-zen-matcha text-white font-medium shadow-xs hover:bg-zen-matcha/90 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
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
  )

  const userFooterContent = (
    <>
      {!collapsed && user && (
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
          {!isInstalled && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (isInstallable) {
                  const accepted = await promptInstall()
                  if (!accepted) setShowInstallHelp(true)
                } else {
                  setShowInstallHelp(true)
                }
              }}
              className="w-full mt-2 min-h-7 h-auto py-1.5 px-2.5 text-[11px] leading-tight border-zen-matcha/50 bg-zen-matcha/10 hover:bg-zen-matcha/20 text-zen-moss font-semibold whitespace-normal text-left justify-start"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 shrink-0 text-zen-matcha" />
              <span>Install Aplikasi ini Pada Perangkat Anda</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigate) onNavigate()
            }}
            className="w-full mt-1.5 h-7 text-xs border-zen-border hover:bg-zen-sand/20 text-zen-charcoal"
            asChild
          >
            <Link to="/tutorial">
              <BookOpen className="mr-1.5 h-3 w-3 text-zen-moss" />
              Tutorial Aplikasi
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigate) onNavigate()
            }}
            className="w-full mt-1.5 h-7 text-xs border-zen-border hover:bg-zen-sand/20 text-zen-charcoal"
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
      {collapsed && (
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
        size={collapsed ? 'icon' : 'default'}
        onClick={handleSignOut}
        disabled={signOut.isPending}
        className={cn('w-full gap-2 text-zen-charcoal/80 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs', collapsed && 'justify-center')}
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && <span>Keluar Akun</span>}
      </Button>
    </>
  )

  return (
    <aside
      className={cn(
        'flex flex-col h-full max-h-full overflow-hidden border-r border-zen-border bg-white dark:bg-zen-stone transition-all duration-300 shadow-xs',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className={cn(
        'flex h-16 shrink-0 items-center justify-between border-b border-zen-border/80 px-4 bg-white dark:bg-zen-stone',
        isMobile && 'pr-12'
      )}>
        {!collapsed ? (
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
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn('h-8 w-8 text-zen-charcoal/70 hover:text-zen-charcoal hover:bg-zen-sand/20', collapsed && 'mx-auto mt-2')}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {isMobile ? (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y flex flex-col">
          <nav className="flex-1 p-2">
            {navContent}
          </nav>
          <div className="mt-auto shrink-0 border-t border-zen-border/70 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zen-linen/60">
            {userFooterContent}
          </div>
        </div>
      ) : (
        <>
          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2">
            {navContent}
          </nav>
          <div className="shrink-0 max-h-[45%] overflow-y-auto border-t border-zen-border/70 p-3 bg-zen-linen/60">
            {userFooterContent}
          </div>
        </>
      )}

      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zen-stone border border-zen-sand/50 p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-zen-charcoal dark:text-zen-linen">
              Pasang Zen WHMS ke Perangkat
            </h3>
            {isIOSSafari ? (
              <ol className="space-y-2 text-xs text-zen-charcoal dark:text-zen-linen/90 list-decimal pl-4">
                <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah Safari.</li>
                <li>Pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-xs text-zen-charcoal dark:text-zen-linen/90 list-decimal pl-4">
                <li>Pastikan tidak membuka dalam mode <em>Incognito / Tamu</em>.</li>
                <li>Pada <strong>Chrome / Edge Desktop</strong>: klik ikon <strong>Instal</strong> di sisi kanan bilah alamat URL, atau buka menu <strong>⋮ / ⋯ → Simpan &amp; bagikan → Instal Zen Warehouse Management</strong>.</li>
                <li>Pada <strong>Android Chrome</strong>: ketuk menu <strong>⋮ → Instal aplikasi / Tambahkan ke layar utama</strong>.</li>
              </ol>
            )}
            <Button
              onClick={() => setShowInstallHelp(false)}
              className="w-full bg-zen-matcha hover:bg-zen-moss text-white text-xs h-8"
            >
              Mengerti
            </Button>
          </div>
        </div>
      )}
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
    <div className="flex h-dvh overflow-hidden bg-zen-linen">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zen-border bg-white/80 dark:bg-zen-stone/80 backdrop-blur-md px-4 md:px-6 shadow-xs">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-zen-charcoal hover:bg-zen-sand/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 gap-0 w-72 max-w-[85vw] h-dvh max-h-dvh flex flex-col overflow-hidden border-r border-zen-border"
              >
                <Sidebar
                  isMobile
                  onNavigate={() => setIsMobileOpen(false)}
                  className="w-full h-full border-r-0"
                />
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

          <div className="flex items-center gap-2">
            <NotificationBell />
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
