import { supabase } from '@/lib/supabase';
import {
  HrdReportTrCategory,
  HrdReportTrVariable,
  HrdReportTr,
  HrdEmployeeSimple,
  CreateHrdReportTrPayload,
  HrdPayrollDetailItem,
  HrdPayrollAttendance,
  HrdTrFault,
} from '@/types/hrd';

export const hrdEvaluationService = {
  // ==========================================
  // 1. CATEGORIES CRUD
  // ==========================================
  async getCategories(onlyActive: boolean = false): Promise<HrdReportTrCategory[]> {
    let query = supabase
      .from('hrd_report_tr_category')
      .select('*')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HrdReportTrCategory[];
  },

  async createCategory(
    nama_kategori: string,
    urutan: number = 0,
    userId?: string
  ): Promise<HrdReportTrCategory> {
    const { data, error } = await supabase
      .from('hrd_report_tr_category')
      .insert({
        nama_kategori: nama_kategori.trim(),
        urutan,
        active: true,
        created_by: userId || null,
        update_by: userId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as HrdReportTrCategory;
  },

  async updateCategory(
    uid: string,
    payload: Partial<{ nama_kategori: string; urutan: number; active: boolean }>,
    userId?: string
  ): Promise<HrdReportTrCategory> {
    const { data, error } = await supabase
      .from('hrd_report_tr_category')
      .update({
        ...payload,
        update_by: userId || null,
        update_at: new Date().toISOString(),
      })
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data as HrdReportTrCategory;
  },

  async deleteCategory(uid: string): Promise<void> {
    const { error } = await supabase
      .from('hrd_report_tr_category')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  },

  // ==========================================
  // 2. VARIABLES CRUD
  // ==========================================
  async getVariables(categoryId?: string, onlyActive: boolean = false): Promise<HrdReportTrVariable[]> {
    let query = supabase
      .from('hrd_report_tr_variable')
      .select(`
        *,
        category:hrd_report_tr_category(*)
      `)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Resolve update_by_name from users_profile
    const userIds = Array.from(
      new Set(
        data
          .flatMap((item: any) => [item.update_by, item.created_by])
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

    return data.map((item: any) => ({
      ...item,
      update_by_name: item.update_by ? userMap.get(item.update_by) || 'Petugas' : 'Sistem',
      created_by_name: item.created_by ? userMap.get(item.created_by) || 'Petugas' : 'Sistem',
    })) as HrdReportTrVariable[];
  },

  async createVariable(
    categoryId: string,
    nama_variable: string,
    deskripsi?: string,
    urutan: number = 0,
    userId?: string
  ): Promise<HrdReportTrVariable> {
    const { data, error } = await supabase
      .from('hrd_report_tr_variable')
      .insert({
        category_id: categoryId,
        nama_variable: nama_variable.trim(),
        deskripsi: deskripsi?.trim() || null,
        urutan,
        active: true,
        created_by: userId || null,
        update_by: userId || null,
      })
      .select(`
        *,
        category:hrd_report_tr_category(*)
      `)
      .single();

    if (error) throw error;
    return data as HrdReportTrVariable;
  },

  async updateVariable(
    uid: string,
    payload: Partial<{ category_id: string; nama_variable: string; deskripsi: string | null; urutan: number; active: boolean }>,
    userId?: string
  ): Promise<HrdReportTrVariable> {
    const { data, error } = await supabase
      .from('hrd_report_tr_variable')
      .update({
        ...payload,
        update_by: userId || null,
        update_at: new Date().toISOString(),
      })
      .eq('uid', uid)
      .select(`
        *,
        category:hrd_report_tr_category(*)
      `)
      .single();

    if (error) throw error;
    return data as HrdReportTrVariable;
  },

  async deleteVariable(uid: string): Promise<void> {
    const { error } = await supabase
      .from('hrd_report_tr_variable')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  },

  // ==========================================
  // 3. EMPLOYEE & THERAPIST LOOKUP
  // ==========================================
  async getTherapists(outletCode?: string): Promise<HrdEmployeeSimple[]> {
    let query = supabase
      .from('ot_hrd_karyawan_info')
      .select('kodekaryawan, idkaryawan, namakaryawan, kode_outlet, departemen, active')
      .in('departemen', ['TR', 'TB'])
      .eq('active', 'Y')
      .order('namakaryawan', { ascending: true });

    if (outletCode && outletCode !== 'ALL') {
      query = query.eq('kode_outlet', outletCode);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HrdEmployeeSimple[];
  },

  // ==========================================
  // 4. 3 RECENT EVALUATIONS
  // ==========================================
  async getRecentEvaluations(kodekaryawan: string, limit: number = 3): Promise<HrdReportTr[]> {
    const { data, error } = await supabase
      .from('hrd_report_tr')
      .select('uid, kode_report, tanggal_report, nilai_total, kesimpulan, created_at')
      .eq('kodekaryawan', kodekaryawan)
      .order('tanggal_report', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as HrdReportTr[];
  },

  // ==========================================
  // 5. CREATE EVALUATION
  // ==========================================
  async createEvaluation(payload: CreateHrdReportTrPayload, userId?: string): Promise<HrdReportTr> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Daftar variabel penilaian tidak boleh kosong');
    }

    // 1. Calculate Average Score
    const totalScore = payload.items.reduce((acc, item) => acc + (Number(item.nilai_variable) || 0), 0);
    const averageScore = Number((totalScore / payload.items.length).toFixed(2));

    // 2. Generate Doc Code: EV-TR-YYMMDD-XXXX
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const kode_report = `EV-TR-${yy}${mm}${dd}-${rand}`;

    // 3. Insert Header
    const finalScore = payload.nilai_total !== undefined ? Number(payload.nilai_total) : averageScore;

    const { data: header, error: headerError } = await supabase
      .from('hrd_report_tr')
      .insert({
        kode_report,
        tanggal_report: payload.tanggal_report || now.toISOString().split('T')[0],
        kode_outlet: payload.kode_outlet,
        kodekaryawan: payload.kodekaryawan,
        payrollperiode: payload.payrollperiode || null,
        total_pengurang: Number(payload.total_pengurang) || 0,
        nilai_total: finalScore,
        kesimpulan: payload.kesimpulan?.trim() || null,
        nilai_guest: 0,
        catatan_auto: null,
        created_by: userId || null,
        update_by: userId || null,
      })
      .select()
      .single();

    if (headerError) throw headerError;

    // 4. Insert Detail Items
    const detailRecords = payload.items.map((item) => ({
      report_id: header.uid,
      variable_id: item.variable_id,
      nama_variable: item.nama_variable,
      nama_kategori: item.nama_kategori,
      nilai_variable: Number(item.nilai_variable) || 5,
      catatan_variable: item.catatan_variable?.trim() || null,
    }));

    const { error: detailError } = await supabase
      .from('hrd_report_tr_detail')
      .insert(detailRecords);

    if (detailError) throw detailError;

    return header as HrdReportTr;
  },

  // ==========================================
  // 6. GET EVALUATIONS LIST (REPORT VIEW)
  // ==========================================
  async getEvaluationsList(filters?: {
    outletCode?: string;
    kodekaryawan?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<HrdReportTr[]> {
    let query = supabase
      .from('hrd_report_tr')
      .select(`
        *,
        master_outlet:master_outlet(kode_outlet, name_outlet, city),
        karyawan_info:ot_hrd_karyawan_info(kodekaryawan, namakaryawan, idkaryawan, departemen, active),
        details:hrd_report_tr_detail(*)
      `)
      .order('tanggal_report', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.outletCode && filters.outletCode !== 'ALL') {
      query = query.eq('kode_outlet', filters.outletCode);
    }
    if (filters?.kodekaryawan && filters.kodekaryawan !== 'ALL') {
      query = query.eq('kodekaryawan', filters.kodekaryawan);
    }
    if (filters?.startDate) {
      query = query.gte('tanggal_report', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('tanggal_report', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HrdReportTr[];
  },

  async getEvaluationDetail(reportId: string): Promise<HrdReportTr> {
    const { data, error } = await supabase
      .from('hrd_report_tr')
      .select(`
        *,
        master_outlet:master_outlet(kode_outlet, name_outlet, city),
        karyawan_info:ot_hrd_karyawan_info(kodekaryawan, namakaryawan, idkaryawan, departemen, active),
        details:hrd_report_tr_detail(*)
      `)
      .eq('uid', reportId)
      .single();

    if (error) throw error;
    return data as HrdReportTr;
  },

  // ==========================================
  // 7. PAYROLL & FAULTS INTEGRATION FOR EVALUATION
  // ==========================================
  parsePayrollPeriod(periodStr: string): { startDate: string; endDate: string } | null {
    if (!periodStr) return null;
    const match = periodStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})$/);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const startMonth = parseInt(match[2], 10);
    const startDay = parseInt(match[3], 10);
    const endDay = parseInt(match[4], 10);

    const startMonthStr = String(startMonth).padStart(2, '0');
    const startDayStr = String(startDay).padStart(2, '0');
    const startDate = `${year}-${startMonthStr}-${startDayStr}`;

    let endYear = year;
    let endMonth = startMonth;
    if (startDay > endDay) {
      endMonth = startMonth + 1;
      if (endMonth > 12) {
        endMonth = 1;
        endYear = year + 1;
      }
    }

    const endMonthStr = String(endMonth).padStart(2, '0');
    const endDayStr = String(endDay).padStart(2, '0');
    const endDate = `${endYear}-${endMonthStr}-${endDayStr}`;

    return { startDate, endDate };
  },

  async getTherapistPayrolls(kodekaryawan: string, limit: number = 5): Promise<HrdPayrollDetailItem[]> {
    if (!kodekaryawan) return [];

    const { data, error } = await supabase
      .from('ot_hrd_karyawan_payroll_details')
      .select('id, payrollperiode, kode_outlet, kodekaryawan, payroll_data')
      .eq('kodekaryawan', kodekaryawan)
      .order('payrollperiode', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Error fetching therapist payroll details:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      const dates = this.parsePayrollPeriod(row.payrollperiode);
      const pd = row.payroll_data || {};
      const attendance: HrdPayrollAttendance = {
        halpa: Number(pd.halpa) || 0,
        hcuti: Number(pd.hcuti) || 0,
        hlate1: Number(pd.hlate1) || 0,
        hlate2: Number(pd.hlate2) || 0,
        hsakit: Number(pd.hsakit) || 0,
        hunder: Number(pd.hunder) || 0,
        hitidakabsen: Number(pd.hitidakabsen) || 0,
        hitidakmasuk: Number(pd.hitidakmasuk) || 0,
      };

      return {
        id: row.id,
        payrollperiode: row.payrollperiode,
        kode_outlet: row.kode_outlet,
        kodekaryawan: row.kodekaryawan,
        payroll_data: pd,
        attendance,
        startDate: dates?.startDate,
        endDate: dates?.endDate,
      };
    });
  },

  async getTherapistFaultsByDateRange(
    kodekaryawan: string,
    startDate: string,
    endDate: string
  ): Promise<HrdTrFault[]> {
    if (!kodekaryawan || !startDate || !endDate) return [];

    const { data, error } = await supabase
      .from('hrd_tr_faults')
      .select('*')
      .eq('kodekaryawan', kodekaryawan)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false });

    if (error) {
      console.warn('Error fetching therapist faults by date range:', error);
      return [];
    }
    return (data || []) as HrdTrFault[];
  },
};

