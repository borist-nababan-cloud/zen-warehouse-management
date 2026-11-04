import { MasterOutlet } from './database';

export interface HrdReportTrCategory {
  uid: string;
  nama_kategori: string;
  urutan: number;
  active: boolean;
  created_by?: string | null;
  created_at: string;
  update_by?: string | null;
  update_at: string;
}

export interface HrdReportTrVariable {
  uid: string;
  category_id: string;
  nama_variable: string;
  deskripsi?: string | null;
  urutan: number;
  active: boolean;
  created_by?: string | null;
  created_at: string;
  update_by?: string | null;
  update_at: string;
  // Join
  category?: HrdReportTrCategory;
}

export interface HrdReportTr {
  uid: string;
  kode_report: string;
  tanggal_report: string;
  kode_outlet: string;
  kodekaryawan: string;
  nilai_total: number;
  kesimpulan?: string | null;
  nilai_guest: number;
  catatan_auto?: string | null;
  created_by?: string | null;
  created_at: string;
  update_by?: string | null;
  update_at: string;
  // Joins
  master_outlet?: MasterOutlet | null;
  karyawan_info?: HrdEmployeeSimple | null;
  details?: HrdReportTrDetail[];
}

export interface HrdReportTrDetail {
  uid: string;
  report_id: string;
  variable_id?: string | null;
  nama_variable: string;
  nama_kategori?: string | null;
  nilai_variable: number;
  catatan_variable?: string | null;
  created_at: string;
}

export interface HrdEmployeeSimple {
  kodekaryawan: string;
  idkaryawan?: string | null;
  namakaryawan?: string | null;
  kode_outlet?: string | null;
  departemen?: string | null;
  active?: string | null;
}

export interface CreateHrdReportTrPayload {
  kode_outlet: string;
  kodekaryawan: string;
  tanggal_report?: string;
  kesimpulan?: string | null;
  items: {
    variable_id: string;
    nama_variable: string;
    nama_kategori: string;
    nilai_variable: number;
    catatan_variable?: string | null;
  }[];
}

