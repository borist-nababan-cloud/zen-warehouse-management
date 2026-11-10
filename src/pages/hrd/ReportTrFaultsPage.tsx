import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { hrdFaultService } from '@/services/hrdFaultService';
import { MasterOutlet } from '@/types/database';
import { HrdTrFault, FaultCategory } from '@/types/hrd';
import {
  FileWarning,
  Search,
  Calendar,
  Building2,
  RefreshCw,
  Download,
  Printer,
  SlidersHorizontal,
  Lock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function ReportTrFaultsPage() {
  const { user } = useAuthUser();

  // Role Restriction Check (Roles 6, 14, 15, and 19 can only access their own outlet)
  const isOutletRestricted = [6, 14, 15, 19].includes(Number(user?.user_role));
  const userOutletCode = user?.kode_outlet || '';

  // Filter States
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

  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [faults, setFaults] = useState<HrdTrFault[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  // 2. Fetch Faults Data
  const fetchFaults = async () => {
    try {
      setLoading(true);
      const effectiveOutlet = isOutletRestricted ? userOutletCode : selectedOutlet;

      const data = await hrdFaultService.getTrFaults({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        kodeOutlet: effectiveOutlet,
        kategori: selectedKategori !== 'ALL' ? selectedKategori : undefined,
      });

      setFaults(data);
    } catch (err: any) {
      console.error('Error fetching therapist faults report:', err);
      toast.error('Gagal memuat laporan kesalahan terapis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaults();
  }, [selectedOutlet, startDate, endDate, selectedKategori]);

  // 3. Filtered Data by Search Query
  const filteredFaults = useMemo(() => {
    if (!searchQuery.trim()) return faults;
    const q = searchQuery.toLowerCase();
    return faults.filter((item) => {
      const matchName = item.namakaryawan?.toLowerCase().includes(q) || false;
      const matchKode = item.kodekaryawan?.toLowerCase().includes(q) || false;
      const matchFault = item.nama_faults?.toLowerCase().includes(q) || false;
      const matchKet = item.keterangan?.toLowerCase().includes(q) || false;
      const matchOutlet = item.name_outlet?.toLowerCase().includes(q) || false;
      return matchName || matchKode || matchFault || matchKet || matchOutlet;
    });
  }, [faults, searchQuery]);

  // 4. Metrics Calculation
  const metrics = useMemo(() => {
    const totalCases = filteredFaults.length;
    const totalPoints = filteredFaults.reduce((acc, curr) => acc + (curr.pengurang || 0), 0);
    const countRingan = filteredFaults.filter((f) => f.kategori === 'Ringan').length;
    const countSedang = filteredFaults.filter((f) => f.kategori === 'Sedang').length;
    const countBerat = filteredFaults.filter((f) => f.kategori === 'Berat').length;

    return {
      totalCases,
      totalPoints,
      countRingan,
      countSedang,
      countBerat,
    };
  }, [filteredFaults]);

  // 5. CSV Export
  const handleExportCsv = () => {
    if (filteredFaults.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const headers = [
      'Tanggal',
      'Kode Outlet',
      'Nama Outlet',
      'Kode Karyawan',
      'Nama Terapis',
      'Departemen',
      'Jenis Kesalahan',
      'Kategori',
      'Poin Pengurang',
      'Keterangan Kronologi',
      'Dicatat Oleh',
      'Waktu Input',
    ];

    const rows = filteredFaults.map((f) => [
      `"${f.tanggal}"`,
      `"${f.kode_outlet}"`,
      `"${f.name_outlet || ''}"`,
      `"${f.kodekaryawan}"`,
      `"${f.namakaryawan || ''}"`,
      `"${f.departemen || 'TR'}"`,
      `"${f.nama_faults.replace(/"/g, '""')}"`,
      `"${f.kategori}"`,
      f.pengurang,
      `"${(f.keterangan || '').replace(/"/g, '""')}"`,
      `"${f.created_by_name || ''}"`,
      `"${f.created_at || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Kesalahan_TR_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan CSV berhasil diunduh');
  };

  const handlePrint = () => {
    window.print();
  };

  const getKategoriBadge = (kat: FaultCategory) => {
    switch (kat) {
      case 'Ringan':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'Sedang':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';
      case 'Berat':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#22221B] p-6 rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <FileWarning className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-[#889D35] uppercase">
                HRD & Rekapitulasi Pelanggaran
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
              Laporan Kesalahan Terapis (TR Faults)
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Audit riwayat insiden kesalahan SOP, poin penalti terapis, dan filter multi-cabang.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-700 dark:text-gray-300 rounded-xl flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4 text-[#889D35]" />
              <span>Ekspor CSV</span>
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-700 dark:text-gray-300 rounded-xl flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>Cetak</span>
            </Button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Kasus Tercatat</div>
              <div className="text-2xl font-bold text-[#3C3C32] dark:text-[#EBE6DF] mt-1">{metrics.totalCases}</div>
              <div className="text-xs text-gray-400 mt-0.5">Kejadian pelanggaran</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-red-600 dark:text-red-400">Total Poin Penalti</div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1 font-mono">
                -{metrics.totalPoints}
              </div>
              <div className="text-xs text-red-600/70 mt-0.5">Akumulasi pengurang</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Pelanggaran Ringan</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {metrics.countRingan}
              </div>
              <div className="text-xs text-emerald-600/70 mt-0.5">Masker, bau badan, dll</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pelanggaran Sedang</div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {metrics.countSedang}
              </div>
              <div className="text-xs text-amber-600/70 mt-0.5">Teknik & tekanan pijatan</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#22221B] border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Pelanggaran Berat</div>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                {metrics.countBerat}
              </div>
              <div className="text-xs text-rose-600/70 mt-0.5">Tertidur, pangkas waktu</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm space-y-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Outlet Filter */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Pilih Cabang</span>
                {isOutletRestricted && <Lock className="w-3 h-3 text-amber-500 ml-1" />}
              </label>
              {isOutletRestricted ? (
                <div className="h-9 px-3 bg-gray-100 dark:bg-gray-800 border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  [{userOutletCode}] {outlets.find((o) => o.kode_outlet === userOutletCode)?.name_outlet || 'Cabang Terkunci'}
                </div>
              ) : (
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="w-full h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
                >
                  <option value="ALL">SEMUA OUTLET (NASIONAL)</option>
                  {outlets.map((o) => (
                    <option key={o.kode_outlet} value={o.kode_outlet}>
                      [{o.kode_outlet}] {o.name_outlet} - {o.city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Range: Dari */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Dari Tanggal</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
              />
            </div>

            {/* Date Range: Sampai */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Sampai Tanggal</span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
              />
            </div>

            {/* Kategori Filter */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Tingkat Kategori</span>
              </label>
              <select
                value={selectedKategori}
                onChange={(e) => setSelectedKategori(e.target.value)}
                className="w-full h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="Ringan">Ringan (Demerit 1-3)</option>
                <option value="Sedang">Sedang (Demerit 4-6)</option>
                <option value="Berat">Berat (Demerit 7-9+)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari nama terapis, kode karyawan, jenis kesalahan, atau catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFaults}
              className="h-9 border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-[#22221B] rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F5F1] dark:bg-[#191914] text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 border-b border-[#D2C0A7]/30 dark:border-[#38382E]">
                <tr>
                  <th className="px-4 py-3.5 w-28">Tanggal</th>
                  <th className="px-4 py-3.5 w-36">Cabang</th>
                  <th className="px-4 py-3.5 w-48">Terapis</th>
                  <th className="px-4 py-3.5">Jenis Kesalahan</th>
                  <th className="px-4 py-3.5 w-28">Kategori</th>
                  <th className="px-4 py-3.5 w-28 text-center">Poin</th>
                  <th className="px-4 py-3.5">Keterangan Kronologi</th>
                  <th className="px-4 py-3.5 w-36">Dicatat Oleh</th>
                  <th className="px-4 py-3.5 w-36">Waktu Catat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2C0A7]/20 dark:divide-[#38382E]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#889D35] border-t-transparent rounded-full animate-spin" />
                        <span>Memuat rekapitulasi laporan kesalahan terapis...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredFaults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      Tidak ada data catatan kesalahan yang ditemukan untuk kriteria filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredFaults.map((item) => (
                    <tr
                      key={item.uid}
                      className="hover:bg-[#F8F5F1]/50 dark:hover:bg-[#191914]/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-xs font-mono font-medium text-[#3C3C32] dark:text-[#EBE6DF]">
                        {item.tanggal}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-[#889D35]">[{item.kode_outlet}]</span>{' '}
                        <span>{item.name_outlet || item.city || ''}</span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#3C3C32] dark:text-[#EBE6DF]">
                        <div>{item.namakaryawan || item.kodekaryawan}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {item.kodekaryawan} • ID: {item.idkaryawan} • {item.departemen || 'TR'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#3C3C32] dark:text-[#EBE6DF]">
                        {item.nama_faults}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getKategoriBadge(
                            item.kategori
                          )}`}
                        >
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
                          -{item.pengurang} Poin
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 max-w-sm truncate" title={item.keterangan || '-'}>
                        {item.keterangan || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#889D35] shrink-0" />
                          <span className="truncate max-w-[120px]" title={item.created_by_name || '-'}>
                            {item.created_by_name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          {!loading && filteredFaults.length > 0 && (
            <div className="p-4 bg-[#F8F5F1]/50 dark:bg-[#191914] border-t border-[#D2C0A7]/30 dark:border-[#38382E] text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>Menampilkan total <strong>{filteredFaults.length}</strong> catatan insiden pelanggaran.</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                Akumulasi Poin Pengurang: <strong>-{metrics.totalPoints} Poin</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ReportTrFaultsPage;
