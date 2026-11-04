import { supabase } from '@/lib/supabase';
import {
  HrdReportTrCategory,
  HrdReportTrVariable,
  HrdReportTr,
  HrdEmployeeSimple,
  CreateHrdReportTrPayload,
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
    return (data || []) as HrdReportTrVariable[];
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
    const { data: header, error: headerError } = await supabase
      .from('hrd_report_tr')
      .insert({
        kode_report,
        tanggal_report: payload.tanggal_report || now.toISOString().split('T')[0],
        kode_outlet: payload.kode_outlet,
        kodekaryawan: payload.kodekaryawan,
        nilai_total: averageScore,
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
};

