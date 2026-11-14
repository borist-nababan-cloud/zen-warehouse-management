import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import type { HrdKpiFault, HrdReportKpi, HrdReportKpiDetail } from '@/types/hrd';
import type { MasterOutlet } from '@/types/database';
import { printEmployeeKpiEvaluationA4, printReportA4 } from '@/utils/reportPrintUtils';

const formatDateId = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTimeId = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatScore = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0';
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const getScoreBadgeClass = (score?: number | null): string => {
  const num = Number(score || 0);
  if (num >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (num >= 75) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (num >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

const getEmployeeInitials = (name?: string | null): string => {
  if (!name) return 'KR';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

export const ReportEmployeeKpiPage: React.FC = () => {
  const { user } = useAuthUser();
  const userRole = Number(user?.user_role || 0);
  const userOutletCode = user?.kode_outlet || '';
  const isOutletRestricted = [6, 14].includes(userRole);
  const isOnlyAdminEmployee = userRole === 6;
  const canCreate = [2, 5, 6, 8, 14].includes(userRole);

  const [outlets, setOutlets] = useState<Partial<MasterOutlet>[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [reports, setReports] = useState<HrdReportKpi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPeriods, setLoadingPeriods] = useState<boolean>(false);
  const [printingMain, setPrintingMain] = useState<boolean>(false);
  const [printingRowUid, setPrintingRowUid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail modal states
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<HrdReportKpi | null>(null);
  const [detailVariables, setDetailVariables] = useState<HrdReportKpiDetail[]>([]);
  const [detailFaults, setDetailFaults] = useState<HrdKpiFault[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Photo zoom modal
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (isOutletRestricted && userOutletCode) {
      setSelectedOutlet(userOutletCode);
    }
  }, [isOutletRestricted, userOutletCode]);

  const effectiveOutlet = isOutletRestricted ? userOutletCode : selectedOutlet;

  const loadOutlets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('master_outlet')
        .select('kode_outlet, name_outlet, city, province, alamat, no_telp, active, can_sto')
        .or('active.eq.true,can_sto.eq.true')
        .order('kode_outlet', { ascending: true });

      if (error) throw error;
      setOutlets((data || []) as Partial<MasterOutlet>[]);
    } catch (err) {
      console.error('Gagal memuat daftar cabang/outlet:', err);
    }
  }, []);

  useEffect(() => {
    void loadOutlets();
  }, [loadOutlets]);

  const loadPeriods = useCallback(async () => {
    if (!user) return;
    if (isOutletRestricted && !userOutletCode) {
      setPeriods([]);
      return;
    }

    setLoadingPeriods(true);
    try {
      const result = await hrdEvaluationService.getKpiPayrollPeriods(
        effectiveOutlet && effectiveOutlet !== 'ALL' ? effectiveOutlet : undefined
      );
      setPeriods(result);
      setSelectedPeriod((prev) => {
        if (prev !== 'ALL' && result.includes(prev)) return prev;
        return 'ALL';
      });
    } catch (err) {
      console.error('Gagal memuat periode payroll KPI:', err);
    } finally {
      setLoadingPeriods(false);
    }
  }, [user, isOutletRestricted, userOutletCode, effectiveOutlet]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    if (isOutletRestricted && !userOutletCode) {
      setReports([]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await hrdEvaluationService.getKpiEvaluationsList({
        outletCode: effectiveOutlet && effectiveOutlet !== 'ALL' ? effectiveOutlet : undefined,
        payrollperiode: selectedPeriod !== 'ALL' ? selectedPeriod : undefined,
        onlyAdmin: isOnlyAdminEmployee,
      });
      setReports(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat laporan KPI karyawan.';
      setErrorMessage(msg);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [user, isOutletRestricted, userOutletCode, effectiveOutlet, selectedPeriod, isOnlyAdminEmployee]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return reports;
    return reports.filter((item) => {
      const haystack = [
        item.kode_report,
        item.kodekaryawan,
        item.karyawan_info?.namakaryawan,
        item.karyawan_info?.idkaryawan,
        item.departemen,
        item.kode_outlet,
        item.master_outlet?.name_outlet,
        item.payrollperiode,
        item.kesimpulan,
        item.update_by_name,
        item.created_by_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [reports, searchQuery]);

  const summary = useMemo(() => {
    const totalCount = filteredReports.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        avgTotal: 0,
        avgDeduction: 0,
        highPerformanceCount: 0,
      };
    }

    let sumScore = 0;
    let sumDeduction = 0;
    let highPerformanceCount = 0;

    for (const row of filteredReports) {
      const score = Number(row.nilai_total || 0);
      const deduction = Number(row.total_pengurang || 0);
      sumScore += score;
      sumDeduction += deduction;
      if (score >= 75) {
        highPerformanceCount += 1;
      }
    }

    return {
      totalCount,
      avgTotal: sumScore / totalCount,
      avgDeduction: sumDeduction / totalCount,
      highPerformanceCount,
    };
  }, [filteredReports]);

  const selectedOutletObj = useMemo(
    () => outlets.find((o) => o.kode_outlet === effectiveOutlet) || null,
    [outlets, effectiveOutlet]
  );

  const resolveDetailsAndFaults = useCallback(
    async (report: HrdReportKpi): Promise<{ details: HrdReportKpiDetail[]; faults: HrdKpiFault[] }> => {
      let details: HrdReportKpiDetail[] = report.details || [];
      if (!details || details.length === 0) {
        const fetched = await hrdEvaluationService.getKpiEvaluationDetail(report.uid);
        if (fetched?.details) {
          details = fetched.details;
        }
      }

      const periodDates = hrdEvaluationService.parsePayrollPeriod(report.payrollperiode || '');
      let faults: HrdKpiFault[] = [];
      if (periodDates && report.kodekaryawan) {
        faults = await hrdEvaluationService.getEmployeeKpiFaultsByDateRange(
          report.kodekaryawan,
          periodDates.startDate,
          periodDates.endDate
        );
      }

      return { details, faults };
    },
    []
  );

  const handleOpenDetail = async (report: HrdReportKpi) => {
    setSelectedReport(report);
    setDetailVariables(report.details || []);
    setDetailFaults([]);
    setDetailModalOpen(true);
    setLoadingDetail(true);

    try {
      const { details, faults } = await resolveDetailsAndFaults(report);
      setDetailVariables(details);
      setDetailFaults(faults);
    } catch (err) {
      console.error('Gagal memuat rincian evaluasi KPI karyawan:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrintIndividual = async (
    report: HrdReportKpi,
    preloadedDetails?: HrdReportKpiDetail[],
    preloadedFaults?: HrdKpiFault[]
  ) => {
    setPrintingRowUid(report.uid);
    try {
      let details = preloadedDetails;
      let faults = preloadedFaults;

      if (!details || !faults) {
        const resolved = await resolveDetailsAndFaults(report);
        details = details || resolved.details;
        faults = faults || resolved.faults;
      }

      const periodDates = hrdEvaluationService.parsePayrollPeriod(report.payrollperiode || '');
      await printEmployeeKpiEvaluationA4({
        report,
        details: details || [],
        faults: faults || [],
        evaluatorName: report.update_by_name || report.created_by_name || user?.full_name || user?.email,
        availableOutlets: outlets,
        periodDates,
      });
    } catch (err) {
      console.error('Gagal mencetak lembar KPI individual:', err);
      setErrorMessage('Gagal menyiapkan pratinjau cetak lembar KPI karyawan.');
    } finally {
      setPrintingRowUid(null);
    }
  };

  const handlePrintMainReportA4 = async () => {
    if (filteredReports.length === 0) return;
    setPrintingMain(true);
    try {
      await printReportA4({
        title: 'LAPORAN REKAPITULASI KPI KARYAWAN (NON-TR/TB)',
        subtitle: 'Rekapitulasi hasil evaluasi KPI berkala karyawan aktif non-TR/TB.',
        canSelectOutlet: !isOutletRestricted,
        selectedOutlet: effectiveOutlet || userOutletCode || 'ALL',
        userOutletCode,
        availableOutlets: outlets,
        statusLabel:
          selectedPeriod === 'ALL' ? 'Semua Periode Payroll' : `Periode: ${selectedPeriod}`,
        extraFilters: [
          ...(isOnlyAdminEmployee
            ? [{ label: 'Filter Karyawan', value: 'Admin Cabang (isadmin = Y)' }]
            : []),
          ...(searchQuery.trim()
            ? [{ label: 'Pencarian', value: searchQuery.trim() }]
            : []),
        ],
        summaryItems: [
          { label: 'Total Evaluasi', value: String(summary.totalCount) },
          { label: 'Rata-rata Nilai KPI', value: formatScore(summary.avgTotal) },
          { label: 'Rata-rata Pengurang', value: `-${formatScore(summary.avgDeduction)}` },
          { label: 'Nilai >= 75', value: `${summary.highPerformanceCount} Karyawan` },
        ],
        columns: [
          { header: 'No', width: '4%', align: 'center' },
          { header: 'Kode Report', width: '12%', align: 'left' },
          { header: 'Tgl Evaluasi', width: '9%', align: 'center' },
          { header: 'Cabang', width: '11%', align: 'left' },
          { header: 'Karyawan', width: '15%', align: 'left' },
          { header: 'Departemen', width: '10%', align: 'left' },
          { header: 'Periode Payroll', width: '13%', align: 'center' },
          { header: 'Pengurang', width: '7%', align: 'right' },
          { header: 'Nilai Total', width: '7%', align: 'right' },
          { header: 'Kesimpulan', width: '12%', align: 'left' },
        ],
        rows: filteredReports.map((item, idx) => [
          String(idx + 1),
          item.kode_report || '-',
          formatDateId(item.tanggal_report),
          `${item.kode_outlet}${item.master_outlet?.name_outlet ? ` - ${item.master_outlet.name_outlet}` : ''}`,
          `${item.karyawan_info?.namakaryawan || '-'} (${item.kodekaryawan || '-'})`,
          item.departemen || '-',
          item.payrollperiode || '-',
          `-${formatScore(item.total_pengurang)}`,
          formatScore(item.nilai_total),
          item.kesimpulan || '-',
        ]),
        signatures: [
          { title: 'Dicetak Oleh', name: user?.full_name || user?.email || '-' },
          { title: 'Mengetahui (HRD / Pimpinan)', name: '________________________' },
        ],
      });
    } catch (err) {
      console.error('Gagal mencetak rekap laporan KPI:', err);
      setErrorMessage('Gagal menyiapkan pratinjau cetak laporan KPI.');
    } finally {
      setPrintingMain(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredReports.length === 0) return;

    const escapeCsv = (val: unknown): string => {
      const str = String(val ?? '');
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'No',
      'Kode Report',
      'Tanggal Evaluasi',
      'Kode Outlet',
      'Nama Cabang',
      'Kode Karyawan',
      'ID Karyawan',
      'Nama Karyawan',
      'Departemen',
      'Periode Payroll',
      'Total Pengurang',
      'Nilai Total',
      'Nilai Guest',
      'Kesimpulan',
      'Diperbarui Oleh',
      'Waktu Update',
    ];

    const rows = filteredReports.map((item, idx) => [
      idx + 1,
      item.kode_report || '-',
      item.tanggal_report || '-',
      item.kode_outlet || '-',
      item.master_outlet?.name_outlet || '-',
      item.kodekaryawan || '-',
      item.karyawan_info?.idkaryawan || '-',
      item.karyawan_info?.namakaryawan || '-',
      item.departemen || '-',
      item.payrollperiode || '-',
      Number(item.total_pengurang || 0),
      Number(item.nilai_total || 0),
      item.nilai_guest ?? '-',
      item.kesimpulan || '-',
      item.update_by_name || item.created_by_name || '-',
      item.update_at || item.created_at || '-',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safePeriod = (selectedPeriod || 'Semua_Periode').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Laporan_Employee_KPI_${safePeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const groupedDetails = useMemo(() => {
    const groups: Record<string, HrdReportKpiDetail[]> = {};
    for (const item of detailVariables) {
      const cat = item.nama_kategori || 'Umum';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return Object.entries(groups);
  }, [detailVariables]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Laporan Evaluasi KPI Karyawan (Employee KPI)
                </h1>
                <p className="text-sm text-slate-500">
                  Daftar hasil evaluasi KPI karyawan non-TR/TB lengkap dengan rincian variabel, pengurangan kesalahan, dan cetak per individu.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isOutletRestricted && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Cabang Terkunci: {userOutletCode || '-'}
                  {selectedOutletObj ? ` (${selectedOutletObj.name_outlet})` : ''}
                </span>
              )}
              {isOnlyAdminEmployee && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                  <UserCheck className="h-3.5 w-3.5" />
                  Khusus Karyawan Admin Cabang (isadmin = Y)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCreate && (
              <Link
                to="/hrd/employee-kpi"
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
              >
                <Plus className="h-4 w-4" />
                Buat Employee KPI
              </Link>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredReports.length === 0 || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </button>
            <button
              type="button"
              onClick={handlePrintMainReportA4}
              disabled={filteredReports.length === 0 || loading || printingMain}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {printingMain ? 'Menyiapkan...' : 'Cetak Laporan A4'}
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Evaluasi KPI
              </span>
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalCount}</p>
            <p className="mt-0.5 text-xs text-slate-500">Dokumen evaluasi tampil</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Rata-rata Nilai Total
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{formatScore(summary.avgTotal)}</p>
            <p className="mt-0.5 text-xs text-slate-500">Skor akhir rata-rata karyawan</p>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Rata-rata Poin Pengurang
              </span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-700">
              -{formatScore(summary.avgDeduction)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Rata-rata penalti kesalahan</p>
          </div>

          <div className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Kategori Baik / Sangat Baik
              </span>
              <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-sky-700">{summary.highPerformanceCount}</p>
            <p className="mt-0.5 text-xs text-slate-500">Evaluasi dengan nilai total &ge; 75</p>
          </div>
        </div>

        {/* 3-Step Filter Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Filter className="h-4 w-4 text-indigo-600" />
              Filter Laporan KPI (3 Langkah)
            </div>
            <button
              type="button"
              onClick={() => void fetchReports()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Step 1: Cabang Outlet */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                1. Cabang / Outlet
              </label>
              <select
                value={effectiveOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                disabled={isOutletRestricted}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              >
                {!isOutletRestricted && <option value="ALL">SEMUA OUTLET (NASIONAL)</option>}
                {outlets.map((outlet) => (
                  <option key={outlet.kode_outlet} value={outlet.kode_outlet}>
                    {outlet.kode_outlet} - {outlet.name_outlet}
                    {outlet.active === false && outlet.can_sto ? ' (STO)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Periode Payroll */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                2. Periode Payroll
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                disabled={loadingPeriods}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:opacity-60"
              >
                <option value="ALL">Semua Periode Payroll</option>
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Pencarian Cepat */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Search className="h-3.5 w-3.5 text-indigo-500" />
                3. Pencarian Cepat
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, kode report, departemen, kesimpulan..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Gagal Memuat Data</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Data Grid Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center">
            <h2 className="text-sm font-semibold text-slate-800">
              Daftar Evaluasi KPI Karyawan
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Menampilkan {filteredReports.length} evaluasi
              {reports.length !== filteredReports.length ? ` (dari total ${reports.length})` : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 text-center">No</th>
                  <th className="px-4 py-3.5">Karyawan</th>
                  <th className="px-4 py-3.5">Dokumen &amp; Periode</th>
                  <th className="px-4 py-3.5">Departemen &amp; Cabang</th>
                  <th className="px-4 py-3.5 text-right">Pengurang</th>
                  <th className="px-4 py-3.5 text-center">Nilai Total</th>
                  <th className="px-4 py-3.5">Kesimpulan</th>
                  <th className="px-4 py-3.5">Diperbarui Oleh</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                        <span>Memuat daftar laporan KPI karyawan...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ClipboardList className="h-8 w-8 text-slate-300" />
                        <p className="font-medium text-slate-700">
                          Belum ada data evaluasi KPI karyawan pada filter yang dipilih.
                        </p>
                        <p className="text-xs text-slate-400">
                          Silakan ubah pilihan cabang, periode payroll, atau kata kunci pencarian.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((item, idx) => {
                    const empName = item.karyawan_info?.namakaryawan || item.kodekaryawan || '-';
                    const empPhoto = item.karyawan_info?.foto_url;
                    const isRowPrinting = printingRowUid === item.uid;

                    return (
                      <tr key={item.uid} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3.5 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {empPhoto ? (
                              <button
                                type="button"
                                onClick={() => setZoomedPhoto({ url: empPhoto, name: empName })}
                                className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
                                title="Klik untuk memperbesar foto"
                              >
                                <img
                                  src={empPhoto}
                                  alt={empName}
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition group-hover:opacity-100">
                                  <ZoomIn className="h-3.5 w-3.5 text-white" />
                                </span>
                              </button>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                {getEmployeeInitials(empName)}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-900">{empName}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                <span>Kode: {item.kodekaryawan || '-'}</span>
                                {item.karyawan_info?.idkaryawan && (
                                  <span>• ID: {item.karyawan_info.idkaryawan}</span>
                                )}
                                {item.karyawan_info?.isadmin === 'Y' && (
                                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                    Admin
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-xs font-semibold text-indigo-700">
                            {item.kode_report || '-'}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-600">
                            Tgl: {formatDateId(item.tanggal_report)}
                          </div>
                          <div className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                            {item.payrollperiode || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                            {item.departemen || '-'}
                          </span>
                          <div className="mt-1 text-xs font-medium text-slate-700">
                            {item.kode_outlet}
                            {item.master_outlet?.name_outlet
                              ? ` - ${item.master_outlet.name_outlet}`
                              : ''}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-rose-600">
                          -{formatScore(item.total_pengurang)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getScoreBadgeClass(
                              item.nilai_total
                            )}`}
                          >
                            {formatScore(item.nilai_total)}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-xs text-slate-700">
                          <p className="line-clamp-2 font-medium" title={item.kesimpulan || ''}>
                            {item.kesimpulan || '-'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="text-xs font-medium text-slate-800">
                            {item.update_by_name || item.created_by_name || '-'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatDateTimeId(item.update_at || item.created_at)}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleOpenDetail(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                              title="Lihat Rincian Evaluasi KPI"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Lihat Rincian
                            </button>
                            <button
                              type="button"
                              onClick={() => void handlePrintIndividual(item)}
                              disabled={isRowPrinting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                              title="Cetak Lembar KPI Karyawan"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              {isRowPrinting ? 'Menyiapkan...' : 'Cetak'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Rincian Evaluasi KPI Karyawan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dokumen: {selectedReport.kode_report} &bull; Periode: {selectedReport.payrollperiode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Identity & Score Summary */}
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
                <div className="flex items-center gap-3 md:col-span-2">
                  {selectedReport.karyawan_info?.foto_url ? (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedPhoto({
                          url: selectedReport.karyawan_info?.foto_url || '',
                          name:
                            selectedReport.karyawan_info?.namakaryawan ||
                            selectedReport.kodekaryawan,
                        })
                      }
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow"
                    >
                      <img
                        src={selectedReport.karyawan_info.foto_url}
                        alt={selectedReport.karyawan_info.namakaryawan || 'Foto Karyawan'}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700">
                      {getEmployeeInitials(
                        selectedReport.karyawan_info?.namakaryawan || selectedReport.kodekaryawan
                      )}
                    </div>
                  )}
                  <div className="space-y-0.5 text-sm">
                    <div className="text-base font-bold text-slate-900">
                      {selectedReport.karyawan_info?.namakaryawan || selectedReport.kodekaryawan}
                    </div>
                    <div className="text-xs text-slate-600">
                      Kode: {selectedReport.kodekaryawan}
                      {selectedReport.karyawan_info?.idkaryawan
                        ? ` • ID: ${selectedReport.karyawan_info.idkaryawan}`
                        : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                        Departemen: {selectedReport.departemen || '-'}
                      </span>
                      <span className="rounded-md bg-slate-200/70 px-2 py-0.5 font-medium text-slate-700">
                        {selectedReport.kode_outlet}
                        {selectedReport.master_outlet?.name_outlet
                          ? ` - ${selectedReport.master_outlet.name_outlet}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-2 border-t border-slate-200 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Tanggal Evaluasi</span>
                    <span className="font-semibold text-slate-900">
                      {formatDateId(selectedReport.tanggal_report)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total Pengurang</span>
                    <span className="font-bold text-rose-600">
                      -{formatScore(selectedReport.total_pengurang)}
                    </span>
                  </div>
                  {selectedReport.nilai_guest !== null && selectedReport.nilai_guest !== undefined && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Nilai Tambahan / Guest</span>
                      <span className="font-semibold text-slate-800">
                        {formatScore(selectedReport.nilai_guest)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm">
                    <span className="font-semibold text-slate-800">Nilai Total KPI</span>
                    <span
                      className={`rounded-lg border px-2.5 py-0.5 font-bold ${getScoreBadgeClass(
                        selectedReport.nilai_total
                      )}`}
                    >
                      {formatScore(selectedReport.nilai_total)}
                    </span>
                  </div>
                </div>
              </div>

              {loadingDetail ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                  Memuat rincian variabel KPI &amp; daftar kesalahan periode...
                </div>
              ) : (
                <>
                  {/* Category-grouped Variable Scores */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800">
                      Rincian Nilai Variabel KPI per Kategori
                    </h4>
                    {groupedDetails.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                        Tidak ada rincian variabel KPI tercatat untuk dokumen ini.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {groupedDetails.map(([category, vars]) => (
                          <div
                            key={category}
                            className="overflow-hidden rounded-xl border border-slate-200"
                          >
                            <div className="bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                              {category}
                            </div>
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                              <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                  <th className="px-4 py-2 text-left">Variabel KPI</th>
                                  <th className="px-4 py-2 text-right">Nilai</th>
                                  <th className="px-4 py-2 text-left">Catatan Penilai</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {vars.map((v) => (
                                  <tr key={v.uid}>
                                    <td className="px-4 py-2.5 font-medium text-slate-800">
                                      {v.nama_variable}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-indigo-700">
                                      {formatScore(v.nilai_variable)}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600">
                                      {v.catatan_variable || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Related Faults Table */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800">
                      Daftar Kesalahan Karyawan pada Periode ({selectedReport.payrollperiode})
                    </h4>
                    {detailFaults.length === 0 ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs font-medium text-emerald-700">
                        Tidak ada catatan kesalahan karyawan (hrd_kpi_faults) pada periode ini.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-rose-200">
                        <table className="min-w-full divide-y divide-rose-100 text-xs">
                          <thead className="bg-rose-50 text-rose-700">
                            <tr>
                              <th className="px-3 py-2 text-left">Tanggal</th>
                              <th className="px-3 py-2 text-left">Jenis Kesalahan</th>
                              <th className="px-3 py-2 text-center">Kategori</th>
                              <th className="px-3 py-2 text-right">Pengurang</th>
                              <th className="px-3 py-2 text-left">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-100 bg-white">
                            {detailFaults.map((f) => (
                              <tr key={f.uid}>
                                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                                  {formatDateId(f.tanggal)}
                                </td>
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {f.nama_faults}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                    {f.kategori}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-rose-600">
                                  -{Number(f.pengurang || 0)}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {f.keterangan || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Conclusion & Auto Notes */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Kesimpulan Evaluasi
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-slate-800">
                        {selectedReport.kesimpulan || '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Catatan Otomatis / Kehadiran
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-xs text-slate-700">
                        {selectedReport.catatan_auto || '-'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <div className="text-xs text-slate-500">
                Diperbarui oleh:{' '}
                <span className="font-semibold text-slate-700">
                  {selectedReport.update_by_name || selectedReport.created_by_name || '-'}
                </span>{' '}
                ({formatDateTimeId(selectedReport.update_at || selectedReport.created_at)})
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handlePrintIndividual(selectedReport, detailVariables, detailFaults)
                  }
                  disabled={loadingDetail || printingRowUid === selectedReport.uid}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {printingRowUid === selectedReport.uid
                    ? 'Menyiapkan...'
                    : 'Cetak Lembar KPI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomedPhoto(null)}
        >
          <div
            className="relative max-w-lg overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold text-slate-800">{zoomedPhoto.name}</span>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={zoomedPhoto.url}
              alt={zoomedPhoto.name}
              className="max-h-[75vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReportEmployeeKpiPage;
