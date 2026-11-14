import { supabase } from '@/lib/supabase';
import {
  HrdMasterFault,
  HrdKpiMasterFault,
  HrdTrFault,
  CreateHrdTrFaultPayload,
  HrdKpiFault,
  CreateHrdKpiFaultPayload,
  HrdEmployeeSimple,
  FaultCategory,
} from '@/types/hrd';

type FaultMasterTable = 'hrd_master_faults' | 'hrd_kpi_master_faults';
type FaultTxTable = 'hrd_tr_faults' | 'hrd_kpi_faults';
type FaultTxView = 'view_hrd_tr_faults' | 'view_hrd_kpi_faults';

async function attachFaultUserNames(data: any[]): Promise<HrdMasterFault[]> {
  if (!data || data.length === 0) return [];

  const userIds = Array.from(
    new Set(
      data
        .flatMap((item) => [item.update_by, item.created_by])
        .filter(Boolean) as string[]
    )
  );

  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users_profile')
      .select('uid, full_name, email')
      .in('uid', userIds);

    if (users) {
      users.forEach((u) => {
        userMap.set(u.uid, u.full_name || u.email || 'Petugas');
      });
    }
  }

  return data.map((item) => ({
    ...item,
    update_by_name: item.update_by ? userMap.get(item.update_by) || 'Petugas' : 'Sistem',
    created_by_name: item.created_by ? userMap.get(item.created_by) || 'Petugas' : 'Sistem',
  })) as HrdMasterFault[];
}

