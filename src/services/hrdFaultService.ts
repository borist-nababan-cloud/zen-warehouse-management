import { supabase } from '@/lib/supabase';
import {
  HrdMasterFault,
  HrdTrFault,
  CreateHrdTrFaultPayload,
  HrdEmployeeSimple,
  FaultCategory,
} from '@/types/hrd';

export const hrdFaultService = {
  // ==========================================
  // 1. MASTER FAULTS
  // ==========================================
  async getMasterFaults(onlyActive: boolean = false): Promise<HrdMasterFault[]> {
    let query = supabase
      .from('hrd_master_faults')
      .select('*')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Collect user IDs to resolve full_name from users_profile
    const userIds = Array.from(
      new Set(
        data
          .flatMap((item) => [item.update_by, item.created_by])
          .filter(Boolean) as string[]
      )
    );

    let userMap = new Map<string, string>();
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
    const { data, error } = await supabase
      .from('hrd_master_faults')
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
    const { data, error } = await supabase
      .from('hrd_master_faults')
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
  },

  async deleteMasterFault(uid: string): Promise<void> {
    const { error } = await supabase
      .from('hrd_master_faults')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
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
    let query = supabase
      .from('view_hrd_tr_faults')
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

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HrdTrFault[];
  },

  async createTrFault(
    payload: CreateHrdTrFaultPayload,
    userId?: string
  ): Promise<HrdTrFault> {
    const { data, error } = await supabase
      .from('hrd_tr_faults')
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
    return data as HrdTrFault;
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
    const { data, error } = await supabase
      .from('hrd_tr_faults')
      .update({
        ...payload,
        update_by: userId || null,
        update_at: new Date().toISOString(),
      })
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data as HrdTrFault;
  },

  async deleteTrFault(uid: string): Promise<void> {
    const { error } = await supabase
      .from('hrd_tr_faults')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  },

  // Helper to fetch active therapists in an outlet
  async getTherapistsByOutlet(kodeOutlet: string): Promise<HrdEmployeeSimple[]> {
    const { data, error } = await supabase
      .from('ot_hrd_karyawan_info')
      .select('kodekaryawan, idkaryawan, namakaryawan, kode_outlet, departemen, active')
      .eq('kode_outlet', kodeOutlet)
      .in('departemen', ['TR', 'TB'])
      .eq('active', 'Y')
      .order('namakaryawan', { ascending: true });

    if (error) throw error;
    return (data || []) as HrdEmployeeSimple[];
  },
};

