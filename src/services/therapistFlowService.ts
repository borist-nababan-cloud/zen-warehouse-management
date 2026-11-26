import { supabase } from '@/lib/supabase'
import type { MasterOutlet } from '@/types/database'

export interface TherapistFlowGuest {
  trans_id: string
  start_time: string | null
  end_time: string | null
  nama_customer: string | null
  room_id: string | null
  status_trans: string | null
  byrequest: string | null
  typejasa: string | null
  rcpt: string | null
}

export type TherapistFlowAttendanceStatus = 'PRESENT' | 'CLOCKED_OUT' | 'ABSENT'

export interface TherapistFlowRow {
  kodekaryawan: string
  idkaryawan: string
  namakaryawan: string
  departemen: 'TB' | 'TR'
  ngroup: string
  noslot: string
  attendance_status: TherapistFlowAttendanceStatus
  fp_in: string | null
  fp_out: string | null
  fp_in_wib: string | null
  fp_out_wib: string | null
  total_guests: number
  active_started_count: number
  guests: TherapistFlowGuest[]
}

export interface TherapistFlowMaster {
  status_slot: 0 | 1
  direction: 'ASC' | 'DESC'
  label: 'ATAS' | 'BAWAH'
  source: 'DESKTOP' | 'AUTO_CRON' | 'ESTIMATED_FLIP' | 'DEFAULT' | string
  master_found: boolean
  updated_by: string | null
  updated_at: string | null
}

export interface TherapistFlowSummary {
  bm_therapists: number
  bm_present: number
  bm_guests: number
  rf_therapists: number
  rf_present: number
  rf_guests: number
  total_active_started: number
}

export interface TherapistFlowResponse {
  kode_outlet: string
  name_outlet: string
  tanggal: string
  today_wib: string
  is_outlet_locked: boolean
  master: TherapistFlowMaster
  summary: TherapistFlowSummary
  bm_rows: TherapistFlowRow[]
  rf_rows: TherapistFlowRow[]
}

export const therapistFlowService = {
  /**
   * Memuat seluruh outlet aktif (master_outlet.active = true) untuk dropdown pemilih 1 outlet.
   */
  async getActiveOutlets(): Promise<MasterOutlet[]> {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('kode_outlet, name_outlet, alamat, city, no_telp, email, active')
      .eq('active', true)
      .order('kode_outlet', { ascending: true })

    if (error) {
      throw new Error(error.message || 'Gagal memuat daftar outlet aktif.')
    }

    return (data || []) as MasterOutlet[]
  },

  /**
   * Memanggil RPC public.get_pos_therapist_flow(...) untuk mengambil data alur terapis (Flow BM & Flow RF),
   * arah slot harian, kehadiran biometrik, dan daftar tamu dari ot_pos_trans_master.
   */
  async getTherapistFlow(
    kodeOutlet: string | null,
    tanggal: string
  ): Promise<TherapistFlowResponse> {
    const { data, error } = await supabase.rpc('get_pos_therapist_flow', {
      p_kode_outlet: kodeOutlet,
      p_tanggal: tanggal,
    })

    if (error) {
      throw new Error(error.message || 'Gagal memuat data Therapist Flow.')
    }

    if (!data) {
      throw new Error('Data Therapist Flow tidak tersedia.')
    }

    return data as TherapistFlowResponse
  },
}
