import { supabase } from '@/lib/supabase'
import {
  ApiResponse,
  CstInvoice,
  CstSalesOrder,
  CstSalesOrderStatus,
  CstShipment,
  MasterBarang,
} from '@/types/database'

export interface OutletProductStockPrice {
  barang: MasterBarang
  qty_on_hand: number
  uom: string
  sell_price: number
}

export interface CreateSalesOrderPayload {
  document_number: string
  kode_outlet: string
  kode_customer: string
  order_date: string
  expected_delivery_date?: string | null
  shipping_cost: number
  total_items_amount: number
  total_amount: number
  status: 'DRAFT' | 'ISSUED'
  notes?: string | null
  created_by: string
  items: {
    barang_id: number
    qty_ordered: number
    uom: string
    price_per_unit: number
    subtotal: number
  }[]
}

export interface UpdateSalesOrderPayload {
  kode_customer: string
  order_date: string
  expected_delivery_date?: string | null
  shipping_cost: number
  total_items_amount: number
  total_amount: number
  status: 'DRAFT' | 'ISSUED'
  notes?: string | null
  update_by: string
  items: {
    barang_id: number
    qty_ordered: number
    uom: string
    price_per_unit: number
    subtotal: number
  }[]
}

export interface CreateCstShipmentPayload {
  so_id: string
  kode_outlet: string
  kode_customer: string
  shipped_by: string
  image_url?: string | null
  notes?: string | null
  items: {
    so_item_id: string
    barang_id: number
    qty_shipped: number
  }[]
}

export interface CreateCstInvoicePayload {
  so_id: string
  shipment_id: string
  kode_outlet: string
  kode_customer: string
  invoice_date: string
  due_date?: string | null
  subtotal_items: number
  discount_amount: number
  use_tax: boolean
  tax_percent: number
  tax_amount: number
  shipping_cost: number
  grand_total: number
  notes?: string | null
  created_by: string
}

export interface CstShipmentItemReportRow {
  id: string
  shipment_id: string
  shipment_doc_number: string
  shipment_date: string
  so_id: string
  so_doc_number: string
  kode_outlet: string
  name_outlet: string
  kode_customer: string
  customer_name: string
  barang_id: number
  sku: string
  item_name: string
  uom: string
  qty_ordered: number
  qty_shipped: number
  image_url: string | null
}

async function generateSequentialDocNumber(
  table: 'cst_sales_orders' | 'cst_shipments' | 'cst_invoices',
  prefix: string,
  kode_outlet: string
): Promise<string> {
  const now = new Date()
  const yy = now.getFullYear().toString().slice(-2)
  const mm = (now.getMonth() + 1).toString().padStart(2, '0')
  const docPrefix = `${prefix}-${kode_outlet}-${yy}${mm}-`

  const { data } = await supabase
    .from(table)
    .select('document_number')
    .like('document_number', `${docPrefix}%`)
    .order('document_number', { ascending: false })
    .limit(1)

  let nextSeq = 1
  if (data && data.length > 0 && data[0].document_number) {
    const parts = data[0].document_number.split('-')
    const lastPart = parts[parts.length - 1]
    const parsed = parseInt(lastPart, 10)
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1
    }
  }

  return `${docPrefix}${nextSeq.toString().padStart(4, '0')}`
}

