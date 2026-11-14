import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import { supabase } from '@/lib/supabase';
import { MasterOutlet } from '@/types/database';
import {
  HrdReportKpi,
  HrdEmployeeSimple,
  HrdPayrollDetailItem,
  HrdKpiFault,
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
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface FormVariableItem {
  variable_id: string;
  nama_variable: string;
  nama_kategori: string;
  category_id: string;
  deskripsi?: string | null;
  nilai_variable: number; // 1 to 10, default 5
  catatan_variable: string;
}

export function EmployeeKpiPage() {
  const { user } = useAuthUser();
  const userRole = Number(user?.user_role);

  // Role 6 (Outlet Admin) & Role 14 (Auditor / HRD Staff) are locked strictly to their own assigned outlet
  const isOutletRestricted = [6, 14].includes(userRole);
  // Role 6 (Outlet Admin) can only access employees with ot_hrd_karyawan_info.isadmin = 'Y'
  const isOnlyAdminEmployee = userRole === 6;

  // Outlets & Employees State
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [employees, setEmployees] = useState<HrdEmployeeSimple[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<string>('');

  // Photo Preview State
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState<boolean>(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>('');
  const [previewPhotoName, setPreviewPhotoName] = useState<string>('');

  // Payroll Periods & Faults State
  const [payrolls, setPayrolls] = useState<HrdPayrollDetailItem[]>([]);
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState<string>('');
  const [loadingPayrolls, setLoadingPayrolls] = useState<boolean>(false);
  const [periodFaults, setPeriodFaults] = useState<HrdKpiFault[]>([]);
  const [loadingFaults, setLoadingFaults] = useState<boolean>(false);

  // 3 Latest Evaluations
  const [recentEvaluations, setRecentEvaluations] = useState<HrdReportKpi[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Dynamic Categories & Variables Form State (filtered by employee departemen)
  const [formItems, setFormItems] = useState<FormVariableItem[]>([]);
  const [loadingVariables, setLoadingVariables] = useState<boolean>(false);
  const [kesimpulan, setKesimpulan] = useState<string>('');
  const [tanggalReport, setTanggalReport] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. Initial Load: Active Outlets
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingInitial(true);
        const outletsRes = await supabase
          .from('master_outlet')
          .select('kode_outlet, name_outlet, city, province, active, can_sto')
          .or('active.eq.true,can_sto.eq.true')
          .order('kode_outlet', { ascending: true });

        const rawOutlets = (outletsRes.data as MasterOutlet[]) || [];
        setOutlets(rawOutlets);

        if (isOutletRestricted && user?.kode_outlet) {
          setSelectedOutlet(user.kode_outlet);
        } else if (user?.kode_outlet && rawOutlets.some((o) => o.kode_outlet === user.kode_outlet)) {
          setSelectedOutlet(user.kode_outlet);
        } else if (rawOutlets.length > 0) {
          setSelectedOutlet(rawOutlets[0].kode_outlet);
        }
      } catch (err: any) {
        console.error('Error initializing Employee KPI form:', err);
        toast.error('Gagal memuat data master cabang');
      } finally {
        setLoadingInitial(false);
      }
    };

    initData();
  }, [user, isOutletRestricted]);

  const getInitials = (name: string) => {
    if (!name) return 'KR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // 2. When Outlet or Role filter changes: Fetch Active Non-TR/TB Employees
  useEffect(() => {
    if (!selectedOutlet) return;

    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        setSelectedKaryawan('');
        setRecentEvaluations([]);
        setFormItems([]);
        const data = await hrdEvaluationService.getKpiEmployees(
          selectedOutlet,
          isOnlyAdminEmployee
        );
        setEmployees(data);
        if (data.length > 0) {
          setSelectedKaryawan(data[0].kodekaryawan);
        }
      } catch (err: any) {
        console.error('Error fetching non-TR/TB employees for outlet:', err);
        toast.error('Gagal memuat daftar karyawan aktif cabang');
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [selectedOutlet, isOnlyAdminEmployee]);

  const selectedEmployeeObj = useMemo(
    () => employees.find((emp) => emp.kodekaryawan === selectedKaryawan) || null,
    [employees, selectedKaryawan]
  );

  // 3. When Selected Karyawan changes: Fetch recent KPI evaluations, last 5 payroll periods, and department KPI variables
  useEffect(() => {
    if (!selectedKaryawan || !selectedEmployeeObj) {
      setRecentEvaluations([]);
      setPayrolls([]);
      setSelectedPayrollPeriod('');
      setPeriodFaults([]);
      setFormItems([]);
      return;
    }

    const fetchRecent = async () => {
      try {
        setLoadingHistory(true);
        const data = await hrdEvaluationService.getRecentKpiEvaluations(selectedKaryawan, 3);
        setRecentEvaluations(data);
      } catch (err: any) {
        console.error('Error loading recent KPI evaluations:', err);
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
        console.error('Error fetching payroll periods for employee:', err);
      } finally {
        setLoadingPayrolls(false);
      }
    };

    const fetchDeptVariables = async () => {
      const dept = (selectedEmployeeObj.departemen || '').trim();
      if (!dept) {
        setFormItems([]);
        return;
      }

      try {
        setLoadingVariables(true);
        const vars = await hrdEvaluationService.getKpiVariables(undefined, dept, true);
        const items: FormVariableItem[] = vars.map((v) => ({
          variable_id: v.uid,
          nama_variable: v.nama_variable,
          nama_kategori: v.category?.nama_kategori || 'Umum',
          category_id: v.category_id,
          deskripsi: v.deskripsi,
          nilai_variable: 5,
          catatan_variable: '',
        }));
        setFormItems(items);
      } catch (err: any) {
        console.error('Error fetching KPI variables for department:', err);
        toast.error(`Gagal memuat variabel KPI untuk departemen ${dept}`);
        setFormItems([]);
      } finally {
        setLoadingVariables(false);
      }
    };

    fetchRecent();
    fetchPayrolls();
    fetchDeptVariables();
  }, [selectedKaryawan, selectedEmployeeObj]);

  // Selected payroll detail object
  const selectedPayroll = useMemo(() => {
    return payrolls.find((p) => p.payrollperiode === selectedPayrollPeriod) || null;
  }, [payrolls, selectedPayrollPeriod]);

  // 4. When Selected Payroll changes: Fetch Employee KPI faults within that date range
  useEffect(() => {
    if (!selectedKaryawan || !selectedPayroll?.startDate || !selectedPayroll?.endDate) {
      setPeriodFaults([]);
      return;
    }

    const fetchFaults = async () => {
      try {
        setLoadingFaults(true);
        const faults = await hrdEvaluationService.getEmployeeKpiFaultsByDateRange(
          selectedKaryawan,
          selectedPayroll.startDate!,
          selectedPayroll.endDate!
        );
        setPeriodFaults(faults);
      } catch (err: any) {
        console.error('Error loading employee KPI faults for payroll period:', err);
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

  // Nilai Total Rata-Rata Akhir: (sumSkorVariabel - totalPengurang) / formItems.length
  const nilaiTotalAkhir = useMemo(() => {
    if (formItems.length === 0) return 0;
    const score = (sumSkorVariabel - totalPengurang) / formItems.length;
    return Math.max(0, Number(score.toFixed(1)));
  }, [sumSkorVariabel, totalPengurang, formItems.length]);

  // Submit Employee KPI Evaluation
  const handleSubmit = async () => {
    if (!selectedOutlet) {
      toast.error('Silakan pilih outlet cabang terlebih dahulu');
      return;
    }
    if (!selectedKaryawan || !selectedEmployeeObj) {
      toast.error('Silakan pilih karyawan yang akan dievaluasi');
      return;
    }
    if (formItems.length === 0) {
      toast.error('Tidak ada variabel KPI yang aktif untuk departemen karyawan ini');
      return;
    }

    try {
      setSubmitting(true);
      await hrdEvaluationService.createKpiEvaluation(
        {
          kode_outlet: selectedOutlet,
          kodekaryawan: selectedKaryawan,
          departemen: selectedEmployeeObj.departemen || null,
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

      toast.success('Laporan KPI karyawan berhasil disimpan!');
      setKesimpulan('');
      setFormItems((prev) =>
        prev.map((item) => ({
          ...item,
          nilai_variable: 5,
          catatan_variable: '',
        }))
      );

      const updatedRecent = await hrdEvaluationService.getRecentKpiEvaluations(selectedKaryawan, 3);
      setRecentEvaluations(updatedRecent);
    } catch (err: any) {
      console.error('Error saving KPI evaluation report:', err);
      toast.error(err.message || 'Gagal menyimpan evaluasi KPI karyawan');
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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal">
                  Penilaian Employee KPI
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zen-paper text-zen-moss border border-zen-sand/40">
                  KPI Departemen (Non-TR/TB)
                </span>
              </div>
              <p className="text-xs text-zen-muted mt-0.5">
                Formulir penilaian berkala kinerja, kedisiplinan, dan pencapaian target KPI karyawan berdasarkan departemen masing-masing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {isOutletRestricted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Cabang Terkunci: {user?.kode_outlet || '-'}
              </span>
            )}
            {isOnlyAdminEmployee && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Filter Admin: isadmin = Y
              </span>
            )}
          </div>
        </div>

        {/* STEP 1: OUTLET & EMPLOYEE SELECTION CARD */}
        <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-sm font-bold text-zen-charcoal flex items-center gap-2 mb-4 pb-2 border-b border-zen-stone/60">
              <Store className="w-4 h-4 text-zen-matcha" />
              <span>Langkah 1: Pilih Cabang & Karyawan</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Outlet Selector */}
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1.5 flex items-center justify-between">
                  <span>Cabang Outlet <span className="text-red-500">*</span></span>
                  {isOutletRestricted && (
                    <span className="text-[10px] text-zen-matcha font-semibold">Terkunci (Cabang Anda)</span>
                  )}
                </label>
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-semibold text-zen-charcoal focus:ring-2 focus:ring-zen-matcha/30 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  disabled={loadingInitial || isOutletRestricted}
                >
                  <option value="" disabled>Pilih Outlet...</option>
                  {(isOutletRestricted && user?.kode_outlet
                    ? outlets.filter((o) => o.kode_outlet === user.kode_outlet)
                    : outlets
                  ).map((o) => (
                    <option key={o.kode_outlet} value={o.kode_outlet}>
                      {o.kode_outlet} - {o.name_outlet}
                    </option>
                  ))}
                </select>
              </div>

              {/* Karyawan Aktif Selector */}
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1.5 flex items-center justify-between">
                  <span>Karyawan Aktif <span className="text-red-500">*</span></span>
                  {loadingEmployees && (
                    <span className="text-[10px] text-zen-muted animate-pulse">Memuat...</span>
                  )}
                </label>
                <select
                  value={selectedKaryawan}
                  onChange={(e) => setSelectedKaryawan(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-semibold text-zen-charcoal focus:ring-2 focus:ring-zen-matcha/30"
                  disabled={loadingEmployees || employees.length === 0}
                >
                  {employees.length === 0 ? (
                    <option value="">Tidak ada karyawan aktif sesuai filter</option>
                  ) : (
                    employees.map((emp) => (
                      <option key={emp.kodekaryawan} value={emp.kodekaryawan}>
                        {emp.namakaryawan || emp.kodekaryawan} ({emp.departemen || '-'})
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

            {/* Selected Employee Details & Parsed Date Range Badge with Photo */}
            {selectedEmployeeObj && (
              <div className="mt-4 p-3.5 bg-zen-paper/60 rounded-xl border border-zen-sand/40 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center space-x-3.5">
                  {selectedEmployeeObj.foto_url ? (
                    <img
                      src={selectedEmployeeObj.foto_url}
                      alt={selectedEmployeeObj.namakaryawan || 'Karyawan'}
                      onClick={() => {
                        setPreviewPhotoUrl(selectedEmployeeObj.foto_url!);
                        setPreviewPhotoName(selectedEmployeeObj.namakaryawan || 'Karyawan');
                        setPhotoPreviewOpen(true);
                      }}
                      className="w-14 h-14 rounded-full object-cover border-2 border-zen-matcha shadow-xs cursor-pointer hover:border-zen-moss hover:scale-105 transition-all"
                      title="Klik untuk melihat foto ukuran penuh"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-zen-charcoal text-white font-bold flex flex-col items-center justify-center border-2 border-zen-sand shadow-xs">
                      <span className="text-sm tracking-wider">{getInitials(selectedEmployeeObj.namakaryawan || '')}</span>
                      <span className="text-[9px] text-zen-sand font-mono">{selectedEmployeeObj.departemen || '-'}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-zen-charcoal text-sm">
                        {selectedEmployeeObj.namakaryawan}
                      </span>
                      {selectedEmployeeObj.departemen && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zen-matcha/15 text-zen-moss border border-zen-matcha/30">
                          Dept: {selectedEmployeeObj.departemen}
                        </span>
                      )}
                      {selectedEmployeeObj.isadmin === 'Y' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-zen-muted text-xs mt-0.5 flex items-center gap-2 font-mono">
                      <span>Kode: <strong className="text-zen-charcoal">{selectedEmployeeObj.kodekaryawan}</strong></span>
                      {selectedEmployeeObj.idkaryawan && (
                        <>
                          <span>•</span>
                          <span>ID: {selectedEmployeeObj.idkaryawan}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedPayroll?.startDate && selectedPayroll?.endDate ? (
                    <Badge variant="outline" className="bg-white border-zen-matcha/40 text-zen-moss font-mono text-xs font-bold px-2.5 py-1">
                      Rentang Periode Evaluasi: {selectedPayroll.startDate} s/d {selectedPayroll.endDate}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-zen-muted italic">
                      Periode payroll belum dipilih
                    </span>
                  )}
                  <Badge variant="outline" className="font-mono text-[10px] bg-white border-zen-sand/60">
                    Departemen: {selectedEmployeeObj.departemen || '-'}
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
                    <span>Rekap Kehadiran Karyawan (ot_hrd_karyawan_payroll_details)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-zen-muted">
                    Periode: {selectedPayroll.payrollperiode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {/* H. Alpa */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${(selectedPayroll.attendance?.halpa || 0) > 0
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block">H. Alpa</span>
                    <span className={`text-base font-extrabold ${(selectedPayroll.attendance?.halpa || 0) > 0 ? 'text-red-600' : 'text-zen-charcoal'}`}>
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
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${(selectedPayroll.attendance?.hlate1 || 0) > 0
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block leading-tight">Terlambat &lt;30m</span>
                    <span className={`text-base font-extrabold ${(selectedPayroll.attendance?.hlate1 || 0) > 0 ? 'text-amber-600' : 'text-zen-charcoal'}`}>
                      {selectedPayroll.attendance?.hlate1 ?? 0}
                    </span>
                  </div>

                  {/* H. Terlambat > 30 Menit */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${(selectedPayroll.attendance?.hlate2 || 0) > 0
                    ? 'bg-orange-50/70 border-orange-200 text-orange-900'
                    : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block leading-tight">Terlambat &gt;30m</span>
                    <span className={`text-base font-extrabold ${(selectedPayroll.attendance?.hlate2 || 0) > 0 ? 'text-orange-600' : 'text-zen-charcoal'}`}>
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
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${(selectedPayroll.attendance?.hunder || 0) > 0
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block">Under Time</span>
                    <span className={`text-base font-extrabold ${(selectedPayroll.attendance?.hunder || 0) > 0 ? 'text-amber-600' : 'text-zen-charcoal'}`}>
                      {selectedPayroll.attendance?.hunder ?? 0}
                    </span>
                  </div>

                  {/* H. Tidak Absen */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${(selectedPayroll.attendance?.hitidakabsen || 0) > 0
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block">Tidak Absen</span>
                    <span className={`text-base font-extrabold ${(selectedPayroll.attendance?.hitidakabsen || 0) > 0 ? 'text-red-600' : 'text-zen-charcoal'}`}>
                      {selectedPayroll.attendance?.hitidakabsen ?? 0}
                    </span>
                  </div>

                  {/* H. Ijin Tidak Masuk */}
                  <div className={`p-2.5 rounded-xl border text-center transition-all ${(selectedPayroll.attendance?.hitidakmasuk || 0) > 0
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-zen-paper/40 border-zen-sand/30 text-zen-charcoal'
                  }`}>
                    <span className="text-[10px] font-semibold text-zen-muted block leading-tight">Ijin Tdk Masuk</span>
                    <span className={`text-base font-extrabold ${(selectedPayroll.attendance?.hitidakmasuk || 0) > 0 ? 'text-amber-600' : 'text-zen-charcoal'}`}>
                      {selectedPayroll.attendance?.hitidakmasuk ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Catatan Kesalahan Karyawan (hrd_kpi_faults) */}
            {selectedPayroll && (
              <div className="mt-4 pt-4 border-t border-zen-stone/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-zen-charcoal">
                      Catatan Kesalahan Karyawan Pada Periode Evaluasi ({selectedPayroll.startDate} s/d {selectedPayroll.endDate})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zen-muted font-medium">
                      Total Poin Pengurang:
                    </span>
                    <Badge
                      className={`font-mono text-xs font-black px-2.5 py-0.5 ${totalPengurang > 0
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
                    Memeriksa catatan kesalahan karyawan...
                  </div>
                ) : periodFaults.length === 0 ? (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Karyawan ini <strong>tidak memiliki catatan kesalahan (Employee Faults)</strong> pada rentang tanggal periode evaluasi terpilih.
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${f.kategori === 'Berat'
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

        {/* STEP 2: 3 RECENT EVALUATIONS HISTORY PEEK */}
        <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zen-stone/60">
              <h2 className="text-sm font-bold text-zen-charcoal flex items-center gap-2">
                <History className="w-4 h-4 text-zen-matcha" />
                <span>3 Riwayat Evaluasi KPI Terakhir Karyawan Ini</span>
              </h2>
              {loadingHistory && (
                <span className="text-xs text-zen-muted animate-pulse">Memuat riwayat...</span>
              )}
            </div>

            {recentEvaluations.length === 0 ? (
              <div className="py-6 text-center text-xs text-zen-muted bg-zen-paper/30 rounded-xl border border-dashed border-zen-sand/40">
                <Info className="w-5 h-5 mx-auto mb-1 text-zen-sand" />
                <p>Belum ada catatan evaluasi KPI sebelumnya untuk karyawan ini.</p>
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
                        className={`text-xs font-black px-2 py-0.5 rounded-full border ${rev.nilai_total >= 8.5
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

        {/* STEP 3: DYNAMIC KPI VARIABLE EVALUATION MATRIX BY DEPARTMENT */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base font-bold font-serif text-zen-charcoal flex items-center gap-2">
              <Award className="w-5 h-5 text-zen-matcha" />
              <span>
                Langkah 2: Penilaian Variabel KPI{' '}
                {selectedEmployeeObj?.departemen ? `(Departemen: ${selectedEmployeeObj.departemen})` : ''}
              </span>
            </h2>
            <span className="text-xs text-zen-muted">
              Default Nilai: 5, Maksimal: 10 • Total {formItems.length} variabel penilaian
            </span>
          </div>

          {loadingVariables ? (
            <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white">
              <CardContent className="p-8 text-center text-xs text-zen-muted animate-pulse">
                Memuat variabel KPI untuk departemen {selectedEmployeeObj?.departemen || '-'}...
              </CardContent>
            </Card>
          ) : formItems.length === 0 ? (
            <Card className="rounded-2xl border-amber-200/80 shadow-zen bg-amber-50/40">
              <CardContent className="p-6 text-center text-xs text-amber-800 space-y-1">
                <Info className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                <p className="font-semibold">
                  Belum ada variabel KPI aktif untuk departemen{' '}
                  <strong>{selectedEmployeeObj?.departemen || '-'}</strong>.
                </p>
                <p className="text-amber-700/80">
                  Silakan tambahkan variabel KPI untuk departemen tersebut melalui menu HRD &rarr; KPI Variable terlebih dahulu.
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedItems.map((group) => (
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
                                  className={`w-6 h-7 sm:w-7 sm:h-8 rounded-lg text-xs font-bold transition-all ${isSelected
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
                          placeholder="Catatan / observasi spesifik untuk variabel KPI ini (opsional)..."
                          value={item.catatan_variable}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleNotesChange(item.variable_id, e.target.value)
                          }
                          className="h-8 text-xs rounded-xl bg-zen-paper/30 border-zen-sand/40"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* STEP 4: FINAL SCORE SUMMARY & KESIMPULAN */}
        <Card className="rounded-2xl border-zen-sand/40 shadow-zen bg-white overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-sm font-bold text-zen-charcoal flex items-center gap-2 mb-4 pb-2 border-b border-zen-stone/60">
              <Sparkles className="w-4 h-4 text-zen-matcha" />
              <span>Langkah 3: Kesimpulan & Nilai Total KPI</span>
            </h2>

            {/* 3 Summary Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Total Variabel KPI */}
              <div className="p-4 rounded-2xl bg-zen-paper/60 border border-zen-sand/50 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider block mb-1">
                    Rata-Rata Variabel KPI
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
                    Total Poin Pengurang (Employee Faults)
                  </span>
                  <div className="flex items-baseline justify-center">
                    <span className={`text-3xl font-extrabold tracking-tight ${totalPengurang > 0 ? 'text-red-600' : 'text-zen-moss'}`}>
                      {totalPengurang > 0 ? `-${totalPengurang}` : '0'}
                    </span>
                    <span className="text-xs text-zen-muted ml-1">Poin</span>
                  </div>
                </div>
                <p className="text-[10px] text-zen-muted mt-2">
                  {periodFaults.length > 0 ? (
                    <span className="text-red-600 font-semibold">{periodFaults.length} catatan kesalahan karyawan</span>
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
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${nilaiTotalAkhir >= 8.5
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
                  {formItems.length > 0
                    ? `(${sumSkorVariabel} skor - ${totalPengurang} pengurang) / ${formItems.length} var`
                    : 'Menunggu variabel KPI departemen'}
                </p>
              </div>
            </div>

            {/* Kesimpulan Text Area */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zen-charcoal mb-1">
                  Kesimpulan & Catatan Evaluator
                </label>
                <Textarea
                  placeholder="Tuliskan kesimpulan evaluasi KPI, apresiasi kinerja, atau rekomendasi tindakan perbaikan (coaching/training) untuk karyawan ini..."
                  value={kesimpulan}
                  onChange={(e) => setKesimpulan(e.target.value)}
                  rows={4}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-zen-muted flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zen-matcha" />
                  <span>Pengurang poin otomatis disinkronkan dari catatan Employee Faults pada periode payroll terpilih.</span>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedKaryawan || formItems.length === 0}
                  className="rounded-xl bg-zen-matcha hover:bg-zen-moss text-white px-6 font-bold shadow-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? 'Menyimpan...' : 'Simpan Laporan KPI'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Pratinjau Foto Karyawan Ukuran Penuh */}
        <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
          <DialogContent className="sm:max-w-md bg-white border-zen-sand p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-zen-charcoal truncate">
                Foto Resmi: {previewPhotoName}
              </DialogTitle>
            </DialogHeader>
            {previewPhotoUrl && (
              <div className="flex items-center justify-center p-3">
                <img
                  src={previewPhotoUrl}
                  alt={previewPhotoName}
                  className="max-h-[65vh] max-w-full rounded-2xl object-contain border border-zen-sand/60 shadow-md"
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhotoPreviewOpen(false)}
                className="border-zen-sand text-xs"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default EmployeeKpiPage;
