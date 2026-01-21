/**
 * Database Type Definitions
 * These types match the Supabase database schema
 */

// ============================================
// NEW SCHEMA - ROLE BASED ACCESS CONTROL
// ============================================

/**
 * Role ID System (1-9)
 * 1  - admin_holding      (Full access, holding scope)
 * 2  - staff_holding      (Limited access, holding scope)
 * 3  - laundry_admin      (Laundry module admin)
 * 4  - laundry_staff      (Laundry module staff)
 * 5  - finance            (Finance module access)
 * 6  - outlet_admin       (Outlet management)
 * 7  - warehouse_staff    (Warehouse operations)
 * 8  - SUPERUSER          (ALL ACCESS, no outlet restriction)
 * 9  - UNASSIGNED         (Default for new users, should be blocked)
 */


export type RoleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * Legacy Role Names (for backward compatibility)
 */
export type UserRole =
  | 'admin_holding'
  | 'staff_holding'
  | 'laundry_staff'
  | 'laundry_admin'
  | 'finance'
  | 'outlet_admin'
  | 'warehouse_staff'
  | 'finance_outlet'

/**
 * Map RoleId to UserRole string
 */
export const ROLE_ID_TO_NAME: Record<RoleId, UserRole | 'SUPERUSER' | 'UNASSIGNED'> = {
  1: 'admin_holding',
  2: 'staff_holding',
  3: 'laundry_admin',
  4: 'laundry_staff',
  5: 'finance',
  6: 'outlet_admin',
  7: 'warehouse_staff',
  8: 'SUPERUSER',
  9: 'UNASSIGNED',
  10: 'finance_outlet',
}

/**
 * Map UserRole string to RoleId
 */
export const ROLE_NAME_TO_ID: Record<UserRole, RoleId> = {
  admin_holding: 1,
  staff_holding: 2,
  laundry_admin: 3,
  laundry_staff: 4,
  finance: 5,
  outlet_admin: 6,
  warehouse_staff: 7,
  finance_outlet: 10,
}

// ============================================
// NEW TABLE TYPES
// ============================================

/**
 * role_user table - Role definitions
 */
export interface RoleUser {
  id: RoleId
  role_name: string
  created_at: string
}

/**
 * users_profile table - User profiles with outlet assignment
 * NOTE: uid is UUID type in database, but we use string in TypeScript for simplicity
 */
export interface UserProfile {
  uid: string              // UUID type in database, string in TypeScript
  user_role: RoleId        // References role_user.id (1-9)
  kode_outlet: string | null  // References master_outlet.kode_outlet, '111' = holding
  email: string            // User email (from auth)
  created_at: string
}

/**
 * master_outlet table - Outlet master data
 */
export interface MasterOutlet {
  kode_outlet: string      // Primary key
  name_outlet: string
  alamat: string
  no_telp: string
  no_wa: string
  location: string
  province: string
  outlet_group_id: number  // References group_outlet.group_id
  active: boolean          // Active status
  city: string
  email: string
  can_sto?: boolean        // Capable of STO transfers
}

/**
 * group_outlet table - Outlet grouping
 */
export interface GroupOutlet {
  group_id: number
  group_name: string
  created_at: string
}

/**
 * master_type table - Product type/category master data
 */
export interface MasterType {
  id: number                    // Auto-increment primary key
  nama_type: string             // Type/category name
  description: string | null    // Type description
  created_at: string
}

/**
 * master_barang table - Product/item master data
 * NOTE: Composite primary key (kode_outlet, id)
 */
export interface MasterBarang {
  id: number                    // Auto-increment, part of composite PK
  sku: string | null            // Product SKU/code
  created_at: string
  id_type: number | null        // References master_type.id
  kode_outlet: string           // References master_outlet.kode_outlet, part of composite PK
  name: string | null           // Product name
  deleted: boolean              // Soft delete flag
  image1_url: string | null     // Product image 1
  iamge2_url: string | null     // Product image 2 (note: column typo in database)
}

/**
 * MasterBarang with relations joined
 */
export interface MasterBarangWithType extends MasterBarang {
  master_type: MasterType | null
  master_outlet: MasterOutlet | null
  barang_units?: BarangUnit[] | null
  barang_prices?: BarangPrice[] | null
}

