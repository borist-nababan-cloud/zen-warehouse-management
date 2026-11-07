import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import { supabase } from '@/lib/supabase';
import { MasterOutlet } from '@/types/database';
import {
  HrdReportTr,
  HrdEmployeeSimple,
  HrdPayrollDetailItem,
  HrdTrFault,
} from '@/types/hrd';
import {
  UserCheck,
  Store,
  History,
  Save,
  CheckCircle2,
  Calendar,
  Award,
  Sparkles,
  Info,
  Clock,
  CalendarRange,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FormVariableItem {
  variable_id: string;
  nama_variable: string;
  nama_kategori: string;
  category_id: string;
  deskripsi?: string | null;
  nilai_variable: number; // 0 to 10, default 5
  catatan_variable: string;
}

export function TrCreateEvaluationPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  // Outlets & Employees State
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [therapists, setTherapists] = useState<HrdEmployeeSimple[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<string>('');

  // Payroll Periods & Faults State
  const [payrolls, setPayrolls] = useState<HrdPayrollDetailItem[]>([]);
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState<string>('');
  const [loadingPayrolls, setLoadingPayrolls] = useState<boolean>(false);
  const [periodFaults, setPeriodFaults] = useState<HrdTrFault[]>([]);
  const [loadingFaults, setLoadingFaults] = useState<boolean>(false);

  // 3 Latest Evaluations
  const [recentEvaluations, setRecentEvaluations] = useState<HrdReportTr[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Categories & Variables Form State
  const [formItems, setFormItems] = useState<FormVariableItem[]>([]);
  const [kesimpulan, setKesimpulan] = useState<string>('');
  const [tanggalReport, setTanggalReport] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingTherapists, setLoadingTherapists] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. Initial Load: Outlets & Active Variables with Categories
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingInitial(true);
        const [outletsRes, , vars] = await Promise.all([
          supabase
            .from('master_outlet')
            .select('kode_outlet, name_outlet, city, province, active')
            .eq('active', true)
            .order('kode_outlet', { ascending: true }),
          hrdEvaluationService.getCategories(true),
          hrdEvaluationService.getVariables(undefined, true),
        ]);

        const rawOutlets = (outletsRes.data as MasterOutlet[]) || [];
        setOutlets(rawOutlets);

        // Pre-fill form items with default score = 5
        const items: FormVariableItem[] = vars.map((v) => ({
          variable_id: v.uid,
          nama_variable: v.nama_variable,
          nama_kategori: v.category?.nama_kategori || 'Umum',
          category_id: v.category_id,
          deskripsi: v.deskripsi,
          nilai_variable: 5, // Default = 5
          catatan_variable: '',
        }));
        setFormItems(items);

        // Set default outlet if user is assigned to an outlet
        if (user?.kode_outlet && rawOutlets.some((o) => o.kode_outlet === user.kode_outlet)) {
          setSelectedOutlet(user.kode_outlet);
        } else if (rawOutlets.length > 0) {
          setSelectedOutlet(rawOutlets[0].kode_outlet);
        }
      } catch (err: any) {
        console.error('Error initializing evaluation form:', err);
        toast.error('Gagal memuat data master evaluasi');
      } finally {
        setLoadingInitial(false);
      }
    };

    initData();
  }, [user]);

  // 2. When Outlet changes: Fetch Therapists in that outlet
  useEffect(() => {
    if (!selectedOutlet) return;

    const fetchTherapists = async () => {
      try {
        setLoadingTherapists(true);
        setSelectedKaryawan('');
        setRecentEvaluations([]);
        const data = await hrdEvaluationService.getTherapists(selectedOutlet);
        setTherapists(data);
        if (data.length > 0) {
          setSelectedKaryawan(data[0].kodekaryawan);
        }
      } catch (err: any) {
        console.error('Error fetching therapists for outlet:', err);
        toast.error('Gagal memuat daftar terapis cabang');
      } finally {
        setLoadingTherapists(false);
      }
    };

    fetchTherapists();
  }, [selectedOutlet]);

  // 3. When Selected Karyawan changes: Fetch 3 most recent evaluations & last 5 payroll periods
  useEffect(() => {
    if (!selectedKaryawan) {
      setRecentEvaluations([]);
      setPayrolls([]);
      setSelectedPayrollPeriod('');
      setPeriodFaults([]);
      return;
    }

    const fetchRecent = async () => {
      try {
        setLoadingHistory(true);
        const data = await hrdEvaluationService.getRecentEvaluations(selectedKaryawan, 3);
        setRecentEvaluations(data);
      } catch (err: any) {
        console.error('Error loading recent evaluations:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    const fetchPayrolls = async () => {
      try {
        setLoadingPayrolls(true);
        setPayrolls([]);
        setSelectedPayrollPeriod('');
        setPeriodFaults([]);
        const pData = await hrdEvaluationService.getTherapistPayrolls(selectedKaryawan, 5);
        setPayrolls(pData);
        if (pData.length > 0) {
          setSelectedPayrollPeriod(pData[0].payrollperiode);
        }
      } catch (err: any) {
        console.error('Error fetching payroll periods for therapist:', err);
      } finally {
        setLoadingPayrolls(false);
      }
    };

    fetchRecent();
    fetchPayrolls();
  }, [selectedKaryawan]);

  // Selected payroll detail object
  const selectedPayroll = useMemo(() => {
    return payrolls.find((p) => p.payrollperiode === selectedPayrollPeriod) || null;
  }, [payrolls, selectedPayrollPeriod]);

  // 4. When Selected Payroll changes: Fetch faults for the therapist within that date range
  useEffect(() => {
    if (!selectedKaryawan || !selectedPayroll?.startDate || !selectedPayroll?.endDate) {
      setPeriodFaults([]);
      return;
    }

    const fetchFaults = async () => {
      try {
        setLoadingFaults(true);
        const faults = await hrdEvaluationService.getTherapistFaultsByDateRange(
          selectedKaryawan,
          selectedPayroll.startDate!,
          selectedPayroll.endDate!
        );
        setPeriodFaults(faults);
      } catch (err: any) {
        console.error('Error loading therapist faults for payroll period:', err);
        setPeriodFaults([]);
      } finally {
        setLoadingFaults(false);
      }
    };

    fetchFaults();
  }, [selectedKaryawan, selectedPayrollPeriod, selectedPayroll]);

  // Update Score or Notes for an item
  const handleScoreChange = (variableId: string, score: number) => {
    const clamped = Math.max(0, Math.min(10, score));
    setFormItems((prev) =>
      prev.map((item) =>
        item.variable_id === variableId ? { ...item, nilai_variable: clamped } : item
      )
    );
  };

  const handleNotesChange = (variableId: string, notes: string) => {
    setFormItems((prev) =>
      prev.map((item) =>
        item.variable_id === variableId ? { ...item, catatan_variable: notes } : item
      )
    );
  };

  // Group form items by Category
  const groupedItems = useMemo(() => {
    const map = new Map<string, { categoryName: string; items: FormVariableItem[] }>();
    for (const item of formItems) {
      if (!map.has(item.category_id)) {
        map.set(item.category_id, {
          categoryName: item.nama_kategori,
          items: [],
        });
      }
      map.get(item.category_id)!.items.push(item);
    }
    return Array.from(map.entries()).map(([catId, group]) => ({
      categoryId: catId,
      categoryName: group.categoryName,
      items: group.items,
    }));
  }, [formItems]);

  // Total Poin Pengurang (Pelanggaran pada Periode Terpilih)
  const totalPengurang = useMemo(() => {
    return periodFaults.reduce((sum, f) => sum + (Number(f.pengurang) || 0), 0);
  }, [periodFaults]);

  // Total Skor Variabel Standar (Langkah 2)
  const sumSkorVariabel = useMemo(() => {
    return formItems.reduce((acc, i) => acc + (Number(i.nilai_variable) || 0), 0);
  }, [formItems]);

  // Rata-rata Variabel Standar (Langkah 2)
  const rataRataVariabel = useMemo(() => {
    if (formItems.length === 0) return 0;
    return Number((sumSkorVariabel / formItems.length).toFixed(1));
  }, [sumSkorVariabel, formItems.length]);

  // Nilai Total Rata-Rata Akhir (Opsi B: (sumSkorVariabel - totalPengurang) / formItems.length)
  const nilaiTotalAkhir = useMemo(() => {
    if (formItems.length === 0) return 0;
    const score = (sumSkorVariabel - totalPengurang) / formItems.length;
    return Math.max(0, Number(score.toFixed(1)));
  }, [sumSkorVariabel, totalPengurang, formItems.length]);

  const selectedTherapistObj = therapists.find((t) => t.kodekaryawan === selectedKaryawan);

  // Submit Evaluation
  const handleSubmit = async () => {
    if (!selectedOutlet) {
      toast.error('Silakan pilih outlet cabang terlebih dahulu');
      return;
    }
    if (!selectedKaryawan) {
      toast.error('Silakan pilih terapis yang akan dievaluasi');
      return;
    }
    if (formItems.length === 0) {
      toast.error('Tidak ada variabel penilaian yang aktif');
      return;
    }

    try {
      setSubmitting(true);
      await hrdEvaluationService.createEvaluation(
        {
          kode_outlet: selectedOutlet,
          kodekaryawan: selectedKaryawan,
          tanggal_report: tanggalReport,
          payrollperiode: selectedPayrollPeriod || null,
          total_pengurang: totalPengurang,
          nilai_total: nilaiTotalAkhir,
          kesimpulan: kesimpulan.trim() || null,
          items: formItems.map((fi) => ({
            variable_id: fi.variable_id,
            nama_variable: fi.nama_variable,
            nama_kategori: fi.nama_kategori,
            nilai_variable: fi.nilai_variable,
            catatan_variable: fi.catatan_variable,
          })),
        },
        user?.id
      );

      toast.success('Laporan evaluasi terapis berhasil disimpan!');
      // Reset or redirect
      setKesimpulan('');
      // Reload recent evaluations to show the newly added one
      const updatedRecent = await hrdEvaluationService.getRecentEvaluations(selectedKaryawan, 3);
      setRecentEvaluations(updatedRecent);
    } catch (err: any) {
      console.error('Error saving evaluation report:', err);
      toast.error(err.message || 'Gagal menyimpan evaluasi terapis');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-zen-sand/40 shadow-zen">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zen-matcha/10 flex items-center justify-center border border-zen-matcha/20 text-zen-moss">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal">
                  Buat Evaluasi TR
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zen-paper text-zen-moss border border-zen-sand/40">
                  Role: HR / Leader (8, 16)
                </span>
              </div>
              <p className="text-xs text-zen-muted mt-0.5">
                Formulir penilaian berkala kinerja, keramahan, dan kepatuhan SOP Terapis Reflexology & Body Massage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              onClick={() => navigate('/hrd/tr-laporan')}
              variant="outline"
              size="sm"
              className="rounded-xl border-zen-sand/60 text-zen-charcoal hover:bg-zen-paper text-xs font-semibold"
            >
              Lihat Laporan Evaluasi &rarr;
            </Button>
          </div>
        </div>

        {/* STEP 1 & 2: OUTLET & THERAPIST SELECTION CARD */}
        <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-sm font-bold text-zen-charcoal flex items-center gap-2 mb-4 pb-2 border-b border-zen-stone/60">
              <Store className="w-4 h-4 text-zen-matcha" />
              <span>Langkah 1: Pilih Cabang & Terapis</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Outlet Selector */}
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1.5">
                  Cabang Outlet <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-semibold text-zen-charcoal focus:ring-2 focus:ring-zen-matcha/30"
                  disabled={loadingInitial}
                >
                  <option value="" disabled>Pilih Outlet...</option>
                  {outlets.map((o) => (
                    <option key={o.kode_outlet} value={o.kode_outlet}>
                      {o.kode_outlet} - {o.name_outlet}
                    </option>
                  ))}
                </select>
              </div>

              {/* Therapist Selector */}
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1.5 flex items-center justify-between">
                  <span>Pilih Terapis (TR / TB) <span className="text-red-500">*</span></span>
                  {loadingTherapists && (
                    <span className="text-[10px] text-zen-muted animate-pulse">Memuat...</span>
                  )}
                </label>
                <select
                  value={selectedKaryawan}
                  onChange={(e) => setSelectedKaryawan(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-semibold text-zen-charcoal focus:ring-2 focus:ring-zen-matcha/30"
                  disabled={loadingTherapists || therapists.length === 0}
                >
                  {therapists.length === 0 ? (
                    <option value="">Tidak ada terapis aktif di cabang ini</option>
                  ) : (
                    therapists.map((t) => (
                      <option key={t.kodekaryawan} value={t.kodekaryawan}>
                        {t.namakaryawan || t.kodekaryawan} ({t.departemen || 'TR'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Tanggal Evaluasi */}
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zen-muted" />
                  <span>Tanggal Evaluasi</span>
                </label>
                <input
                  type="date"
                  value={tanggalReport}
                  onChange={(e) => setTanggalReport(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-semibold text-zen-charcoal focus:ring-2 focus:ring-zen-matcha/30"
                />
              </div>

              {/* Periode Payroll Dropdown */}
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CalendarRange className="w-3.5 h-3.5 text-zen-matcha" />
                    <span>Periode Payroll (5 Terakhir)</span>
                  </span>
                  {loadingPayrolls && (
                    <span className="text-[10px] text-zen-muted animate-pulse">Memuat...</span>
                  )}
                </label>
                <select
                  value={selectedPayrollPeriod}
                  onChange={(e) => setSelectedPayrollPeriod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-semibold text-zen-charcoal focus:ring-2 focus:ring-zen-matcha/30"
                  disabled={loadingPayrolls || payrolls.length === 0}
                >
                  {payrolls.length === 0 ? (
                    <option value="">
                      {loadingPayrolls ? 'Memuat periode...' : 'Tidak ada data payroll'}
                    </option>
                  ) : (
                    payrolls.map((p) => (
                      <option key={p.payrollperiode} value={p.payrollperiode}>
                        {p.payrollperiode} {p.startDate && p.endDate ? `(${p.startDate} s/d ${p.endDate})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Selected Therapist Details & Parsed Date Range Badge */}
            {selectedTherapistObj && (
              <div className="mt-4 p-3 bg-zen-paper/60 rounded-xl border border-zen-sand/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zen-matcha text-white font-bold font-mono flex items-center justify-center text-xs shadow-xs">
                    {selectedTherapistObj.departemen || 'TR'}
                  </div>
                  <div>
                    <span className="font-bold text-zen-charcoal text-sm">
                      {selectedTherapistObj.namakaryawan}
                    </span>
                    <span className="text-zen-muted ml-2 font-mono text-[11px]">
                      Kode: {selectedTherapistObj.kodekaryawan}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedPayroll?.startDate && selectedPayroll?.endDate ? (
                    <Badge variant="outline" className="bg-white border-zen-matcha/40 text-zen-moss font-mono text-xs font-bold px-2.5 py-1">
                      📅 Rentang Periode Evaluasi: {selectedPayroll.startDate} s/d {selectedPayroll.endDate}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-zen-muted italic">
                      Periode payroll belum dipilih
                    </span>
                  )}
                  <Badge variant="outline" className="font-mono text-[10px] bg-white border-zen-sand/60">
                    {selectedTherapistObj.departemen === 'TR' ? 'Reflexology (TR)' : 'Body Massage (TB)'}
                  </Badge>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Aktif
                  </span>
                </div>
              </div>
            )}

            {/* Matrix Data Kehadiran dari Payroll Data */}
            {selectedPayroll && (
              <div className="mt-4 pt-4 border-t border-zen-stone/40">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zen-charcoal flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zen-matcha" />
                    <span>Rekap Kehadiran Terapis (ot_hrd_karyawan_payroll_details)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-zen-muted">
                    Periode: {selectedPayroll.payrollperiode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {/* H. Alpa */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${
                    (selectedPayroll.attendance?.halpa || 0) > 0
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block">H. Alpa</span>
                    <span className={`text-base font-extrabold ${
                      (selectedPayroll.attendance?.halpa || 0) > 0 ? 'text-red-600' : 'text-zen-charcoal'
                    }`}>
                      {selectedPayroll.attendance?.halpa ?? 0}
                    </span>
                  </div>

                  {/* H. Cuti */}
                  <div className="p-2.5 rounded-xl border bg-zen-paper/40 border-zen-sand/30 text-center text-zen-charcoal">
                    <span className="text-[10px] font-semibold text-zen-muted block">H. Cuti</span>
                    <span className="text-base font-extrabold text-zen-charcoal">
                      {selectedPayroll.attendance?.hcuti ?? 0}
                    </span>
                  </div>

                  {/* H. Terlambat < 30 Menit */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${
                    (selectedPayroll.attendance?.hlate1 || 0) > 0
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block leading-tight">Terlambat &lt;30m</span>
                    <span className={`text-base font-extrabold ${
                      (selectedPayroll.attendance?.hlate1 || 0) > 0 ? 'text-amber-600' : 'text-zen-charcoal'
                    }`}>
                      {selectedPayroll.attendance?.hlate1 ?? 0}
                    </span>
                  </div>

                  {/* H. Terlambat > 30 Menit */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${
                    (selectedPayroll.attendance?.hlate2 || 0) > 0
                      ? 'bg-orange-50/70 border-orange-200 text-orange-900'
                      : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block leading-tight">Terlambat &gt;30m</span>
                    <span className={`text-base font-extrabold ${
                      (selectedPayroll.attendance?.hlate2 || 0) > 0 ? 'text-orange-600' : 'text-zen-charcoal'
                    }`}>
                      {selectedPayroll.attendance?.hlate2 ?? 0}
                    </span>
                  </div>

                  {/* H. Sakit */}
                  <div className="p-2.5 rounded-xl border bg-zen-paper/40 border-zen-sand/30 text-center text-zen-charcoal">
                    <span className="text-[10px] font-semibold text-zen-muted block">H. Sakit</span>
                    <span className="text-base font-extrabold text-zen-charcoal">
                      {selectedPayroll.attendance?.hsakit ?? 0}
                    </span>
                  </div>

                  {/* H. Under Time */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${
                    (selectedPayroll.attendance?.hunder || 0) > 0
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block">Under Time</span>
                    <span className={`text-base font-extrabold ${
                      (selectedPayroll.attendance?.hunder || 0) > 0 ? 'text-amber-600' : 'text-zen-charcoal'
                    }`}>
                      {selectedPayroll.attendance?.hunder ?? 0}
                    </span>
                  </div>

                  {/* H. Tidak Absen */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${
                    (selectedPayroll.attendance?.hitidakabsen || 0) > 0
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block">Tidak Absen</span>
                    <span className={`text-base font-extrabold ${
                      (selectedPayroll.attendance?.hitidakabsen || 0) > 0 ? 'text-red-600' : 'text-zen-charcoal'
                    }`}>
                      {selectedPayroll.attendance?.hitidakabsen ?? 0}
                    </span>
                  </div>

                  {/* H. Ijin Tidak Masuk */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${
                    (selectedPayroll.attendance?.hitidakmasuk || 0) > 0
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block leading-tight">Ijin Tdk Masuk</span>
                    <span className={`text-base font-extrabold ${
                      (selectedPayroll.attendance?.hitidakmasuk || 0) > 0 ? 'text-amber-600' : 'text-zen-charcoal'
                    }`}>
                      {selectedPayroll.attendance?.hitidakmasuk ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Catatan Kesalahan Terapis (hrd_tr_faults) */}
            {selectedPayroll && (
              <div className="mt-4 pt-4 border-t border-zen-stone/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-zen-charcoal">
                      Catatan Kesalahan Terapis Pada Periode Evaluasi ({selectedPayroll.startDate} s/d {selectedPayroll.endDate})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zen-muted font-medium">
                      Total Poin Pengurang:
                    </span>
                    <Badge
                      className={`font-mono text-xs font-black px-2.5 py-0.5 ${
                        totalPengurang > 0
                          ? 'bg-red-500 text-white border-red-600'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {totalPengurang > 0 ? `-${totalPengurang} Poin` : '0 Poin (Nihil)'}
                    </Badge>
                  </div>
                </div>

                {loadingFaults ? (
                  <div className="py-4 text-center text-xs text-zen-muted animate-pulse">
                    Memeriksa catatan kesalahan terapis...
                  </div>
                ) : periodFaults.length === 0 ? (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Terapis ini <strong>tidak memiliki catatan kesalahan (faults)</strong> pada rentang tanggal periode evaluasi terpilih.
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zen-sand/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zen-paper text-zen-charcoal uppercase font-bold text-[10px] tracking-wider border-b border-zen-sand/40">
                        <tr>
                          <th className="px-3 py-2">Tanggal</th>
                          <th className="px-3 py-2">Nama Kesalahan</th>
                          <th className="px-3 py-2">Kategori</th>
                          <th className="px-3 py-2 text-center">Pengurang</th>
                          <th className="px-3 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zen-stone/40 bg-white">
                        {periodFaults.map((f) => (
                          <tr key={f.uid} className="hover:bg-zen-paper/30 transition-colors">
                            <td className="px-3 py-2 font-mono whitespace-nowrap text-zen-charcoal">
                              {f.tanggal}
                            </td>
                            <td className="px-3 py-2 font-semibold text-zen-charcoal">
                              {f.nama_faults}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  f.kategori === 'Berat'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : f.kategori === 'Sedang'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {f.kategori}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-red-600 whitespace-nowrap">
                              -{f.pengurang}
                            </td>
                            <td className="px-3 py-2 text-zen-muted text-[11px]">
                              {f.keterangan || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 3: 3 RECENT EVALUATIONS HISTORY PEEK */}
        <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zen-stone/60">
              <h2 className="text-sm font-bold text-zen-charcoal flex items-center gap-2">
                <History className="w-4 h-4 text-zen-matcha" />
                <span>3 Riwayat Evaluasi Terakhir Karyawan Ini</span>
              </h2>
              {loadingHistory && (
                <span className="text-xs text-zen-muted animate-pulse">Memuat riwayat...</span>
              )}
            </div>

            {recentEvaluations.length === 0 ? (
              <div className="py-6 text-center text-xs text-zen-muted bg-zen-paper/30 rounded-xl border border-dashed border-zen-sand/40">
                <Info className="w-5 h-5 mx-auto mb-1 text-zen-sand" />
                <p>Belum ada catatan evaluasi sebelumnya untuk terapis ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recentEvaluations.map((rev, idx) => (
                  <div
                    key={rev.uid || idx}
                    className="p-3.5 bg-zen-paper/50 rounded-xl border border-zen-sand/40 hover:border-zen-matcha/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-zen-muted flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zen-sand" />
                        {rev.tanggal_report}
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                          rev.nilai_total >= 8.5
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : rev.nilai_total >= 7.0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        Skor: {Number(rev.nilai_total).toFixed(1)} / 10
                      </span>
                    </div>

                    <p className="text-xs font-bold text-zen-charcoal mb-0.5 font-mono text-[11px]">
                      {rev.kode_report}
                    </p>

                    <p className="text-[11px] text-zen-muted line-clamp-2 italic">
                      "{rev.kesimpulan || 'Tidak ada catatan kesimpulan'}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 4: VARIABLE EVALUATION MATRIX */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-zen-charcoal flex items-center gap-2">
              <Award className="w-5 h-5 text-zen-matcha" />
              <span>Langkah 2: Penilaian Variabel Standar (Default Nilai: 5, Maksimal: 10)</span>
            </h2>
            <span className="text-xs text-zen-muted">
              Total {formItems.length} variabel penilaian
            </span>
          </div>

          {groupedItems.map((group) => (
            <Card key={group.categoryId} className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
              <div className="bg-zen-paper/80 px-5 py-3 border-b border-zen-stone/60 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zen-charcoal flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zen-matcha"></span>
                  {group.categoryName}
                </span>
                <span className="text-[11px] text-zen-muted">
                  {group.items.length} variabel
                </span>
              </div>

              <CardContent className="p-5 divide-y divide-zen-stone/40">
                {group.items.map((item) => (
                  <div key={item.variable_id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                      {/* Variable Name & Guide */}
                      <div className="sm:max-w-md">
                        <p className="text-sm font-bold text-zen-charcoal">
                          {item.nama_variable}
                        </p>
                        {item.deskripsi && (
                          <p className="text-xs text-zen-muted mt-0.5 leading-relaxed">
                            {item.deskripsi}
                          </p>
                        )}
                      </div>

                      {/* Score Selector (Buttons 1 to 10) */}
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 bg-zen-paper p-1 rounded-xl border border-zen-sand/40">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                            const isSelected = item.nilai_variable === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleScoreChange(item.variable_id, num)}
                                className={`w-6 h-7 sm:w-7 sm:h-8 rounded-lg text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'bg-zen-matcha text-white shadow-xs scale-105'
                                    : 'text-zen-charcoal hover:bg-white hover:text-zen-moss'
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-zen-muted font-medium mt-1">
                          Nilai terpilih: <strong className="text-zen-moss font-bold">{item.nilai_variable}</strong> / 10
                        </span>
                      </div>
                    </div>

                    {/* Catatan Variabel Text Input */}
                    <div className="mt-2">
                      <Input
                        type="text"
                        placeholder="Catatan / observasi spesifik untuk variabel ini (opsional)..."
                        value={item.catatan_variable}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotesChange(item.variable_id, e.target.value)}
                        className="h-8 text-xs rounded-xl bg-zen-paper/30 border-zen-sand/40"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* STEP 5: FINAL SCORE SUMMARY & KESIMPULAN */}
        <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-sm font-bold text-zen-charcoal flex items-center gap-2 mb-4 pb-2 border-b border-zen-stone/60">
              <Sparkles className="w-4 h-4 text-zen-matcha" />
              <span>Langkah 3: Kesimpulan & Nilai Total Evaluasi</span>
            </h2>

            {/* 3 Summary Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Total Langkah 2: Variabel Standar */}
              <div className="p-4 rounded-2xl bg-zen-paper/60 border border-zen-sand/50 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider block mb-1">
                    Total Langkah 2: Variabel Standar
                  </span>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-extrabold text-zen-charcoal tracking-tight">
                      {rataRataVariabel.toFixed(1)}
                    </span>
                    <span className="text-xs text-zen-muted ml-1">/ 10</span>
                  </div>
                </div>
                <p className="text-[10px] text-zen-muted mt-2">
                  Total Skor: <strong className="text-zen-charcoal font-bold">{sumSkorVariabel}</strong> dari {formItems.length * 10} ({formItems.length} variabel)
                </p>
              </div>

              {/* Card 2: Total Poin Pengurang */}
              <div className="p-4 rounded-2xl bg-zen-paper/60 border border-zen-sand/50 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider block mb-1">
                    Total Poin Pengurang (Pelanggaran)
                  </span>
                  <div className="flex items-baseline justify-center">
                    <span className={`text-3xl font-extrabold tracking-tight ${
                      totalPengurang > 0 ? 'text-red-600' : 'text-zen-moss'
                    }`}>
                      {totalPengurang > 0 ? `-${totalPengurang}` : '0'}
                    </span>
                    <span className="text-xs text-zen-muted ml-1">Poin</span>
                  </div>
                </div>
                <p className="text-[10px] text-zen-muted mt-2">
                  {periodFaults.length > 0 ? (
                    <span className="text-red-600 font-semibold">{periodFaults.length} catatan kesalahan terapis</span>
                  ) : (
                    <span>Nihil (0 demerit kesalahan)</span>
                  )}
                </p>
              </div>

              {/* Card 3: Nilai Total Rata-Rata Akhir */}
              <div className="p-4 rounded-2xl bg-zen-matcha/10 border border-zen-matcha/30 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-zen-moss uppercase tracking-wider block mb-1">
                    Nilai Total Rata-Rata Akhir
                  </span>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-black text-zen-charcoal tracking-tight">
                      {nilaiTotalAkhir.toFixed(1)}
                    </span>
                    <span className="text-xs text-zen-muted ml-1">/ 10</span>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        nilaiTotalAkhir >= 8.5
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : nilaiTotalAkhir >= 7.0
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {nilaiTotalAkhir >= 8.5
                        ? 'Sangat Baik (Exceeds Standard)'
                        : nilaiTotalAkhir >= 7.0
                        ? 'Baik (Meets Standard)'
                        : 'Perlu Bimbingan (Needs Improvement)'}
                    </span>
                  </div>
                </div>
                <p className="text-[9px] text-zen-muted mt-2 font-mono">
                  ({sumSkorVariabel} skor - {totalPengurang} pengurang) / {formItems.length} var
                </p>
              </div>
            </div>

            {/* Kesimpulan Text Area */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1">
                  Kesimpulan & Catatan Evaluator <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Tuliskan kesimpulan evaluasi kinerja, apresiasi, atau rekomendasi tindakan perbaikan (coaching/training) untuk terapis ini..."
                  value={kesimpulan}
                  onChange={(e) => setKesimpulan(e.target.value)}
                  rows={4}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-zen-muted flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zen-matcha" />
                  <span>Nilai guest & catatan otomatis disiapkan untuk integrasi aplikasi member.</span>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-xl bg-zen-matcha hover:bg-zen-moss text-white px-6 font-bold shadow-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? 'Menyimpan...' : 'Simpan Laporan Evaluasi'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default TrCreateEvaluationPage;

