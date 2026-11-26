import { supabase } from '@/lib/supabase'
import type { MasterOutlet } from '@/types/database'

export type GcDateField = 'BUY_AT' | 'USED_AT'
export type GcOutletScope = 'ALL_OWN' | 'BUY_OWN' | 'USED_OWN'
export type GcTriState = 'ALL' | 'TRUE' | 'FALSE'
export type GcExpiredFilter = 'ALL' | 'EXPIRED' | 'VALID' | 'EXPIRING_SOON'
export type GcCrossOutletFilter = 'ALL' | 'CROSS_ONLY'

export interface GcTransactionRow {
  uid: string
  user_uid: string | null
  gc_number: string | null
  gc_barcode: string | null
  pack_number: string | null
  nama_gc: string | null
  value: number
  buy_at: string | null
  used_at: string | null
  has_used: boolean
  id_payment_buy: string | null
  id_payment_used: string | null
  kode_outlet_buy: string | null
  outlet_buy_name: string | null
  kode_outlet_used: string | null
  outlet_used_name: string | null
  expired_date: string | null
  is_active: boolean
  qrcode: string | null
  created_at: string | null
  is_expired: boolean
}

export interface GcListSummary {
  total_count: number
  total_value: number
  unused_valid_count: number
  unused_valid_value: number
  used_count: number
  used_value: number
  expired_count: number
  expired_value: number
  cross_outlet_count: number
  cross_outlet_value: number
}

export interface GcListPagination {
  page: number
  page_size: number
  total_count: number
  total_pages: number
}

export interface GcListResponse {
  summary: GcListSummary
  pagination: GcListPagination
  search_bypassed_date: boolean
  is_outlet_locked: boolean
  locked_outlet: string | null
  rows: GcTransactionRow[]
}

export interface GcListQueryParams {
  dateField: GcDateField
  startDate: string | null
  endDate: string | null
  outletBuy: string
  outletUsed: string
  outletScope: GcOutletScope
  hasUsed: GcTriState
  expiredFilter: GcExpiredFilter
  isActive: GcTriState
  crossOutlet: GcCrossOutletFilter
  search: string
  page: number
  pageSize: number
}

export const gcListService = {
  /**
   * Memanggil RPC terpusat public.get_pos_gc_list(...) untuk mengambil data
   * ot_pos_gc_transaction berpaginasi server-side beserta ringkasan nilai & jumlah.
   */
  async getPosGcList(params: GcListQueryParams): Promise<GcListResponse> {
    const { data, error } = await supabase.rpc('get_pos_gc_list', {
      p_date_field: params.dateField,
      p_start_date: params.startDate || null,
      p_end_date: params.endDate || null,
      p_outlet_buy: params.outletBuy || 'ALL',
      p_outlet_used: params.outletUsed || 'ALL',
      p_outlet_scope: params.outletScope || 'ALL_OWN',
      p_has_used: params.hasUsed || 'ALL',
      p_expired_filter: params.expiredFilter || 'ALL',
      p_is_active: params.isActive || 'ALL',
      p_cross_outlet: params.crossOutlet || 'ALL',
      p_search: params.search.trim() || null,
      p_page: params.page,
      p_page_size: params.pageSize,
    })

    if (error) {
      throw new Error(error.message || 'Gagal memuat daftar Gift Certificate.')
    }

    if (!data) {
      throw new Error('Data Gift Certificate tidak tersedia.')
    }

    return data as GcListResponse
  },

  /**
   * Memuat seluruh outlet POS yang aktif (master_outlet.active = true)
   * untuk filter Outlet Beli & Outlet Pakai.
   */
  async getAllPosOutlets(): Promise<MasterOutlet[]> {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('kode_outlet, name_outlet, alamat, city, no_telp, email, active')
      .eq('active', true)
      .order('kode_outlet', { ascending: true })

    if (error) {
      throw new Error(error.message || 'Gagal memuat daftar outlet.')
    }

    return (data || []) as MasterOutlet[]
  },
}