/**
 * master_bank table - Bank master data
 */
export interface MasterBank {
  kode_bank: string             // UUID
  bank_name: string
  desc: string | null
  created_at: string
}

/**
 * master_supplier table - Supplier master data
 */
export interface MasterSupplier {
  kode_supplier: string         // UUID
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  pic_name: string | null
  created_at: string
  kode_outlet: string | null
  kode_bank: string | null      // UUID references master_bank
  no_rekening: string | null
  nama_rekening: string | null
}

/**
 * MasterSupplier with relations joined
 */
export interface MasterSupplierWithBank extends MasterSupplier {
  master_bank: MasterBank | null
  master_outlet: MasterOutlet | null
}

/**
 * Price Unit Update Data Type
 * Used for updating both price and unit in one operation
 */
export interface PriceUnitUpdateData {
  barang_id: number
  kode_outlet: string
  buy_price?: number
  sell_price?: number
  purchase_uom?: string
  conversion_rate?: number
}

/**
 * barang_prices table - Outlet-specific product prices
 */
export interface BarangPrice {
  id: number                    // Auto-generated primary key
  barang_id: number             // References master_barang.id
  kode_outlet: string           // References master_outlet.kode_outlet
  buy_price: number             // Buy price (default 0)
  sell_price: number            // Sell price (default 0)
  updated_at: string            // Last update timestamp
  update_by: string | null      // User who updated
}

/**
 * barang_units table - Unit conversion configurations
 */
export interface BarangUnit {
  id: number                    // Auto-generated primary key
  barang_id: number             // References master_barang.id
  kode_outlet: string           // References master_outlet.kode_outlet
  base_uom: string              // Base unit of measure (default 'PCS')
  purchase_uom: string          // Purchase unit of measure (default 'PCS')
  conversion_rate: number       // Conversion rate (default 1, e.g., 1 BOX = 12 PCS)
  updated_at: string            // Last update timestamp
  update_by: string | null      // User who updated
}

/**
 * Combined type for Price/Unit management
 * Join of master_barang, barang_prices, and barang_units
 */
export interface BarangPriceUnit extends MasterBarang {
  barang_price?: BarangPrice | null
  barang_unit?: BarangUnit | null
  master_outlet?: MasterOutlet | null
}

// ============================================
// INVENTORY MODULE TYPES
// ============================================

export interface InventoryShrinkageLog {
  id: string
  document_number: string
  transaction_date: string
  kode_outlet: string
  barang_id: number
  shrinkage_category_id: string
  qty_lost: number
  notes: string | null
  created_by: string
  created_at: string
}

export interface MasterShrinkageCategory {
  id: string
  name: string
  description: string | null
  kode_outlet: string
  is_active: boolean
}

export type StockOpnameStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED'

export interface StockOpnameHeader {
  id: string
  document_number: string
  kode_outlet: string
  opname_date: string
  status: StockOpnameStatus
  notes: string | null
  created_by: string
  created_at: string
}

export interface StockOpnameItem {
  id: string
  header_id: string
  barang_id: number
  system_qty: number
  actual_qty: number
  difference: number // Generated column in DB
  notes: string | null
  // Joins
  master_barang?: MasterBarang | null
}

export interface InventoryBalance {
  barang_id: number
  kode_outlet: string
  opening_balance: number
  qty_on_hand: number
  last_movement_at: string
  date_ob: string | null
  // Joins
  master_barang?: MasterBarang | null
}

// ============================================
// PROCUREMENT MODULE TYPES
// ============================================

export type PurchaseOrderStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED' | 'PAID' | 'INVOICED'

export interface PurchaseOrder {
  id: string                      // UUID PK
  document_number: string         // e.g., "PO-2025-001"
  kode_supplier: string           // UUID FK
  kode_outlet: string             // FK
  status: PurchaseOrderStatus
  total_amount: number
  expected_delivery_date: string  // date string YYYY-MM-DD
  created_at?: string
  created_by?: string
  updated_by?: string
  // Joins
  master_supplier?: MasterSupplier | null
  master_outlet?: MasterOutlet | null
  purchase_order_items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string                      // UUID PK
  po_id: string                   // UUID FK
  barang_id: number               // Bigint FK
  qty_ordered: number
  uom_purchase: string            // e.g. "BOX"
  conversion_rate: number         // e.g. 12
  price_per_unit: number          // Price per BOX
  qty_received: number            // Tracks how many arrived so far
  // Joins
  master_barang?: MasterBarang | null
}

