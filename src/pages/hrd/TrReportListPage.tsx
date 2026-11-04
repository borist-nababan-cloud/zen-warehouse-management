import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import { supabase } from '@/lib/supabase';
import { MasterOutlet } from '@/types/database';
import { HrdReportTr } from '@/types/hrd';
import {
  FileText,
  Search,
  Calendar,
  RefreshCw,
  Plus,
  Eye,
  Lock,
  Award,
  Sparkles,
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
import { toast } from 'sonner';

export function TrReportListPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  // Role Restriction Check (Roles 6 and 19 can only access their own outlet)
  const isOutletRestricted = user?.user_role === 6 || user?.user_role === 19;
  const userOutletCode = user?.kode_outlet || '';
  const canCreate = user?.user_role === 8 || user?.user_role === 16;

  // Filters State
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    isOutletRestricted ? userOutletCode : 'ALL'
  );

  // Default dates: last 30 days to today
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data & Loading State
  const [reports, setReports] = useState<HrdReportTr[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Detail Modal
  const [selectedReport, setSelectedReport] = useState<HrdReportTr | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // 1. Initial Load: Outlets list
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const { data, error } = await supabase
          .from('master_outlet')
          .select('kode_outlet, name_outlet, city, province, active')
          .eq('active', true)
          .order('kode_outlet', { ascending: true });

        if (error) throw error;
        setOutlets((data as MasterOutlet[]) || []);

        if (isOutletRestricted && userOutletCode) {
          setSelectedOutlet(userOutletCode);
        }
      } catch (err: any) {
        console.error('Error fetching outlets:', err);
      }
    };

    fetchOutlets();
  }, [isOutletRestricted, userOutletCode]);

  // 2. Fetch Reports function
  const fetchReports = async () => {
    try {
      setLoading(true);
      const effectiveOutlet = isOutletRestricted ? userOutletCode : selectedOutlet;

      const data = await hrdEvaluationService.getEvaluationsList({
        outletCode: effectiveOutlet,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
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
  }, [selectedOutlet, startDate, endDate]);

  // 3. Client-side Search Filter (by Nama Karyawan, Kode Karyawan, or Kode Report)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase().trim();
    return reports.filter((r) => {
      const nama = r.karyawan_info?.namakaryawan?.toLowerCase() || '';
      const kodeKar = r.kodekaryawan?.toLowerCase() || '';
      const idKar = r.karyawan_info?.idkaryawan?.toLowerCase() || '';
      const kodeRep = r.kode_report?.toLowerCase() || '';
      const outletName = r.master_outlet?.name_outlet?.toLowerCase() || '';
      return (
        nama.includes(q) ||
        kodeKar.includes(q) ||
        idKar.includes(q) ||
        kodeRep.includes(q) ||
        outletName.includes(q)
      );
    });
  }, [reports, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = filteredReports.length;
    if (totalCount === 0) {
      return { totalCount: 0, avgScore: 0, topScores: 0 };
    }
    const sum = filteredReports.reduce((acc, r) => acc + (Number(r.nilai_total) || 0), 0);
    const avgScore = Number((sum / totalCount).toFixed(2));
    const topScores = filteredReports.filter((r) => Number(r.nilai_total) >= 8.5).length;
    return { totalCount, avgScore, topScores };
  }, [filteredReports]);

  // Group Details by Category for the Modal
  const modalGroupedDetails = useMemo(() => {
    if (!selectedReport?.details) return {};
    const groups: Record<string, typeof selectedReport.details> = {};
    selectedReport.details.forEach((det) => {
      const cat = det.nama_kategori || 'Lain-lain';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Laporan Evaluasi TR</h1>
                <p className="text-sm text-muted-foreground">
                  Riwayat hasil penilaian performa dan evaluasi berkala terapis
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => navigate('/hrd/tr-buat-evaluasi')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Buat Evaluasi TR
              </Button>
            )}
          </div>
        </div>

        {/* Outlet Restriction Banner */}
        {isOutletRestricted && (
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-sm">
            <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">Akses Terbatas: </span>
              Anda masuk dengan peran outlet. Data laporan hanya menampilkan hasil evaluasi untuk outlet Anda (
              <strong>{userOutletCode}</strong>).
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Evaluasi
                </p>
                <p className="text-2xl font-bold mt-1">{metrics.totalCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sesuai filter aktif</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rata-rata Skor
                </p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {metrics.avgScore > 0 ? metrics.avgScore : '-'}
                  <span className="text-xs text-muted-foreground font-normal ml-1">/ 10</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Skor performa rata-rata</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Performa Tinggi (≥ 8.5)
                </p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{metrics.topScores}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Terapis predikat sangat baik</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Outlet Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Outlet
                </label>
                <div className="relative">
                  <select
                    value={selectedOutlet}
                    onChange={(e) => setSelectedOutlet(e.target.value)}
                    disabled={isOutletRestricted}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {!isOutletRestricted && <option value="ALL">Semua Outlet</option>}
                    {outlets.map((ot) => (
                      <option key={ot.kode_outlet} value={ot.kode_outlet}>
                        {ot.kode_outlet} - {ot.name_outlet}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Dari Tanggal
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Sampai Tanggal
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Search */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Pencarian
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nama / Kode / ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm">Memuat data laporan evaluasi...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">Belum ada evaluasi ditemukan</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
                  Tidak ada dokumen evaluasi terapis yang sesuai dengan filter atau kata kunci pencarian.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Kode & Tanggal</th>
                      <th className="py-3 px-4 font-semibold">Outlet</th>
                      <th className="py-3 px-4 font-semibold">Terapis</th>
                      <th className="py-3 px-4 font-semibold text-center">Nilai Rata-rata</th>
                      <th className="py-3 px-4 font-semibold">Kesimpulan</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReports.map((report) => {
                      const score = Number(report.nilai_total) || 0;
                      return (
                        <tr key={report.uid} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-mono text-xs font-semibold text-primary">
                              {report.kode_report}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {report.tanggal_report}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">
                              {report.kode_outlet}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {report.master_outlet?.name_outlet || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground flex items-center gap-2">
                              <span>{report.karyawan_info?.namakaryawan || report.kodekaryawan}</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                {report.karyawan_info?.departemen || 'TR'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              ID: {report.karyawan_info?.idkaryawan || report.kodekaryawan}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreBadgeColor(
                                score
                              )}`}
                            >
                              {score.toFixed(1)} / 10
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
                              {report.kesimpulan || <span className="italic text-muted-foreground/60">Tidak ada catatan kesimpulan</span>}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => {
                                setSelectedReport(report);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Lihat Rincian
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

        {/* DETAIL MODAL */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <span>Rincian Evaluasi Terapis</span>
                        <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                          {selectedReport.kode_report}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs mt-1">
                        Tanggal Penilaian: <strong>{selectedReport.tanggal_report}</strong>
                      </DialogDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground uppercase">Skor Total</div>
                      <div className="text-2xl font-black text-primary">
                        {Number(selectedReport.nilai_total).toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">/ 10</span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                  {/* Therapist & Outlet Meta */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Nama Terapis:</span>
                      <span className="font-semibold text-sm text-foreground">
                        {selectedReport.karyawan_info?.namakaryawan || selectedReport.kodekaryawan}
                      </span>
                      <span className="text-muted-foreground block mt-0.5 font-mono">
                        ID: {selectedReport.karyawan_info?.idkaryawan || selectedReport.kodekaryawan} ({selectedReport.karyawan_info?.departemen || 'TR'})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Outlet / Cabang:</span>
                      <span className="font-semibold text-sm text-foreground">
                        {selectedReport.kode_outlet} - {selectedReport.master_outlet?.name_outlet}
                      </span>
                      <span className="text-muted-foreground block mt-0.5">
                        {selectedReport.master_outlet?.city || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Scored Variables List Grouped by Category */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-primary" />
                      Rincian Variabel & Nilai
                    </h3>

                    <div className="space-y-4">
                      {Object.keys(modalGroupedDetails).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">
                          Tidak ada rincian variabel tercatat.
                        </p>
                      ) : (
                        Object.entries(modalGroupedDetails).map(([categoryName, items]) => (
                          <div
                            key={categoryName}
                            className="border rounded-lg overflow-hidden bg-card"
                          >
                            <div className="bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground border-b flex items-center justify-between">
                              <span>{categoryName}</span>
                              <span className="text-muted-foreground font-normal">
                                {items.length} Variabel
                              </span>
                            </div>
                            <div className="divide-y divide-border">
                              {items.map((item) => (
                                <div key={item.uid} className="p-3 text-xs flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-foreground">
                                      {item.nama_variable}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold border ${getScoreBadgeColor(
                                        Number(item.nilai_variable)
                                      )}`}
                                    >
                                      Nilai: {item.nilai_variable} / 10
                                    </span>
                                  </div>
                                  {item.catatan_variable && (
                                    <div className="text-muted-foreground bg-muted/30 p-2 rounded text-[11px] mt-1 border-l-2 border-primary/40">
                                      <span className="font-medium text-foreground">Catatan: </span>
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

                  {/* Kesimpulan */}
                  {selectedReport.kesimpulan && (
                    <div className="p-3.5 rounded-lg border bg-muted/20">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                        Kesimpulan & Tindak Lanjut
                      </h4>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedReport.kesimpulan}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDetailOpen(false)}
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

