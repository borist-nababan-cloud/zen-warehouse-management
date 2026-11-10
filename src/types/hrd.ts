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
  update_by_name?: string | null;
  created_by_name?: string | null;
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
  update_by_name?: string | null;
  created_by_name?: string | null;
  // Join
  category?: HrdReportTrCategory;
}

export interface HrdReportTr {
  uid: string;
  kode_report: string;
  tanggal_report: string;
  kode_outlet: string;
  kodekaryawan: string;
  payrollperiode?: string | null;
  total_pengurang?: number;
  nilai_total: number;
  kesimpulan?: string | null;
  nilai_guest: number;
  catatan_auto?: string | null;
  created_by?: string | null;
  created_at: string;
  update_by?: string | null;
  update_at: string;
  update_by_name?: string | null;
  created_by_name?: string | null;
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
  foto_url?: string | null;
}

export interface CreateHrdReportTrPayload {
  kode_outlet: string;
  kodekaryawan: string;
  tanggal_report?: string;
  payrollperiode?: string | null;
  total_pengurang?: number;
  nilai_total?: number;
  kesimpulan?: string | null;
  items: {
    variable_id: string;
    nama_variable: string;
    nama_kategori: string;
    nilai_variable: number;
    catatan_variable?: string | null;
  }[];
}

export interface HrdPayrollAttendance {
  halpa: number;
  hcuti: number;
  hlate1: number;
  hlate2: number;
  hsakit: number;
  hunder: number;
  hitidakabsen: number;
  hitidakmasuk: number;
}

export interface HrdPayrollDetailItem {
  id: string;
  payrollperiode: string;
  kode_outlet: string;
  kodekaryawan: string;
  payroll_data: any;
  attendance?: HrdPayrollAttendance;
  startDate?: string;
  endDate?: string;
}

export type FaultCategory = 'Ringan' | 'Sedang' | 'Berat';

export interface HrdMasterFault {
  uid: string;
  nama_faults: string;
  pengurang: number;
  kategori: FaultCategory;
  urutan: number;
  active: boolean;
  created_by?: string | null;
  created_at: string;
  update_by?: string | null;
  update_at: string;
  update_by_name?: string | null;
  created_by_name?: string | null;
}

export interface HrdTrFault {
  uid: string;
  tanggal: string;
  kode_outlet: string;
  kodekaryawan: string;
  idkaryawan: number;
  fault_id?: string | null;
  nama_faults: string;
  kategori: FaultCategory;
  pengurang: number;
  keterangan?: string | null;
  created_by?: string | null;
  created_at: string;
  update_by?: string | null;
  update_at: string;
  name_outlet?: string | null;
  city?: string | null;
  namakaryawan?: string | null;
  departemen?: string | null;
  update_by_name?: string | null;
  created_by_name?: string | null;
}

export interface CreateHrdTrFaultPayload {
  tanggal?: string;
  kode_outlet: string;
  kodekaryawan: string;
  idkaryawan: number;
  fault_id?: string | null;
  nama_faults: string;
  kategori: FaultCategory;
  pengurang: number;
  keterangan?: string | null;
}

export interface HrdKaryawanInfo {
  id: string;
  local_autonum?: number | null;
  kode_outlet: string;
  kodekaryawan: string;
  idkaryawan?: string | null;
  namakaryawan: string;
  departemen?: string | null;
  jadwaltetap?: string | null;
  kodejadwal?: number | null;
  kodekontrak?: string | null;
  tglmasukkerja?: string | null;
  tglhabiskontrak?: string | null;
  namabank?: string | null;
  norek?: string | null;
  namarek?: string | null;
  active: 'Y' | 'N' | string;
  foto_url?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  // Join
  master_outlet?: {
    kode_outlet: string;
    name_outlet: string;
  } | null;
}

export interface KaryawanListParams {
  page: number;
  pageSize: number;
  kode_outlet?: string;
  activeStatus?: 'Y' | 'N' | 'ALL';
  search?: string;
}

export interface KaryawanListResponse {
  data: HrdKaryawanInfo[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