export interface GoodsReceipt {
  id: string                      // UUID PK
  document_number: string         // e.g., "GR-2025-001"
  po_id: string                   // UUID FK
  kode_outlet: string
  supplier_delivery_note: string  // External Ref No
  received_by: string             // UUID FK auth.uid()
  received_at?: string
  // Joins
  purchase_orders?: PurchaseOrder | null
  master_outlet?: MasterOutlet | null
  goods_receipt_items?: GoodsReceiptItem[]
  received_by_email?: string
}

export interface GoodsReceiptItem {
  id: string                      // UUID PK
  receipt_id: string              // UUID FK
  po_item_id: string              // UUID FK
  barang_id: number               // Bigint FK
  qty_received: number            // Physical count in purchase UOM
  conversion_rate: number
  // Joins
  purchase_order_items?: PurchaseOrderItem | null
}

export interface ViewPoDetailsReceived {
  po_item_id: string
  po_id: string
  kode_outlet: string
  po_created_at: string
  document_number: string
  item_name: string
  sku: string
  uom_purchase: string
  qty_ordered: number
  qty_already_received: number
  qty_remaining: number
  price_per_unit: number
  total_price_po: number
  total_price_received: number
}

// ============================================
// STOCK TRANSFER ORDER (STO) TYPES
// ============================================

export type StoStatus = 'DRAFT' | 'ISSUED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED'
export type StoRecipientStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'

export interface StoOrder {
  id: string
  document_number: string
  from_outlet: string
  to_outlet: string
  sender_status: StoStatus // DRAFT -> ISSUED -> SHIPPED
  recipient_status: StoRecipientStatus // PENDING -> ACCEPTED/REJECTED -> COMPLETED
  shipping_cost: number
  total_items_price: number
  grand_total: number
  created_at: string
  created_by: string
  // Joins
  from_master_outlet?: MasterOutlet | null
  to_master_outlet?: MasterOutlet | null
  sto_items?: StoItem[]
}

export interface StoItem {
  id: string
  sto_id: string
  barang_id: number
  qty_requested: number
  price_unit: number
  subtotal: number
  // Joins
  master_barang?: MasterBarang | null
}

export interface StoShipment {
  id: string
  sto_id: string
  document_number: string
  shipped_at: string
  shipped_by: string
  // Joins
  sto_shipment_items?: StoShipmentItem[]
}

export interface StoShipmentItem {
  id: string
  shipment_id: string
  sto_item_id: string
  barang_id: number
  qty_shipped: number
  // Joins
  sto_item?: StoItem | null
  master_barang?: MasterBarang | null
}

export interface StoReceipt {
  id: string
  sto_id: string
  document_number: string
  received_at: string
  received_by: string
  // Joins
  sto_receipt_items?: StoReceiptItem[]
}

export interface StoReceiptItem {
  id: string
  receipt_id: string
  sto_item_id: string
  barang_id: number
  qty_received: number
  // Joins
  sto_item?: StoItem | null
  master_barang?: MasterBarang | null
}

export interface StoInvoice {
  id: string
  document_number: string
  sto_id: string
  owe_to_outlet_id: string // Outlet we owe money to (Sender)
  total_amount: number
  due_date: string
  status: 'UNPAID' | 'PAID'
  created_at: string
  // Joins
  sto_order?: StoOrder | null
}


// ============================================
// FINANCE & INVOICE TYPES
// ============================================

export interface PurchaseInvoice {
  id: string
  parent_invoice_id?: string // For recursiveness if needed, or null
  document_number: string
  supplier_invoice_number: string
  invoice_date: string
  payment_due_date: string | null
  purchase_order_id: string
  status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'CANCELLED'
  total_amount: number
  notes: string | null
  created_at: string
  // Joins
  master_supplier?: MasterSupplier
  purchase_orders?: PurchaseOrder
}

