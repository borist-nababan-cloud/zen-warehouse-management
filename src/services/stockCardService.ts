import { supabase } from '@/lib/supabase'

export type StockCardMode = 'ALL' | 'RANGE'

export type StockCardSourceCode =
  | 'GR'
  | 'STO_IN'
  | 'STO_OUT'
  | 'STO_REJECT'
  | 'PROD_IN'
  | 'PROD_OUT'
  | 'USAGE'
  | 'RETURN'
  | 'SHRINKAGE'
  | 'CST_SALE'
  | 'OPNAME'
  | 'PURCHASE_RETURN'

export interface StockCardItemInfo {
  barang_id: number
  sku: string
  name: string
  uom: string
  image1_url: string | null
  image2_url: string | null
}

export interface StockCardOutletInfo {
  kode_outlet: string
  name_outlet: string
  alamat: string | null
  city: string | null
  no_telp: string | null
  email: string | null
}

export interface StockCardSummary {
  opening_balance: number
  opening_date: string
  opening_label: string
  total_in: number
  total_out: number
  closing_balance: number
  calculated_current_balance: number
  system_qty_on_hand: number
  db_opening_balance_snapshot: number
  db_date_ob: string | null
  last_movement_at: string | null
  discrepancy: number
  is_balanced: boolean
  opname_mismatch_count: number
}

export interface StockCardRow {
  id: string
  event_ts: string
  event_date: string
  source_code: StockCardSourceCode
  source_label: string
  doc_number: string
  description: string
  in_qty: number
  out_qty: number
  balance_before: number
  balance: number
  opname_system_qty: number | null
  opname_actual_qty: number | null
  has_opname_mismatch: boolean
}

export interface StockCardResponse {
  item: StockCardItemInfo
  outlet: StockCardOutletInfo
  filter: {
    mode: StockCardMode
    start_date: string | null
    end_date: string | null
  }
  summary: StockCardSummary
  rows: StockCardRow[]
}

export interface OutletStockItemOption {
  barang_id: number
  sku: string
  name: string
  uom: string
  qty_on_hand: number
  image1_url: string | null
}

export const stockCardService = {
  /**
   * Memuat seluruh item yang relevan untuk satu outlet:
   * - Barang yang sudah ada di view_inventory_report / inventory_balance outlet tsb (termasuk hasil STO)
   * - Barang milik outlet tsb dan holding (901) dari master_barang
   */
  async getOutletItemsForStockCard(kodeOutlet: string): Promise<OutletStockItemOption[]> {
    if (!kodeOutlet) return []

    const [invRes, barangRes, unitsRes] = await Promise.all([
      supabase
        .from('view_inventory_report')
        .select('barang_id, sku, item_name, qty_on_hand, purchase_uom, base_uom, image1_url')
        .eq('kode_outlet', kodeOutlet),
      supabase
        .from('master_barang')
        .select('id, sku, name, kode_outlet, image1_url')
        .eq('deleted', false)
        .in('kode_outlet', Array.from(new Set([kodeOutlet, '901']))),
      supabase
        .from('barang_units')
        .select('barang_id, kode_outlet, base_uom, purchase_uom')
        .in('kode_outlet', Array.from(new Set([kodeOutlet, '901']))),
    ])

    if (invRes.error) throw invRes.error
    if (barangRes.error) throw barangRes.error

    const uomMap = new Map<number, string>()
    ;(unitsRes.data || []).forEach((u: { barang_id: number; kode_outlet: string; base_uom?: string; purchase_uom?: string }) => {
      const id = Number(u.barang_id)
      const uom = u.base_uom || u.purchase_uom || 'PCS'
      if (!uomMap.has(id) || u.kode_outlet === kodeOutlet) {
        uomMap.set(id, uom)
      }
    })

    const itemMap = new Map<number, OutletStockItemOption>()

    ;(invRes.data || []).forEach((row: {
      barang_id: number
      sku?: string
      item_name?: string
      qty_on_hand?: number
      purchase_uom?: string
      base_uom?: string
      image1_url?: string | null
    }) => {
      const id = Number(row.barang_id)
      if (!id) return
      itemMap.set(id, {
        barang_id: id,
        sku: row.sku || '-',
        name: row.item_name || 'Tanpa Nama',
        uom: row.base_uom || row.purchase_uom || uomMap.get(id) || 'PCS',
        qty_on_hand: Number(row.qty_on_hand || 0),
        image1_url: row.image1_url || null,
      })
    })

    ;(barangRes.data || []).forEach((mb: {
      id: number
      sku?: string
      name?: string
      image1_url?: string | null
    }) => {
      const id = Number(mb.id)
      if (!id || itemMap.has(id)) return
      itemMap.set(id, {
        barang_id: id,
        sku: mb.sku || '-',
        name: mb.name || 'Tanpa Nama',
        uom: uomMap.get(id) || 'PCS',
        qty_on_hand: 0,
        image1_url: mb.image1_url || null,
      })
    })

    return Array.from(itemMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'id')
    )
  },

  async getStockCard(params: {
    kodeOutlet: string
    barangId: number
    mode: StockCardMode
    startDate?: string | null
    endDate?: string | null
  }): Promise<StockCardResponse> {
    const { data, error } = await supabase.rpc('get_stock_card', {
      p_kode_outlet: params.kodeOutlet,
      p_barang_id: params.barangId,
      p_mode: params.mode,
      p_start_date: params.mode === 'RANGE' ? params.startDate || null : null,
      p_end_date: params.mode === 'RANGE' ? params.endDate || null : null,
    })

    if (error) {
      throw new Error(error.message || 'Gagal memuat data Kartu Stok.')
    }

    if (!data) {
      throw new Error('Data Kartu Stok tidak tersedia.')
    }

    return data as StockCardResponse
  },
}
