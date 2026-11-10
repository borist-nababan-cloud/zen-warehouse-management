import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import { supabase } from '@/lib/supabase';
import { MasterOutlet } from '@/types/database';
import { HrdReportTr, HrdReportTrDetail, HrdTrFault } from '@/types/hrd';
import {
  printReportA4,
  printTherapistEvaluationA4,
} from '@/utils/reportPrintUtils';
import {
  FileText,
  Search,
  Calendar,
  Building2,
  RefreshCw,
  Plus,
  Eye,
  Printer,
  Award,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function TrReportListPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  // Role permissions: Roles 8 (Superuser), 15 (Evaluator), 16 (HR Holding) can create evaluations
  const canCreate = [8, 15, 16].includes(Number(user?.user_role));

  // 1. Filter States
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');

  const [payrollPeriods, setPayrollPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');

  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. Data States
  const [reports, setReports] = useState<HrdReportTr[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPeriods, setLoadingPeriods] = useState<boolean>(false);

  // 3. Selected Detail Modal States
  const [selectedReport, setSelectedReport] = useState<HrdReportTr | null>(null);
  const [reportFaults, setReportFaults] = useState<HrdTrFault[]>([]);
  const [loadingFaults, setLoadingFaults] = useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // 4. Photo Preview Zoom Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // 1. Initial Load: Fetch Outlets list
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const { data, error } = await supabase
          .from('master_outlet')
          .select('kode_outlet, name_outlet, city, province, alamat, no_telp, active')
          .eq('active', true)
          .order('kode_outlet', { ascending: true });

        if (error) throw error;
        setOutlets((data as MasterOutlet[]) || []);
      } catch (err: any) {
        console.error('Error fetching outlets:', err);
      }
    };

    fetchOutlets();
  }, []);

  // 2. Fetch Payroll Periods when Outlet changes or on initial load
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoadingPeriods(true);
        const periods = await hrdEvaluationService.getPayrollPeriods(selectedOutlet);
        setPayrollPeriods(periods);

        // Auto select the latest period if available and currently 'ALL'
        if (periods.length > 0 && selectedPeriod === 'ALL') {
          setSelectedPeriod(periods[0]);
        }
      } catch (err: any) {
        console.error('Error fetching payroll periods:', err);
      } finally {
        setLoadingPeriods(false);
      }
    };

    fetchPeriods();
  }, [selectedOutlet]);

  // 3. Fetch Reports List based on Selected Outlet and Selected Period
  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await hrdEvaluationService.getEvaluationsList({
        outletCode: selectedOutlet,
        payrollperiode: selectedPeriod,
      });

      setReports(data);
    } catch (err: any) {
      console.error('Error fetching evaluation reports:', err);
      toast.error('Gagal memuat laporan evaluasi terapis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedOutlet, selectedPeriod]);

  // 4. Handle Opening Detail Modal & Fetch Related Faults for the Period
  const handleOpenDetail = async (report: HrdReportTr) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
    setReportFaults([]);

    if (report.payrollperiode) {
      const dates = hrdEvaluationService.parsePayrollPeriod(report.payrollperiode);
      if (dates) {
        try {
          setLoadingFaults(true);
          const faults = await hrdEvaluationService.getTherapistFaultsByDateRange(
            report.kodekaryawan,
            dates.startDate,
            dates.endDate
          );
          setReportFaults(faults);
        } catch (err) {
          console.warn('Error fetching therapist faults for modal:', err);
        } finally {
          setLoadingFaults(false);
        }
      }
    }
  };

  // 5. Client-side Search Filter (by Nama Karyawan, Kode Karyawan, ID Karyawan, or Kode Report)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase().trim();
    return reports.filter((r) => {
      const nama = r.karyawan_info?.namakaryawan?.toLowerCase() || '';
      const kodeKar = r.kodekaryawan?.toLowerCase() || '';
      const idKar = r.karyawan_info?.idkaryawan?.toLowerCase() || '';
      const kodeRep = r.kode_report?.toLowerCase() || '';
      const outletCode = r.kode_outlet?.toLowerCase() || '';
      const outletName = r.master_outlet?.name_outlet?.toLowerCase() || '';
      return (
        nama.includes(q) ||
        kodeKar.includes(q) ||
        idKar.includes(q) ||
        kodeRep.includes(q) ||
        outletCode.includes(q) ||
        outletName.includes(q)
      );
    });
  }, [reports, searchQuery]);

  // 6. Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = filteredReports.length;
    if (totalCount === 0) {
      return { totalCount: 0, avgScore: 0, topScores: 0, totalPengurang: 0 };
    }
    const sum = filteredReports.reduce((acc, r) => acc + (Number(r.nilai_total) || 0), 0);
    const avgScore = Number((sum / totalCount).toFixed(2));
    const topScores = filteredReports.filter((r) => Number(r.nilai_total) >= 8.5).length;
    const totalPengurang = filteredReports.reduce(
      (acc, r) => acc + (Number(r.total_pengurang) || 0),
      0
    );
    return { totalCount, avgScore, topScores, totalPengurang };
  }, [filteredReports]);

  // Group Details by Category for Modal
  const modalGroupedDetails = useMemo(() => {
    if (!selectedReport?.details) return {};
    const groups: Record<string, HrdReportTrDetail[]> = {};
    selectedReport.details.forEach((det) => {
      const cat = det.nama_kategori || 'Variabel Penilaian';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(det);
    });
    return groups;
  }, [selectedReport]);

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8.5) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    if (score >= 7.0) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (score >= 5.0) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
  };

  // Helper to format payroll period display string
  const formatPeriodLabel = (periodStr: string) => {
    if (!periodStr || periodStr === 'ALL') return 'SEMUA PERIODE PAYROLL';
    const parsed = hrdEvaluationService.parsePayrollPeriod(periodStr);
    if (!parsed) return periodStr;
    return `${parsed.startDate} s/d ${parsed.endDate} (${periodStr})`;
  };

  // 7. Print Handler for Main Grid Report (A4 Format)
  const handlePrintMainGrid = async () => {
    if (filteredReports.length === 0) {
      toast.error('Tidak ada data evaluasi untuk dicetak');
      return;
    }

    const isAll = selectedOutlet === 'ALL';
    const periodDates =
      selectedPeriod !== 'ALL'
        ? hrdEvaluationService.parsePayrollPeriod(selectedPeriod)
        : null;

    const columns = isAll
      ? [
          { header: 'No', width: '30px', align: 'center' as const },
          { header: 'Outlet', width: '85px', align: 'left' as const },
          { header: 'Kode TR', width: '60px', align: 'left' as const },
          { header: 'ID Karyawan', width: '75px', align: 'left' as const },
          { header: 'Nama Terapis', width: '130px', align: 'left' as const },
          { header: 'Pengurang', width: '60px', align: 'center' as const },
          { header: 'Nilai Total', width: '60px', align: 'center' as const },
          { header: 'Kesimpulan', width: '170px', align: 'left' as const },
          { header: 'Diperbarui Oleh', width: '90px', align: 'left' as const },
          { header: 'Waktu Update', width: '85px', align: 'left' as const },
        ]
      : [
          { header: 'No', width: '30px', align: 'center' as const },
          { header: 'Kode TR', width: '65px', align: 'left' as const },
          { header: 'ID Karyawan', width: '85px', align: 'left' as const },
          { header: 'Nama Terapis', width: '150px', align: 'left' as const },
          { header: 'Pengurang', width: '70px', align: 'center' as const },
          { header: 'Nilai Total', width: '70px', align: 'center' as const },
          { header: 'Kesimpulan', width: '210px', align: 'left' as const },
          { header: 'Diperbarui Oleh', width: '100px', align: 'left' as const },
          { header: 'Waktu Update', width: '90px', align: 'left' as const },
        ];

    const rows = filteredReports.map((r, idx) => {
      const timeStr = r.update_at
        ? format(new Date(r.update_at), 'dd/MM/yyyy HH:mm')
        : '-';
      const pengurangStr = r.total_pengurang ? `-${r.total_pengurang}` : '0';
      const scoreStr = Number(r.nilai_total).toFixed(2);

      if (isAll) {
        return [
          idx + 1,
          `[${r.kode_outlet}] ${r.master_outlet?.name_outlet || ''}`,
          r.kodekaryawan,
          r.karyawan_info?.idkaryawan || '-',
          r.karyawan_info?.namakaryawan || r.kodekaryawan,
          pengurangStr,
          scoreStr,
          r.kesimpulan || '-',
          r.update_by_name || 'Petugas',
          timeStr,
        ];
      }

      return [
        idx + 1,
        r.kodekaryawan,
        r.karyawan_info?.idkaryawan || '-',
        r.karyawan_info?.namakaryawan || r.kodekaryawan,
        pengurangStr,
        scoreStr,
        r.kesimpulan || '-',
        r.update_by_name || 'Petugas',
        timeStr,
      ];
    });

    await printReportA4({
      title: 'Laporan Evaluasi Terapis',
      subtitle: `Rekapitulasi Penilaian Kinerja Terapis — Periode ${formatPeriodLabel(selectedPeriod)}`,
      canSelectOutlet: true,
      selectedOutlet,
      availableOutlets: outlets,
      startDate: periodDates?.startDate,
      endDate: periodDates?.endDate,
      statusLabel: `Periode: ${selectedPeriod === 'ALL' ? 'Semua Periode' : selectedPeriod}`,
      extraFilters: [
        { label: 'Filter Outlet', value: isAll ? 'Semua Outlet' : selectedOutlet },
        { label: 'Periode Payroll', value: selectedPeriod },
      ],
      summaryItems: [
        { label: 'Total Terapis', value: `${metrics.totalCount} Orang` },
        { label: 'Rata-rata Skor', value: `${metrics.avgScore} / 10` },
        { label: 'Performa Tinggi (≥ 8.5)', value: `${metrics.topScores} Orang` },
        { label: 'Total Poin Pengurang', value: `${metrics.totalPengurang} Poin` },
      ],
      columns,
      rows,
      signatures: [
        { title: 'Dibuat Oleh', name: user?.full_name || 'Petugas' },
        { title: 'Mengetahui (Manager Cabang)', name: '( ........................................ )' },
        { title: 'Disetujui (HR Holding)', name: '( ........................................ )' },
      ],
    });
  };

  // 8. Print Handler for Individual Therapist Evaluation Detail Sheet
  const handlePrintIndividualEvaluation = async () => {
    if (!selectedReport) return;
    const periodDates = selectedReport.payrollperiode
      ? hrdEvaluationService.parsePayrollPeriod(selectedReport.payrollperiode)
      : null;

    await printTherapistEvaluationA4({
      report: selectedReport,
      details: selectedReport.details || [],
      faults: reportFaults,
      evaluatorName: user?.full_name,
      availableOutlets: outlets,
      periodDates,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-[#22221B] p-6 rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-lg bg-[#889D35]/10 text-[#889D35]">
                <FileText className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-[#889D35] uppercase">
                HRD & Penilaian Kinerja
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
              Lap. Evaluasi TR
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Rekapitulasi hasil evaluasi kinerja berkala terapis, audit nilai variabel SOP, dan sanksi demerit per periode payroll.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintMainGrid}
              disabled={loading || filteredReports.length === 0}
              className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-700 dark:text-gray-300 rounded-xl flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4 text-[#889D35]" />
              <span>Cetak Laporan</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-700 dark:text-gray-300 rounded-xl flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => navigate('/hrd/tr-buat-evaluasi')}
                className="bg-[#889D35] hover:bg-[#74872c] text-white rounded-xl flex items-center gap-2 text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Evaluasi TR</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Terapis Dinilai
                </p>
                <p className="text-2xl font-bold text-[#3C3C32] dark:text-[#EBE6DF] mt-1">
                  {metrics.totalCount}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Sesuai filter periode</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <User className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rata-rata Skor
                </p>
                <p className="text-2xl font-bold text-[#889D35] mt-1">
                  {metrics.avgScore > 0 ? metrics.avgScore : '-'}
                  <span className="text-xs text-gray-400 font-normal ml-1">/ 10</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Skor performa rata-rata</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Performa Tinggi (≥ 8.5)
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {metrics.topScores}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Terapis predikat sangat baik</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Poin Pengurang
                </p>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {metrics.totalPengurang}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Akumulasi sanksi demerit</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step Filters Bar */}
        <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm space-y-3 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Select Outlet */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Langkah 1: Pilih Cabang Outlet</span>
              </label>
              <select
                value={selectedOutlet}
                onChange={(e) => {
                  setSelectedOutlet(e.target.value);
                  setSelectedPeriod('ALL');
                }}
                className="w-full h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
              >
                <option value="ALL">SEMUA OUTLET (NASIONAL)</option>
                {outlets.map((ot) => (
                  <option key={ot.kode_outlet} value={ot.kode_outlet}>
                    [{ot.kode_outlet}] {ot.name_outlet} - {ot.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Payroll Periode */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Langkah 2: Pilih Periode Payroll</span>
                {loadingPeriods && <RefreshCw className="w-3 h-3 text-[#889D35] animate-spin ml-1" />}
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
              >
                <option value="ALL">SEMUA PERIODE PAYROLL</option>
                {payrollPeriods.map((period) => (
                  <option key={period} value={period}>
                    {formatPeriodLabel(period)}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Search Input */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Pencarian Cepat Terapis</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nama, Kode TR, ID, Outlet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reports Table Grid */}
        <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <RefreshCw className="h-8 w-8 animate-spin text-[#889D35] mb-3" />
                <p className="text-sm font-medium">Memuat data laporan evaluasi terapis...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-semibold text-gray-600 dark:text-gray-300">Belum ada evaluasi ditemukan</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
                  Tidak ada data evaluasi terapis untuk outlet dan periode payroll yang dipilih.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-[#F8F5F1] dark:bg-[#191914] text-xs uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-[#D2C0A7]/30 dark:border-[#38382E]">
                    <tr>
                      <th className="py-3 px-4">Terapis</th>
                      <th className="py-3 px-4">Kode & ID</th>
                      {selectedOutlet === 'ALL' && (
                        <th className="py-3 px-4">Outlet Cabang</th>
                      )}
                      <th className="py-3 px-4 text-center">Pengurang</th>
                      <th className="py-3 px-4 text-center">Nilai Total</th>
                      <th className="py-3 px-4">Kesimpulan</th>
                      <th className="py-3 px-4">Diperbarui Oleh</th>
                      <th className="py-3 px-4">Waktu Update</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D2C0A7]/20 dark:divide-[#38382E]">
                    {filteredReports.map((report) => {
                      const score = Number(report.nilai_total) || 0;
                      const pengurang = Number(report.total_pengurang) || 0;
                      const fotoUrl = report.karyawan_info?.foto_url;
                      const initial = (
                        report.karyawan_info?.namakaryawan ||
                        report.kodekaryawan ||
                        'TR'
                      )
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={report.uid}
                          className="hover:bg-[#F8F5F1]/40 dark:hover:bg-[#191914]/50 transition-colors"
                        >
                          {/* Nama Terapis & Foto */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {fotoUrl ? (
                                <img
                                  src={fotoUrl}
                                  alt={report.karyawan_info?.namakaryawan || ''}
                                  onClick={() => setPreviewPhotoUrl(fotoUrl)}
                                  className="w-10 h-10 rounded-full object-cover border border-[#889D35] cursor-pointer hover:opacity-85 transition-opacity"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#F8F5F1] dark:bg-[#191914] border border-[#D2C0A7] dark:border-[#38382E] flex items-center justify-center text-xs font-bold text-[#889D35]">
                                  {initial}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                                  {report.karyawan_info?.namakaryawan || report.kodekaryawan}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  Dok: {report.kode_report}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Kode Karyawan & ID Karyawan */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-xs font-bold text-[#889D35]">
                              {report.kodekaryawan}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                              ID: {report.karyawan_info?.idkaryawan || '-'}
                            </div>
                          </td>

                          {/* Outlet (If ALL selected) */}
                          {selectedOutlet === 'ALL' && (
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#3C3C32] dark:text-[#EBE6DF]">
                                [{report.kode_outlet}]
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                                {report.master_outlet?.name_outlet || '-'}
                              </div>
                            </td>
                          )}

                          {/* Total Pengurang */}
                          <td className="py-3 px-4 text-center">
                            {pengurang > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                -{pengurang}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                0
                              </span>
                            )}
                          </td>

                          {/* Nilai Total */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreBadgeColor(
                                score
                              )}`}
                            >
                              {score.toFixed(2)} / 10
                            </span>
                          </td>

                          {/* Kesimpulan */}
                          <td className="py-3 px-4">
                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs">
                              {report.kesimpulan || (
                                <span className="italic text-gray-400">
                                  Tidak ada catatan khusus
                                </span>
                              )}
                            </p>
                          </td>

                          {/* Update By */}
                          <td className="py-3 px-4">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {report.update_by_name || 'Petugas'}
                            </div>
                          </td>

                          {/* Update At */}
                          <td className="py-3 px-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>
                                {report.update_at
                                  ? format(new Date(report.update_at), 'dd/MM/yyyy HH:mm')
                                  : '-'}
                              </span>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs rounded-xl border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-700 dark:text-gray-300 hover:text-[#889D35]"
                              onClick={() => handleOpenDetail(report)}
                            >
                              <Eye className="h-3.5 w-3.5 text-[#889D35]" />
                              <span>Lihat Rincian</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DETAIL MODAL (View Details) */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#22221B] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-2xl p-6">
            {selectedReport && (
              <>
                <DialogHeader className="border-b border-[#D2C0A7]/30 dark:border-[#38382E] pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <DialogTitle className="text-xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-2">
                        <span>Rincian Evaluasi Terapis</span>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-[#889D35] border-[#889D35]/30 bg-[#889D35]/10"
                        >
                          {selectedReport.kode_report}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                        <span>
                          Tanggal Evaluasi: <strong>{selectedReport.tanggal_report}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Periode: <strong>{selectedReport.payrollperiode || '-'}</strong>
                        </span>
                      </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintIndividualEvaluation}
                        className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-700 dark:text-gray-300 rounded-xl flex items-center gap-1.5 text-xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#889D35]" />
                        <span>Cetak Lembar Evaluasi</span>
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 pt-3">
                  {/* Therapist Header Card with Photo */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-4 rounded-xl bg-[#F8F5F1]/60 dark:bg-[#191914]/60 border border-[#D2C0A7]/30 dark:border-[#38382E]">
                    <div className="flex items-center gap-4">
                      {selectedReport.karyawan_info?.foto_url ? (
                        <img
                          src={selectedReport.karyawan_info.foto_url}
                          alt={selectedReport.karyawan_info?.namakaryawan || ''}
                          onClick={() => setPreviewPhotoUrl(selectedReport.karyawan_info?.foto_url || null)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#889D35] cursor-pointer hover:opacity-85 transition-opacity shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white dark:bg-[#22221B] border-2 border-[#D2C0A7] dark:border-[#38382E] flex items-center justify-center text-xl font-bold text-[#889D35]">
                          {(selectedReport.karyawan_info?.namakaryawan || selectedReport.kodekaryawan || 'TR')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                      )}

                      <div>
                        <h2 className="text-lg font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                          {selectedReport.karyawan_info?.namakaryawan || selectedReport.kodekaryawan}
                        </h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          ID: {selectedReport.karyawan_info?.idkaryawan || '-'} | Kode TR: {selectedReport.kodekaryawan} | Dept: {selectedReport.karyawan_info?.departemen || 'TR'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Outlet: <strong>[{selectedReport.kode_outlet}] {selectedReport.master_outlet?.name_outlet}</strong> ({selectedReport.master_outlet?.city || '-'})
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-[#D2C0A7]/30 sm:dark:border-[#38382E] sm:pl-6">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                        Skor Akhir
                      </div>
                      <div className="text-3xl font-black text-[#889D35] mt-0.5">
                        {Number(selectedReport.nilai_total).toFixed(2)}
                        <span className="text-xs font-normal text-gray-400 ml-1">/ 10</span>
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedReport.total_pengurang ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            Pengurang: -{selectedReport.total_pengurang} Poin
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ✓ Nihil Pengurang SOP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Scored Variables List Grouped by Category */}
                  <div>
                    <h3 className="text-sm font-bold text-[#3C3C32] dark:text-[#EBE6DF] mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#889D35]" />
                      <span>Rincian Variabel Penilaian</span>
                    </h3>

                    <div className="space-y-4">
                      {Object.keys(modalGroupedDetails).length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-3 text-center">
                          Tidak ada rincian variabel tercatat.
                        </p>
                      ) : (
                        Object.entries(modalGroupedDetails).map(([categoryName, items]) => (
                          <div
                            key={categoryName}
                            className="border border-[#D2C0A7]/30 dark:border-[#38382E] rounded-xl overflow-hidden bg-white dark:bg-[#191914]"
                          >
                            <div className="bg-[#F8F5F1] dark:bg-[#22221B] px-4 py-2.5 text-xs font-bold text-[#3C3C32] dark:text-[#EBE6DF] border-b border-[#D2C0A7]/30 dark:border-[#38382E] flex items-center justify-between">
                              <span>📁 {categoryName}</span>
                              <span className="text-gray-400 font-normal">
                                {items.length} Variabel
                              </span>
                            </div>
                            <div className="divide-y divide-[#D2C0A7]/20 dark:divide-[#38382E]">
                              {items.map((item) => (
                                <div key={item.uid} className="p-3 text-xs flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                      {item.nama_variable}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold border ${getScoreBadgeColor(
                                        Number(item.nilai_variable)
                                      )}`}
                                    >
                                      Skor: {item.nilai_variable} / 10
                                    </span>
                                  </div>
                                  {item.catatan_variable && (
                                    <div className="text-gray-600 dark:text-gray-400 bg-[#F8F5F1]/50 dark:bg-[#22221B]/40 p-2 rounded-lg text-[11px] mt-1 border-l-2 border-[#889D35]">
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        Catatan:{' '}
                                      </span>
                                      {item.catatan_variable}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section 2: Related TR Faults */}
                  <div>
                    <h3 className="text-sm font-bold text-[#3C3C32] dark:text-[#EBE6DF] mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <span>Catatan Pelanggaran SOP (TR Faults) Pada Periode Ini</span>
                      </div>
                      {loadingFaults && (
                        <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
                      )}
                    </h3>

                    {loadingFaults ? (
                      <div className="py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#889D35]" />
                        <span>Memuat data riwayat kesalahan terapis...</span>
                      </div>
                    ) : reportFaults.length === 0 ? (
                      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Terapis ini tidak memiliki catatan kesalahan SOP pada periode evaluasi ini (Nihil Pelanggaran).
                        </span>
                      </div>
                    ) : (
                      <div className="border border-[#D2C0A7]/30 dark:border-[#38382E] rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#F8F5F1] dark:bg-[#191914] text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-[#D2C0A7]/30 dark:border-[#38382E]">
                            <tr>
                              <th className="py-2 px-3">Tanggal</th>
                              <th className="py-2 px-3">Jenis Kesalahan</th>
                              <th className="py-2 px-3 text-center">Kategori</th>
                              <th className="py-2 px-3 text-center">Poin</th>
                              <th className="py-2 px-3">Kronologi / Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D2C0A7]/20 dark:divide-[#38382E]">
                            {reportFaults.map((f) => (
                              <tr key={f.uid} className="hover:bg-muted/30">
                                <td className="py-2 px-3 font-mono">{f.tanggal}</td>
                                <td className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
                                  {f.nama_faults}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      f.kategori === 'Berat'
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                        : f.kategori === 'Sedang'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    }`}
                                  >
                                    {f.kategori}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-rose-600">
                                  -{f.pengurang || 0}
                                </td>
                                <td className="py-2 px-3 text-gray-500">
                                  {f.keterangan || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Kesimpulan & Catatan Evaluator */}
                  <div className="p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] bg-[#F8F5F1]/40 dark:bg-[#191914]/40">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Kesimpulan & Catatan Evaluator
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedReport.kesimpulan || (
                        <span className="italic text-gray-400">
                          Tidak ada catatan kesimpulan tertulis dari evaluator.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Audit Footer Info */}
                  <div className="text-[11px] text-gray-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D2C0A7]/20 dark:border-[#38382E]">
                    <div>
                      Diperbarui oleh: <strong>{selectedReport.update_by_name || 'Petugas'}</strong>
                    </div>
                    <div>
                      Waktu update:{' '}
                      {selectedReport.update_at
                        ? format(new Date(selectedReport.update_at), 'dd/MM/yyyy HH:mm:ss')
                        : '-'}
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDetailOpen(false)}
                      className="rounded-xl border-[#D2C0A7]/40 dark:border-[#38382E]"
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* FULLSCREEN PHOTO PREVIEW MODAL */}
        <Dialog open={!!previewPhotoUrl} onOpenChange={() => setPreviewPhotoUrl(null)}>
          <DialogContent className="max-w-md p-4 bg-white dark:bg-[#22221B] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-2xl">
            <DialogHeader className="flex flex-row items-center justify-between pb-2">
              <DialogTitle className="text-sm font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                Foto Resmi Terapis
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewPhotoUrl(null)}
                className="h-7 w-7 p-0 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>
            {previewPhotoUrl && (
              <div className="mt-2 flex flex-col items-center">
                <img
                  src={previewPhotoUrl}
                  alt="Pratinjau Foto"
                  className="w-full max-h-[420px] object-contain rounded-xl border border-[#D2C0A7]/40 dark:border-[#38382E] shadow-sm"
                />
                <a
                  href={previewPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs text-[#889D35] hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Gambar Ukuran Penuh di Tab Baru
                </a>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
