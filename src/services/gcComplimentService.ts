import { supabase } from '@/lib/supabase'
import {
  renderGcVoucherBlob,
  uploadGcVoucherImage,
} from '@/utils/gcVoucherImageGenerator'

export type GcComplimentTriState = 'ALL' | 'TRUE' | 'FALSE'
export type GcComplimentValidityMonths = 1 | 2 | 3 | 4

export interface WebServiceOption {
  id: string
  service_code: string
  name: string
  category: string
  duration_minutes: number
  image_url: string | null
}

export interface GcComplimentRow {
  uid: string
  gc_number: string
  gc_barcode: string
  qrcode: string
  pack_number: string | null
  web_service_id: string | null
  service_name: string | null
  service_category: string | null
  duration_minutes: number | null
  background_image_url: string | null
  nama_gc: string
  harga_jasa: number
  harga_jual: number
  kode_outlet: string
  image_url: string | null
  is_active: boolean
  is_sold: boolean
  has_used: boolean
  used_at: string | null
  kode_outlet_used: string | null
  outlet_used_name: string | null
  expired_date: string | null
  validity_months: number | null
  id_payment_buy: string | null
  activated_at: string | null
  activated_by: string | null
  activated_by_name: string | null
  notes: string | null
  email_sent_to: string | null
  email_sent_at: string | null
  created_at: string
  created_by: string | null
  created_by_name: string | null
}

export interface GcComplimentSummary {
  total_count: number
  total_harga_jasa: number
  draft_count: number
  active_unused_count: number
  used_count: number
}

export interface GcComplimentPagination {
  page: number
  page_size: number
  total_count: number
  total_pages: number
}

export interface GcComplimentListResponse {
  summary: GcComplimentSummary
  pagination: GcComplimentPagination
  rows: GcComplimentRow[]
}

export interface GcComplimentListParams {
  startDate: string | null
  endDate: string | null
  isActive: GcComplimentTriState
  hasUsed: GcComplimentTriState
  webServiceId: string | 'ALL'
  search: string
  page: number
  pageSize: number
}

export interface GenerateGcComplimentInput {
  prefix: string
  startNumber: number
  count: number
  webServiceId: string
  namaGc: string
  hargaJasa: number
  hargaJual: number
  notes?: string
}

export interface GenerateGcComplimentResult {
  count: number
  rows: GcComplimentRow[]
}

export interface ActivatedGcImageTarget {
  uid: string
  gc_number: string
  gc_barcode: string
  qrcode: string
  pack_number: string | null
  nama_gc: string
  duration_minutes: number | null
  background_image_url: string | null
  expired_date: string | null
  validity_months: number | null
  id_payment_buy: string | null
  activated_at: string | null
}

export interface ActivateGcComplimentResult {
  id_payment_buy: string
  pack_number: string
  buy_at: string
  original_buy_at: string | null
  activated_at: string
  validity_months: GcComplimentValidityMonths
  validity_days: number
  expired_date: string
  activated_count: number
  rows: ActivatedGcImageTarget[]
}

export type VoucherImageTarget = Pick<
  GcComplimentRow,
  | 'uid'
  | 'gc_number'
  | 'gc_barcode'
  | 'qrcode'
  | 'nama_gc'
  | 'duration_minutes'
  | 'background_image_url'
  | 'expired_date'
>

export const gcComplimentService = {
  async getActiveWebServices(): Promise<WebServiceOption[]> {
    const { data, error } = await supabase
      .from('web_services')
      .select('id, service_code, name, category, duration_minutes, image_url')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message || 'Gagal memuat daftar layanan web_services.')
    }

    return (data || []) as WebServiceOption[]
  },

  async getList(params: GcComplimentListParams): Promise<GcComplimentListResponse> {
    const { data, error } = await supabase.rpc('get_pos_gc_compliment_list', {
      p_start_date: params.startDate || null,
      p_end_date: params.endDate || null,
      p_is_active: params.isActive || 'ALL',
      p_has_used: params.hasUsed || 'ALL',
      p_web_service_id:
        params.webServiceId && params.webServiceId !== 'ALL' ? params.webServiceId : null,
      p_search: params.search.trim() || null,
      p_page: params.page,
      p_page_size: params.pageSize,
    })

    if (error) {
      throw new Error(error.message || 'Gagal memuat daftar GC Compliment.')
    }

    if (!data) {
      throw new Error('Data GC Compliment tidak tersedia.')
    }

    return data as GcComplimentListResponse
  },

  async generateBatch(input: GenerateGcComplimentInput): Promise<GenerateGcComplimentResult> {
    const { data, error } = await supabase.rpc('generate_pos_gc_compliments', {
      p_prefix: input.prefix.trim(),
      p_start_number: input.startNumber,
      p_count: input.count,
      p_web_service_id: input.webServiceId,
      p_nama_gc: input.namaGc.trim(),
      p_harga_jasa: input.hargaJasa,
      p_harga_jual: input.hargaJual,
      p_notes: input.notes?.trim() || null,
    })

    if (error) {
      throw new Error(error.message || 'Gagal membuat batch GC Compliment.')
    }

    if (!data) {
      throw new Error('Respons pembuatan GC Compliment tidak valid.')
    }

    return data as GenerateGcComplimentResult
  },

  async renderAndUploadVoucherImages(
    targets: VoucherImageTarget[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ updated: { uid: string; image_url: string }[]; failedCount: number }> {
    const total = targets.length
    if (total === 0) {
      return { updated: [], failedCount: 0 }
    }

    const updated: { uid: string; image_url: string }[] = []
    let failedCount = 0
    let completed = 0
    const CHUNK_SIZE = 3

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = targets.slice(i, i + CHUNK_SIZE)
      const chunkResults = await Promise.all(
        chunk.map(async (row) => {
          try {
            const blob = await renderGcVoucherBlob({
              gcNumber: row.gc_number,
              gcBarcode: row.gc_barcode,
              qrcode: row.qrcode,
              namaGc: row.nama_gc,
              durationMinutes: row.duration_minutes,
              backgroundImageUrl: row.background_image_url,
              expiredDate: row.expired_date,
            })
            const publicUrl = await uploadGcVoucherImage(row.gc_number, blob)
            return { uid: row.uid, image_url: publicUrl }
          } catch {
            return null
          }
        })
      )

      for (const item of chunkResults) {
        completed += 1
        if (item) {
          updated.push(item)
        } else {
          failedCount += 1
        }
        onProgress?.(completed, total)
      }
    }

    if (updated.length > 0) {
      const { error } = await supabase.rpc('update_pos_gc_compliment_images', {
        p_items: updated,
      })
      if (error) {
        throw new Error(error.message || 'Gagal menyimpan URL gambar GC ke database.')
      }
    }

    return { updated, failedCount }
  },

  async activateBatch(
    gcUids: string[],
    packNumber: string,
    validityMonths: GcComplimentValidityMonths = 1,
    timezone?: string
  ): Promise<ActivateGcComplimentResult> {
    const resolvedTimezone =
      timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'

    const { data, error } = await supabase.rpc('activate_pos_gc_compliments', {
      p_gc_uids: gcUids,
      p_pack_number: packNumber.trim(),
      p_validity_months: validityMonths,
      p_timezone: resolvedTimezone,
    })

    if (error) {
      throw new Error(error.message || 'Gagal mengaktifkan GC Compliment.')
    }

    if (!data) {
      throw new Error('Respons aktivasi GC Compliment tidak valid.')
    }

    return data as ActivateGcComplimentResult
  },
}