export const customerSalesService = {
  async generateNextSoNumber(kode_outlet: string): Promise<string> {
    return generateSequentialDocNumber('cst_sales_orders', 'SO', kode_outlet)
  },

  async generateNextSjNumber(kode_outlet: string): Promise<string> {
    return generateSequentialDocNumber('cst_shipments', 'SJ', kode_outlet)
  },

  async generateNextInvoiceNumber(kode_outlet: string): Promise<string> {
    return generateSequentialDocNumber('cst_invoices', 'INV-CST', kode_outlet)
  },

  /**
   * Fetch all products present in the outlet's inventory (via view_inventory_report,
   * matching InventoryQtyReportPage & InventoryReportPage) plus any outlet-owned
   * master_barang entries not yet recorded in inventory_balance.
   */
  async getOutletProductsWithStockAndPrice(
    kode_outlet: string
  ): Promise<OutletProductStockPrice[]> {
    const [invViewRes, barangRes, unitRes, priceRes] = await Promise.all([
      supabase
        .from('view_inventory_report')
        .select('*')
        .eq('kode_outlet', kode_outlet)
        .order('item_name', { ascending: true }),
      supabase
        .from('master_barang')
        .select('*')
        .eq('kode_outlet', kode_outlet)
        .eq('deleted', false)
        .order('name', { ascending: true }),
      supabase
        .from('barang_units')
        .select('barang_id, base_uom, purchase_uom')
        .eq('kode_outlet', kode_outlet),
      supabase
        .from('barang_prices')
        .select('barang_id, sell_price')
        .eq('kode_outlet', kode_outlet),
    ])

    if (invViewRes.error) throw invViewRes.error
    if (barangRes.error) throw barangRes.error

    const unitMap = new Map<number, string>()
    ;(unitRes.data || []).forEach((u: any) => {
      unitMap.set(Number(u.barang_id), u.base_uom || u.purchase_uom || 'PCS')
    })

    const priceMap = new Map<number, number>()
    ;(priceRes.data || []).forEach((p: any) => {
      priceMap.set(Number(p.barang_id), Number(p.sell_price || 0))
    })

    const productMap = new Map<number, OutletProductStockPrice>()

    // 1. Primary source: view_inventory_report (includes STO/cross-outlet items in inventory_balance)
    ;(invViewRes.data || []).forEach((row: any) => {
      const barangId = Number(row.barang_id)
      if (!barangId) return
      productMap.set(barangId, {
        barang: {
          id: barangId,
          sku: row.sku || '',
          created_at: '',
          id_type: null,
          kode_outlet: row.kode_outlet || kode_outlet,
          name: row.item_name || '',
          deleted: false,
          image1_url: row.image1_url || null,
          iamge2_url: null,
        },
        qty_on_hand: Number(row.qty_on_hand || 0),
        uom: row.purchase_uom || row.base_uom || unitMap.get(barangId) || 'PCS',
        sell_price: Number(row.sell_price ?? priceMap.get(barangId) ?? 0),
      })
    })

    // 2. Include any outlet-owned master_barang not yet present in inventory_balance
    ;((barangRes.data || []) as MasterBarang[]).forEach((barang) => {
      if (!productMap.has(barang.id)) {
        productMap.set(barang.id, {
          barang,
          qty_on_hand: 0,
          uom: unitMap.get(barang.id) || 'PCS',
          sell_price: priceMap.get(barang.id) ?? 0,
        })
      }
    })

    return Array.from(productMap.values()).sort((a, b) =>
      (a.barang.name || '').localeCompare(b.barang.name || '', 'id')
    )
  },

  async getSalesOrders(filters?: {
    kode_outlet?: string
    statuses?: CstSalesOrderStatus[]
    startDate?: string
    endDate?: string
    customerSearch?: string
  }): Promise<ApiResponse<CstSalesOrder[]>> {
    try {
      let query = supabase
        .from('cst_sales_orders')
        .select(`
          *,
          master_customer (*),
          master_outlet (*),
          cst_sales_order_items (
            *,
            master_barang (*)
          ),
          cst_shipments (
            *,
            cst_shipment_items (
              *,
              master_barang (*)
            )
          ),
          cst_invoices (*)
        `)
        .order('created_at', { ascending: false })

      if (filters?.kode_outlet && filters.kode_outlet !== 'ALL') {
        query = query.eq('kode_outlet', filters.kode_outlet)
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
      }

      if (filters?.startDate) {
        query = query.gte('order_date', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('order_date', filters.endDate)
      }

      const { data, error } = await query
      if (error) throw error

      let rows = (data || []) as CstSalesOrder[]
      if (filters?.customerSearch && filters.customerSearch.trim() !== '') {
        const q = filters.customerSearch.trim().toLowerCase()
        rows = rows.filter(
          (r) =>
            r.master_customer?.name?.toLowerCase().includes(q) ||
            r.document_number?.toLowerCase().includes(q)
        )
      }

      return { data: rows, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error fetching sales orders:', error)
      return {
        data: null,
        error: error.message || 'Gagal memuat daftar pesanan penjualan',
        isSuccess: false,
      }
    }
  },

  async getSalesOrderById(id: string): Promise<ApiResponse<CstSalesOrder>> {
    try {
      const { data, error } = await supabase
        .from('cst_sales_orders')
        .select(`
          *,
          master_customer (*),
          master_outlet (*),
          cst_sales_order_items (
            *,
            master_barang (*)
          ),
          cst_shipments (
            *,
            cst_shipment_items (
              *,
              master_barang (*)
            )
          ),
          cst_invoices (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return { data: data as CstSalesOrder, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error fetching sales order detail:', error)
      return {
        data: null,
        error: error.message || 'Gagal memuat rincian pesanan penjualan',
        isSuccess: false,
      }
    }
  },

  async createSalesOrder(payload: CreateSalesOrderPayload): Promise<ApiResponse<CstSalesOrder>> {
    try {
      const { data: header, error: headerError } = await supabase
        .from('cst_sales_orders')
        .insert({
          document_number: payload.document_number,
          kode_outlet: payload.kode_outlet,
          kode_customer: payload.kode_customer,
          order_date: payload.order_date,
          expected_delivery_date: payload.expected_delivery_date || null,
          shipping_cost: payload.shipping_cost,
          total_items_amount: payload.total_items_amount,
          total_amount: payload.total_amount,
          status: payload.status,
          notes: payload.notes || null,
          created_by: payload.created_by,
          update_by: payload.created_by,
        })
        .select()
        .single()

      if (headerError) throw headerError

      const itemsData = payload.items.map((item) => ({
        so_id: header.id,
        barang_id: item.barang_id,
        qty_ordered: item.qty_ordered,
        uom: item.uom,
        price_per_unit: item.price_per_unit,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase
        .from('cst_sales_order_items')
        .insert(itemsData)

      if (itemsError) {
        await supabase.from('cst_sales_orders').delete().eq('id', header.id)
        throw itemsError
      }

      return { data: header as CstSalesOrder, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error creating sales order:', error)
      return {
        data: null,
        error: error.message || 'Gagal membuat pesanan penjualan',
        isSuccess: false,
      }
    }
  },

  async updateSalesOrder(
    id: string,
    payload: UpdateSalesOrderPayload
  ): Promise<ApiResponse<CstSalesOrder>> {
    try {
      const { data: header, error: headerError } = await supabase
        .from('cst_sales_orders')
        .update({
          kode_customer: payload.kode_customer,
          order_date: payload.order_date,
          expected_delivery_date: payload.expected_delivery_date || null,
          shipping_cost: payload.shipping_cost,
          total_items_amount: payload.total_items_amount,
          total_amount: payload.total_amount,
          status: payload.status,
          notes: payload.notes || null,
          update_by: payload.update_by,
          update_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (headerError) throw headerError

      const { error: delError } = await supabase
        .from('cst_sales_order_items')
        .delete()
        .eq('so_id', id)

      if (delError) throw delError

      const itemsData = payload.items.map((item) => ({
        so_id: id,
        barang_id: item.barang_id,
        qty_ordered: item.qty_ordered,
        uom: item.uom,
        price_per_unit: item.price_per_unit,
        subtotal: item.subtotal,
      }))

      const { error: insError } = await supabase
        .from('cst_sales_order_items')
        .insert(itemsData)

      if (insError) throw insError

      return { data: header as CstSalesOrder, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error updating sales order:', error)
      return {
        data: null,
        error: error.message || 'Gagal memperbarui pesanan penjualan',
        isSuccess: false,
      }
    }
  },

  async updateSalesOrderStatus(
    id: string,
    status: CstSalesOrderStatus,
    userId?: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('cst_sales_orders')
        .update({
          status,
          update_by: userId || null,
          update_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error updating sales order status:', error)
      return {
        data: null,
        error: error.message || 'Gagal mengubah status pesanan penjualan',
        isSuccess: false,
      }
    }
  },

  async createCstShipment(payload: CreateCstShipmentPayload): Promise<ApiResponse<CstShipment>> {
    try {
      const docNumber = await this.generateNextSjNumber(payload.kode_outlet)

      const { data: shipment, error: headerError } = await supabase
        .from('cst_shipments')
        .insert({
          document_number: docNumber,
          so_id: payload.so_id,
          kode_outlet: payload.kode_outlet,
          kode_customer: payload.kode_customer,
          shipped_by: payload.shipped_by,
          image_url: payload.image_url || null,
          notes: payload.notes || null,
        })
        .select()
        .single()

      if (headerError) throw headerError

      const itemsData = payload.items.map((item) => ({
        shipment_id: shipment.id,
        so_item_id: item.so_item_id,
        barang_id: item.barang_id,
        qty_shipped: item.qty_shipped,
      }))

      const { error: itemsError } = await supabase
        .from('cst_shipment_items')
        .insert(itemsData)

      if (itemsError) {
        await supabase.from('cst_shipments').delete().eq('id', shipment.id)
        throw itemsError
      }

      const { error: statusError } = await supabase
        .from('cst_sales_orders')
        .update({
          status: 'SHIPPED',
          update_by: payload.shipped_by,
          update_at: new Date().toISOString(),
        })
        .eq('id', payload.so_id)

      if (statusError) throw statusError

      return { data: shipment as CstShipment, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error creating customer shipment:', error)
      return {
        data: null,
        error: error.message || 'Gagal memproses pengiriman barang',
        isSuccess: false,
      }
    }
  },

  async createCstInvoice(payload: CreateCstInvoicePayload): Promise<ApiResponse<CstInvoice>> {
    try {
      const docNumber = await this.generateNextInvoiceNumber(payload.kode_outlet)

      const { data: invoice, error: invError } = await supabase
        .from('cst_invoices')
        .insert({
          document_number: docNumber,
          so_id: payload.so_id,
          shipment_id: payload.shipment_id,
          kode_outlet: payload.kode_outlet,
          kode_customer: payload.kode_customer,
          invoice_date: payload.invoice_date,
          due_date: payload.due_date || null,
          subtotal_items: payload.subtotal_items,
          discount_amount: payload.discount_amount,
          use_tax: payload.use_tax,
          tax_percent: payload.tax_percent,
          tax_amount: payload.tax_amount,
          shipping_cost: payload.shipping_cost,
          grand_total: payload.grand_total,
          payment_status: 'UNPAID',
          notes: payload.notes || null,
          created_by: payload.created_by,
          update_by: payload.created_by,
        })
        .select()
        .single()

      if (invError) throw invError

      const { error: soError } = await supabase
        .from('cst_sales_orders')
        .update({
          status: 'INVOICED',
          update_by: payload.created_by,
          update_at: new Date().toISOString(),
        })
        .eq('id', payload.so_id)

      if (soError) throw soError

      return { data: invoice as CstInvoice, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error creating customer invoice:', error)
      return {
        data: null,
        error: error.message || 'Gagal menerbitkan faktur penjualan',
        isSuccess: false,
      }
    }
  },

  async getShipmentItemsReport(filters: {
    kode_outlet?: string
    startDate?: string
    endDate?: string
    customerSearch?: string
  }): Promise<ApiResponse<CstShipmentItemReportRow[]>> {
    try {
      let query = supabase
        .from('cst_shipments')
        .select(`
          id,
          document_number,
          shipment_date,
          so_id,
          kode_outlet,
          kode_customer,
          image_url,
          master_outlet (name_outlet),
          master_customer (name),
          cst_sales_orders (document_number),
          cst_shipment_items (
            id,
            barang_id,
            qty_shipped,
            master_barang (name, sku),
            cst_sales_order_items (qty_ordered, uom)
          )
        `)
        .order('shipment_date', { ascending: false })

      if (filters.kode_outlet && filters.kode_outlet !== 'ALL') {
        query = query.eq('kode_outlet', filters.kode_outlet)
      }

      if (filters.startDate) {
        query = query.gte('shipment_date', `${filters.startDate}T00:00:00+07:00`)
      }

      if (filters.endDate) {
        query = query.lte('shipment_date', `${filters.endDate}T23:59:59.999+07:00`)
      }

      const { data, error } = await query
      if (error) throw error

      const searchLower = filters.customerSearch?.trim().toLowerCase() || ''
      const rows: CstShipmentItemReportRow[] = []

      ;(data || []).forEach((shp: any) => {
        const custName = shp.master_customer?.name || '-'
        if (searchLower && !custName.toLowerCase().includes(searchLower)) {
          return
        }

        const outletName = shp.master_outlet?.name_outlet || shp.kode_outlet
        const soDoc = shp.cst_sales_orders?.document_number || '-'

        ;(shp.cst_shipment_items || []).forEach((item: any) => {
          rows.push({
            id: item.id,
            shipment_id: shp.id,
            shipment_doc_number: shp.document_number,
            shipment_date: shp.shipment_date,
            so_id: shp.so_id,
            so_doc_number: soDoc,
            kode_outlet: shp.kode_outlet,
            name_outlet: outletName,
            kode_customer: shp.kode_customer,
            customer_name: custName,
            barang_id: item.barang_id,
            sku: item.master_barang?.sku || '-',
            item_name: item.master_barang?.name || '-',
            uom: item.cst_sales_order_items?.uom || 'PCS',
            qty_ordered: Number(item.cst_sales_order_items?.qty_ordered || 0),
            qty_shipped: Number(item.qty_shipped || 0),
            image_url: shp.image_url || null,
          })
        })
      })

      return { data: rows, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error fetching shipment items report:', error)
      return {
        data: null,
        error: error.message || 'Gagal memuat laporan pengiriman barang',
        isSuccess: false,
      }
    }
  },

  async getCustomerInvoices(filters: {
    kode_outlet: string
    payment_status?: 'UNPAID' | 'PAID' | 'ALL'
  }): Promise<ApiResponse<CstInvoice[]>> {
    try {
      let query = supabase
        .from('cst_invoices')
        .select(`
          *,
          master_customer (*),
          master_outlet (*),
          cst_sales_orders (document_number, order_date),
          cst_shipments (document_number, shipment_date)
        `)
        .eq('kode_outlet', filters.kode_outlet)
        .order('created_at', { ascending: false })

      if (filters.payment_status && filters.payment_status !== 'ALL') {
        query = query.eq('payment_status', filters.payment_status)
      }

      const { data, error } = await query
      if (error) throw error

      return { data: (data || []) as CstInvoice[], error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error fetching customer invoices:', error)
      return {
        data: null,
        error: error.message || 'Gagal memuat daftar faktur penjualan',
        isSuccess: false,
      }
    }
  },

  async getOutletFinancialAccounts(kode_outlet: string) {
    const { data, error } = await supabase
      .from('master_financial_accounts')
      .select('id, account_name, bank_name, account_number, balance')
      .eq('kode_outlet', kode_outlet)
      .eq('is_active', true)
      .order('account_name')

    if (error) throw error
    return data || []
  },

  async confirmCustomerPayment(payload: {
    invoice_id: string
    account_id: string
    received_date: string
    notes?: string
  }) {
    const { data, error } = await supabase.rpc('confirm_cst_payment_receipt', {
      p_invoice_id: payload.invoice_id,
      p_account_id: payload.account_id,
      p_received_date: payload.received_date,
      p_notes: payload.notes || null,
    })

    if (error) throw error
    return data
  },
}