export interface FinancePaymentOut {
  id: string
  document_number: string
  payment_date: string
  account_id: string
  amount: number
  notes: string | null
  created_at: string
  // Joins
  master_financial_accounts?: FinancialAccount
}

export interface FinancePaymentAllocation {
  id: string
  payment_id: string
  invoice_id: string
  allocated_amount: number
  // Joins
  finance_payments_out?: FinancePaymentOut
}


// ============================================
// LEGACY TABLE TYPES (to be deprecated)
// ============================================

export type LocationType = 'holding' | 'outlet' | 'laundry' | 'warehouse'

export interface Location {
  id: string
  name: string
  location_code: string
  location_type: LocationType
  is_active: boolean
  created_at: string
  updated_at: string
}

// Finance Types
export interface FinancialAccount {
  id: string
  kode_outlet: string
  account_name: string
  account_type: 'CASH' | 'BANK'
  bank_name?: string
  account_number?: string
  balance: number
  is_active: boolean
}

export interface FinanceTransactionCategory {
  id: string
  name: string
  type: 'IN' | 'OUT'
  description?: string
  is_active: boolean
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: UserRole
  location_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Join type with location
export interface ProfileWithLocation extends Profile {
  location: Location | null
}

// ============================================
// DATABASE ROWS TYPE
// ============================================

export type DatabaseRow = {
  // New schema
  role_user: RoleUser
  users_profile: UserProfile
  master_outlet: MasterOutlet
  group_outlet: GroupOutlet
  master_type: MasterType
  master_barang: MasterBarang
  barang_prices: BarangPrice
  barang_units: BarangUnit

  // Legacy schema
  locations: Location
  profiles: Profile
}

// ============================================
// AUTH TYPES (New Schema)
// ============================================

/**
 * AuthUser with new UserProfile schema
 */
export interface AuthUser {
  id: string
  email: string
  user_role: RoleId
  kode_outlet: string | null
  full_name?: string | null
  profile?: UserProfile
  outlet?: MasterOutlet | null
}

// ============================================
// ROLE PERMISSIONS
// ============================================

export const ROLE_LABELS: Record<RoleId, string> = {
  1: 'Admin Holding',
  2: 'Staff Holding',
  3: 'Laundry Admin',
  4: 'Laundry Staff',
  5: 'Finance',
  6: 'Outlet Admin',
  7: 'Warehouse Staff',
  8: 'Superuser',
  9: 'Unassigned',
  10: 'Finance Outlet',
}

/**
 * Menu Permissions per Role
 * Role 8 (SUPERUSER) has access to all menus
 * Role 9 (UNASSIGNED) has no access
 */
export const ROLE_MENU_PERMISSIONS: Record<RoleId, string[]> = {
  1: ['dashboard', 'inventory', 'purchase-orders', 'finance', 'users', 'product', 'price-unit', 'supplier'],      // admin_holding
  2: ['dashboard', 'inventory', 'purchase-orders'],                           // staff_holding
  3: ['dashboard', 'laundry'],                                                // laundry_admin
  4: ['dashboard', 'laundry'],                                                // laundry_staff
  5: ['dashboard', 'finance', 'product', 'price-unit', 'supplier'],                       // finance
  6: ['dashboard', 'inventory', 'product', 'price-unit', 'supplier'],                     // outlet_admin
  7: ['dashboard', 'inventory', 'purchase-orders'],                           // warehouse_staff
  8: ['*'],                                                                   // SUPERUSER - all access
  9: [],                                                                      // UNASSIGNED - no access
  10: ['dashboard', 'finance', 'product', 'price-unit', 'supplier'],          // Finance Outlet
}

/**
 * Check if a role has permission to access a menu
 */
export function hasRolePermission(roleId: RoleId, menu: string): boolean {
  const permissions = ROLE_MENU_PERMISSIONS[roleId]

  // SUPERUSER has all permissions
  if (permissions.includes('*')) return true

  // UNASSIGNED has no permissions
  if (permissions.length === 0) return false

  // Check specific permission
  return permissions.includes(menu)
}

/**
 * Check if role is SUPERUSER
 */
export function isSuperuser(roleId: RoleId): boolean {
  return roleId === 8
}

/**
 * Check if role is UNASSIGNED
 */
export function isUnassigned(roleId: RoleId): boolean {
  return roleId === 9
}

/**
 * Check if role is Holding (has access to all outlets)
 */
export function isHoldingRole(roleId: RoleId): boolean {
  return roleId === 1 || roleId === 2 || roleId === 8
}



// ============================================
// LOCATION TYPE LABELS (Legacy)
// ============================================

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  holding: 'Holding (HQ)',
  outlet: 'Outlet',
  laundry: 'Laundry',
  warehouse: 'Warehouse',
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  isSuccess: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number | null
  page: number
  pageSize: number
}