async function fetchMasterFaultsByTable(
  table: FaultMasterTable,
  onlyActive: boolean = false
): Promise<HrdMasterFault[]> {
  let query = supabase
    .from(table)
    .select('*')
    .order('urutan', { ascending: true })
    .order('created_at', { ascending: true });

  if (onlyActive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return attachFaultUserNames(data || []);
}

async function createMasterFaultInTable(
  table: FaultMasterTable,
  payload: {
    nama_faults: string;
    pengurang: number;
    kategori: FaultCategory;
    urutan?: number;
    active?: boolean;
  },
  userId?: string
): Promise<HrdMasterFault> {
  const { data, error } = await supabase
    .from(table)
    .insert({
      nama_faults: payload.nama_faults.trim(),
      pengurang: payload.pengurang,
      kategori: payload.kategori,
      urutan: payload.urutan || 0,
      active: payload.active !== undefined ? payload.active : true,
      created_by: userId || null,
      update_by: userId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HrdMasterFault;
}

async function updateMasterFaultInTable(
  table: FaultMasterTable,
  uid: string,
  payload: Partial<{
    nama_faults: string;
    pengurang: number;
    kategori: FaultCategory;
    urutan: number;
    active: boolean;
  }>,
  userId?: string
): Promise<HrdMasterFault> {
  const { data, error } = await supabase
    .from(table)
    .update({
      ...payload,
      update_by: userId || null,
      update_at: new Date().toISOString(),
    })
    .eq('uid', uid)
    .select()
    .single();

  if (error) throw error;
  return data as HrdMasterFault;
}

async function deleteMasterFaultFromTable(table: FaultMasterTable, uid: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('uid', uid);

  if (error) throw error;
}

interface FaultQueryParams {
  startDate?: string;
  endDate?: string;
  kodeOutlet?: string;
  kategori?: string;
  onlyAdmin?: boolean;
}

async function fetchFaultsFromView<T>(view: FaultTxView, params: FaultQueryParams): Promise<T[]> {
  let query = supabase
    .from(view)
    .select('*')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.startDate) {
    query = query.gte('tanggal', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('tanggal', params.endDate);
  }
  if (params.kodeOutlet && params.kodeOutlet !== 'ALL') {
    query = query.eq('kode_outlet', params.kodeOutlet);
  }
  if (params.kategori && params.kategori !== 'ALL') {
    query = query.eq('kategori', params.kategori);
  }
  if (params.onlyAdmin) {
    query = query.eq('isadmin', 'Y');
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
}

async function createFaultInTable<T>(
  table: FaultTxTable,
  payload: CreateHrdTrFaultPayload | CreateHrdKpiFaultPayload,
  userId?: string
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert({
      tanggal: payload.tanggal || new Date().toISOString().split('T')[0],
      kode_outlet: payload.kode_outlet,
      kodekaryawan: payload.kodekaryawan,
      idkaryawan: payload.idkaryawan,
      fault_id: payload.fault_id || null,
      nama_faults: payload.nama_faults.trim(),
      kategori: payload.kategori,
      pengurang: payload.pengurang,
      keterangan: payload.keterangan ? payload.keterangan.trim() : null,
      created_by: userId || null,
      update_by: userId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

async function updateFaultInTable<T>(
  table: FaultTxTable,
  uid: string,
  payload: Partial<{
    tanggal: string;
    fault_id: string | null;
    nama_faults: string;
    kategori: FaultCategory;
    pengurang: number;
    keterangan: string | null;
  }>,
  userId?: string
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .update({
      ...payload,
      update_by: userId || null,
      update_at: new Date().toISOString(),
    })
    .eq('uid', uid)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

async function deleteFaultFromTable(table: FaultTxTable, uid: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('uid', uid);

  if (error) throw error;
}

export const hrdFaultService = {
  // ==========================================
  // 1. MASTER FAULTS (TERAPIS)
  // ==========================================
  async getMasterFaults(onlyActive: boolean = false): Promise<HrdMasterFault[]> {
    return fetchMasterFaultsByTable('hrd_master_faults', onlyActive);
  },

  async createMasterFault(
    payload: {
      nama_faults: string;
      pengurang: number;
      kategori: FaultCategory;
      urutan?: number;
      active?: boolean;
    },
    userId?: string
  ): Promise<HrdMasterFault> {
    return createMasterFaultInTable('hrd_master_faults', payload, userId);
  },

  async updateMasterFault(
    uid: string,
    payload: Partial<{
      nama_faults: string;
      pengurang: number;
      kategori: FaultCategory;
      urutan: number;
      active: boolean;
    }>,
    userId?: string
  ): Promise<HrdMasterFault> {
    return updateMasterFaultInTable('hrd_master_faults', uid, payload, userId);
  },

  async deleteMasterFault(uid: string): Promise<void> {
    return deleteMasterFaultFromTable('hrd_master_faults', uid);
  },

  // ==========================================
  // 1B. KPI MASTER FAULTS (DEPARTEMEN NON-TR/TB)
  // ==========================================
  async getKpiMasterFaults(onlyActive: boolean = false): Promise<HrdKpiMasterFault[]> {
    return fetchMasterFaultsByTable('hrd_kpi_master_faults', onlyActive);
  },

  async createKpiMasterFault(
    payload: {
      nama_faults: string;
      pengurang: number;
      kategori: FaultCategory;
      urutan?: number;
      active?: boolean;
    },
    userId?: string
  ): Promise<HrdKpiMasterFault> {
    return createMasterFaultInTable('hrd_kpi_master_faults', payload, userId);
  },

  async updateKpiMasterFault(
    uid: string,
    payload: Partial<{
      nama_faults: string;
      pengurang: number;
      kategori: FaultCategory;
      urutan: number;
      active: boolean;
    }>,
    userId?: string
  ): Promise<HrdKpiMasterFault> {
    return updateMasterFaultInTable('hrd_kpi_master_faults', uid, payload, userId);
  },

  async deleteKpiMasterFault(uid: string): Promise<void> {
    return deleteMasterFaultFromTable('hrd_kpi_master_faults', uid);
  },

  // ==========================================
  // 2. THERAPIST FAULTS (TRANSACTIONS)
  // ==========================================
  async getTrFaults(params: {
    startDate?: string;
    endDate?: string;
    kodeOutlet?: string;
    kategori?: string;
  }): Promise<HrdTrFault[]> {
    return fetchFaultsFromView<HrdTrFault>('view_hrd_tr_faults', params);
  },

  async createTrFault(
    payload: CreateHrdTrFaultPayload,
    userId?: string
  ): Promise<HrdTrFault> {
    return createFaultInTable<HrdTrFault>('hrd_tr_faults', payload, userId);
  },

  async updateTrFault(
    uid: string,
    payload: Partial<{
      tanggal: string;
      fault_id: string | null;
      nama_faults: string;
      kategori: FaultCategory;
      pengurang: number;
      keterangan: string | null;
    }>,
    userId?: string
  ): Promise<HrdTrFault> {
    return updateFaultInTable<HrdTrFault>('hrd_tr_faults', uid, payload, userId);
  },

  async deleteTrFault(uid: string): Promise<void> {
    return deleteFaultFromTable('hrd_tr_faults', uid);
  },

  // ==========================================
  // 2B. EMPLOYEE KPI FAULTS (NON-TR/TB TRANSACTIONS)
  // ==========================================
  async getKpiFaults(params: {
    startDate?: string;
    endDate?: string;
    kodeOutlet?: string;
    kategori?: string;
    onlyAdmin?: boolean;
  }): Promise<HrdKpiFault[]> {
    return fetchFaultsFromView<HrdKpiFault>('view_hrd_kpi_faults', params);
  },

  async createKpiFault(
    payload: CreateHrdKpiFaultPayload,
    userId?: string
  ): Promise<HrdKpiFault> {
    return createFaultInTable<HrdKpiFault>('hrd_kpi_faults', payload, userId);
  },

  async updateKpiFault(
    uid: string,
    payload: Partial<{
      tanggal: string;
      fault_id: string | null;
      nama_faults: string;
      kategori: FaultCategory;
      pengurang: number;
      keterangan: string | null;
    }>,
    userId?: string
  ): Promise<HrdKpiFault> {
    return updateFaultInTable<HrdKpiFault>('hrd_kpi_faults', uid, payload, userId);
  },

  async deleteKpiFault(uid: string): Promise<void> {
    return deleteFaultFromTable('hrd_kpi_faults', uid);
  },

  // Helper to fetch active therapists in an outlet
  async getTherapistsByOutlet(kodeOutlet: string): Promise<HrdEmployeeSimple[]> {
    const { data, error } = await supabase
      .from('ot_hrd_karyawan_info')
      .select('kodekaryawan, idkaryawan, namakaryawan, kode_outlet, departemen, active, foto_url, isadmin')
      .eq('kode_outlet', kodeOutlet)
      .in('departemen', ['TR', 'TB'])
      .eq('active', 'Y')
      .order('namakaryawan', { ascending: true });

    if (error) throw error;
    return (data || []) as HrdEmployeeSimple[];
  },

  // Helper to fetch active non-TR/TB employees in an outlet (optionally filtered by isadmin = 'Y')
  async getNonTherapistEmployeesByOutlet(
    kodeOutlet: string,
    onlyAdmin: boolean = false
  ): Promise<HrdEmployeeSimple[]> {
    let query = supabase
      .from('ot_hrd_karyawan_info')
      .select('kodekaryawan, idkaryawan, namakaryawan, kode_outlet, departemen, active, foto_url, isadmin')
      .eq('kode_outlet', kodeOutlet)
      .eq('active', 'Y')
      .not('departemen', 'is', null)
      .neq('departemen', 'TR')
      .neq('departemen', 'TB')
      .order('namakaryawan', { ascending: true });

    if (onlyAdmin) {
      query = query.eq('isadmin', 'Y');
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as HrdEmployeeSimple[]).filter((emp) => {
      const dept = (emp.departemen || '').trim().toUpperCase();
      return dept !== '' && dept !== 'TR' && dept !== 'TB';
    });
  },
};