// ============================================
// FORM TYPES
// ============================================

export interface LoginFormData {
  email: string
  password: string
}

export interface UpdateProfileFormData {
  full_name: string
  phone?: string
}

// ============================================
// LOCAL STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  KODE_OUTLET: 'kode_outlet',
  USER_ROLE: 'user_role',
  USER_EMAIL: 'user_email',
} as const

// ============================================
// REPORTING TYPES
// ============================================

export interface InventoryReportItem {
  kode_outlet: string
  name_outlet?: string
  sku: string
  item_name: string
  purchase_uom: string
  qty_on_hand: number
  buy_price: number
  sell_price: number
  valuation_buy_total: number
  valuation_sell_total: number
}

export interface ApAgingItem {
  kode_supplier: string
  debtor_outlet: string
  creditor_name: string
  invoice_count: number
  total_outstanding: number
  bucket_current: number
  bucket_1_30: number
  bucket_31_60: number
  bucket_60_plus: number
}

export interface ShrinkageReportItem {
  transaction_date: string
  category_name: string
  item_name: string
  sku: string
  qty_lost: number
  total_loss_value: number
  reported_by: string
  notes: string
  kode_outlet: string
}

export interface OpnameVarianceItem {
  document_number: string
  opname_date: string
  kode_outlet: string
  sku: string
  item_name: string
  system_qty: number
  actual_qty: number
  difference: number
  unit_cost: number
  variance_value: number
}

export interface CashFlowItem {
  created_at: string
  account_name: string
  transaction_type: string
  description: string
  money_in: number
  money_out: number
  balance_after: number
  kode_outlet: string
}

export interface ViewReportProductionYield {
  document_number: string
  transaction_date: string // Date string
  finished_good_name: string
  qty_produced: number
  unit_cost_result: number
  total_production_cost: number
  ingredient_count: number
  created_by_name: string
  kode_outlet: string
}

export interface ViewReportPoOutstanding {
  document_number: string
  created_at?: never // Ensure we don't accidentally use this
  po_created_at: string
  supplier_name: string
  supplier_phone: string | null
  item_name: string
  qty_ordered: number
  qty_received: number
  qty_remaining: number
  estimated_pending_value: number
  kode_outlet: string
}

export interface ViewReportSupplierPerformance {
  supplier_name: string
  total_pos: number
  total_qty_ordered: number
  total_qty_received: number
  fulfillment_rate_percent: number
  total_spend: number
  kode_outlet: string
}

export interface ViewReportPurchaseInvoices {
  invoice_id: string
  invoice_date: string
  invoice_doc: string           // Was invoice_doc_number
  supplier_invoice_number: string
  supplier_name: string
  kode_supplier: string         // Added
  po_doc: string                // Was po_doc_number
  purchase_order_id: string     // Was po_id
  status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'CANCELLED'
  total_amount: number
  total_paid_amount: number | null // Added
  payment_due_date: string | null // Added
  kode_outlet: string
  payment_history: {               // Added JSON column
    payment_date: string
    document_number: string
    method: string
    amount: number
  }[] | null
}

export interface ViewReportPurchaseOrders {
  po_id: string
  po_date: string
  po_doc_number: string
  supplier_name: string
  status: PurchaseOrderStatus
  expected_delivery_date: string | null
  grand_total: number
  linked_invoice_id: string | null
  kode_outlet: string
}
