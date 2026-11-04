import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { supabase } from '@/lib/supabase';
import { MasterOutlet, MasterOutletSalesTarget } from '@/types/posdashboard';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  Edit2,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const DEFAULT_DAILY_TARGET = 5000000; // Rp 5.000.000 / hari jika belum diset di database

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
const daysInYear = (y: number): number => (isLeapYear(y) ? 366 : 365);

export function MasterTargetPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [targets, setTargets] = useState<MasterOutletSalesTarget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingOutletCode, setEditingOutletCode] = useState<string>('');
  const [inputYear, setInputYear] = useState<number>(currentYear);
  const [rawTahunanValue, setRawTahunanValue] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch Outlets and Targets
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch active outlets
      const { data: outletData, error: outletErr } = await supabase
        .from('master_outlet')
        .select('kode_outlet, name_outlet, alamat, no_telp, city, province, active')
        .eq('active', true)
        .order('kode_outlet', { ascending: true });

      if (outletErr) throw outletErr;
      setOutlets(outletData || []);

      // Fetch targets for selected year
      const { data: targetData, error: targetErr } = await supabase
        .from('master_outlet_sales_targets')
        .select('id, kode_outlet, year, target_tahunan, target_bulanan, target_harian, created_at, updated_at')
        .eq('year', selectedYear);

      if (targetErr) throw targetErr;
      setTargets(targetData || []);
    } catch (err: unknown) {
      console.error('Error fetching master target data:', err);
      toast.error('Gagal memuat data master target penjualan');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format IDR Helper
  const formatIDR = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Map of targets by outlet code
  const targetMap = useMemo(() => {
    const map = new Map<string, MasterOutletSalesTarget>();
    for (const t of targets) {
      map.set(t.kode_outlet, t);
    }
    return map;
  }, [targets]);

  // Filtered outlets based on search
  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const q = searchQuery.toLowerCase();
      return (
        o.kode_outlet.toLowerCase().includes(q) ||
        o.name_outlet.toLowerCase().includes(q) ||
        (o.city && o.city.toLowerCase().includes(q))
      );
    });
  }, [outlets, searchQuery]);

  // Aggregate stats
  const totalConfigured = targets.length;
  const totalTahunanKonsolidasi = targets.reduce((sum, t) => sum + Number(t.target_tahunan || 0), 0);
  const totalHarianKonsolidasi = outlets.reduce((sum, o) => {
    const t = targetMap.get(o.kode_outlet);
    return sum + (t ? Number(t.target_harian) : DEFAULT_DAILY_TARGET);
  }, 0);

  // Form Auto-split calculation
  const numericTahunan = useMemo(() => {
    const cleaned = rawTahunanValue.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }, [rawTahunanValue]);

  const previewBulanan = useMemo(() => {
    return Math.round(numericTahunan / 12);
  }, [numericTahunan]);

  const previewHarian = useMemo(() => {
    const days = daysInYear(inputYear);
    return Math.round(numericTahunan / days);
  }, [numericTahunan, inputYear]);

  // Open Add/Edit Modal
  const handleOpenDialog = (outletCode?: string) => {
    const defaultCode = outletCode || (outlets.length > 0 ? outlets[0].kode_outlet : '');
    setEditingOutletCode(defaultCode);
    setInputYear(selectedYear);

    const existing = targetMap.get(defaultCode);
    if (existing) {
      setRawTahunanValue(String(Math.round(existing.target_tahunan)));
    } else {
      // Default to 5.000.000 * 365 as suggestion
      const defaultYearly = DEFAULT_DAILY_TARGET * daysInYear(selectedYear);
      setRawTahunanValue(String(defaultYearly));
    }

    setIsDialogOpen(true);
  };

  const handleOutletSelectChange = (newCode: string) => {
    setEditingOutletCode(newCode);
    const existing = targetMap.get(newCode);
    if (existing) {
      setRawTahunanValue(String(Math.round(existing.target_tahunan)));
    } else {
      const defaultYearly = DEFAULT_DAILY_TARGET * daysInYear(inputYear);
      setRawTahunanValue(String(defaultYearly));
    }
  };

  // Save Target (Upsert)
  const handleSaveTarget = async () => {
    if (!editingOutletCode) {
      toast.error('Silakan pilih cabang terlebih dahulu');
      return;
    }
    if (numericTahunan <= 0) {
      toast.error('Nilai target tahunan harus lebih besar dari 0');
      return;
    }

    try {
      setSaving(true);

      const days = daysInYear(inputYear);
      const computedBulanan = Math.round(numericTahunan / 12);
      const computedHarian = Math.round(numericTahunan / days);

      const payload = {
        kode_outlet: editingOutletCode,
        year: inputYear,
        target_tahunan: numericTahunan,
        target_bulanan: computedBulanan,
        target_harian: computedHarian,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('master_outlet_sales_targets')
        .upsert(payload, { onConflict: 'kode_outlet,year' });

      if (error) throw error;

      toast.success(
        `Target cabang ${editingOutletCode} tahun ${inputYear} berhasil disimpan!`
      );
      setIsDialogOpen(false);
      await fetchData();
    } catch (err: unknown) {
      console.error('Error saving sales target:', err);
      toast.error('Gagal menyimpan target penjualan');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default target
  const handleResetTarget = async (outletCode: string) => {
    if (!confirm(`Hapus konfigurasi target cabang ${outletCode}? Cabang ini akan menggunakan target default sistem (Rp 5.000.000/hari).`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('master_outlet_sales_targets')
        .delete()
        .eq('kode_outlet', outletCode)
        .eq('year', selectedYear);

      if (error) throw error;

      toast.success(`Target cabang ${outletCode} telah direset ke default sistem.`);
      await fetchData();
    } catch (err: unknown) {
      console.error('Error resetting target:', err);
      toast.error('Gagal mereset target penjualan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* =========================================================================
            HEADER & ACTIONS
           ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zen-sand/40 shadow-zen">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-zen-paper dark:bg-zinc-800 border border-zen-sand/50 flex items-center justify-center shrink-0 text-zen-matcha">
              <Target className="w-6 h-6 text-zen-moss" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-serif text-zen-charcoal dark:text-zinc-100">
                  Master Target Penjualan Cabang
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zen-paper text-zen-moss border border-zen-sand/50">
                  Auto-Split
                </span>
              </div>
              <p className="text-xs text-zen-muted mt-0.5 max-w-2xl">
                Tentukan target penjualan tahunan per cabang. Sistem otomatis menghitung target bulanan (\(\div 12\)) dan harian (\(\div {daysInYear(selectedYear)}\)) untuk benchmark dasbor Live & Periodik.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Year Selector */}
            <div className="flex items-center space-x-1.5 bg-zen-paper dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zen-sand/40 text-xs font-semibold text-zen-charcoal">
              <Calendar className="w-3.5 h-3.5 text-zen-moss" />
              <span>Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-zen-moss focus:outline-none cursor-pointer"
              >
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                  <option key={y} value={y} className="text-zen-charcoal">
                    {y} {y === currentYear ? '(Berjalan)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Target Button */}
            <button
              onClick={() => handleOpenDialog()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-zen-matcha hover:bg-zen-moss text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Atur Target Cabang</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SUMMARY METRIC CARDS
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zen-sand/40 shadow-zen">
            <span className="text-[11px] uppercase tracking-wider font-bold text-zen-muted block mb-1">
              Status Cabang Terkonfigurasi
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-serif text-zen-charcoal dark:text-zinc-100">
                {totalConfigured} / {outlets.length}
              </span>
              <span className="text-xs text-zen-muted">Cabang Aktif</span>
            </div>
            <p className="text-[11px] text-zen-muted mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-zen-matcha" />
              <span>{outlets.length - totalConfigured} cabang menggunakan default sistem</span>
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zen-sand/40 shadow-zen">
            <span className="text-[11px] uppercase tracking-wider font-bold text-zen-muted block mb-1">
              Total Target Tahunan ({selectedYear})
            </span>
            <div className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal dark:text-zinc-100 truncate">
              {formatIDR(totalTahunanKonsolidasi)}
            </div>
            <p className="text-[11px] text-zen-muted mt-1">
              Akumulasi target tahunan cabang terdaftar
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zen-sand/40 shadow-zen">
            <span className="text-[11px] uppercase tracking-wider font-bold text-zen-muted block mb-1">
              Total Target Harian Jaringan
            </span>
            <div className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal dark:text-zinc-100 truncate">
              {formatIDR(totalHarianKonsolidasi)}
            </div>
            <p className="text-[11px] text-zen-muted mt-1">
              Rata-rata benchmark harian seluruh jaringan Zen
            </p>
          </div>
        </div>

        {/* =========================================================================
            DATA TABLE
           ========================================================================= */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zen-sand/40 shadow-zen overflow-hidden">
          {/* Table Search & Filter Bar */}
          <div className="p-4 border-b border-zen-stone/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zen-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode atau nama cabang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-zen-paper dark:bg-zinc-800 border border-zen-sand/40 rounded-xl focus:outline-none focus:ring-1 focus:ring-zen-matcha text-zen-charcoal"
              />
            </div>
            <div className="text-xs text-zen-muted">
              Menampilkan <span className="font-bold text-zen-charcoal">{filteredOutlets.length}</span> cabang untuk Tahun <span className="font-bold text-zen-moss">{selectedYear}</span>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zen-paper/70 dark:bg-zinc-800/70 border-b border-zen-sand/40 text-zen-muted font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Status Target</th>
                  <th className="py-3 px-4 text-right">Target Tahunan</th>
                  <th className="py-3 px-4 text-right">Target Bulanan (\(\div 12\))</th>
                  <th className="py-3 px-4 text-right">Target Harian</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-stone/40 text-zen-charcoal">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zen-muted">
                      Memuat data target cabang...
                    </td>
                  </tr>
                ) : filteredOutlets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zen-muted">
                      Tidak ada cabang yang sesuai dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredOutlets.map((outlet) => {
                    const target = targetMap.get(outlet.kode_outlet);
                    const isCustom = Boolean(target);
                    const displayTahunan = target ? target.target_tahunan : DEFAULT_DAILY_TARGET * daysInYear(selectedYear);
                    const displayBulanan = target ? target.target_bulanan : Math.round(displayTahunan / 12);
                    const displayHarian = target ? target.target_harian : DEFAULT_DAILY_TARGET;

                    return (
                      <tr
                        key={outlet.kode_outlet}
                        className="hover:bg-zen-paper/40 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <span className="w-8 h-8 rounded-lg bg-zen-paper border border-zen-sand/50 font-mono font-bold text-xs text-zen-moss flex items-center justify-center shrink-0">
                              {outlet.kode_outlet}
                            </span>
                            <div>
                              <div className="font-bold text-zen-charcoal">
                                {outlet.name_outlet}
                              </div>
                              <div className="text-[10px] text-zen-muted">
                                {outlet.city || outlet.province || 'Indonesia'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isCustom ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Tersimpan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                              Default Sistem
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium">
                          {formatIDR(displayTahunan)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-zen-muted">
                          {formatIDR(displayBulanan)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zen-moss">
                          {formatIDR(displayHarian)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenDialog(outlet.kode_outlet)}
                              className="px-2.5 py-1 rounded-lg bg-zen-paper hover:bg-zen-matcha hover:text-white border border-zen-sand/50 text-[11px] font-semibold text-zen-charcoal transition-colors flex items-center gap-1 shadow-2xs"
                              title="Edit target tahunan cabang ini"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{isCustom ? 'Ubah' : 'Set'}</span>
                            </button>

                            {isCustom && (
                              <button
                                onClick={() => handleResetTarget(outlet.kode_outlet)}
                                className="p-1 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                                title="Reset ke default sistem (Rp 5.000.000/hari)"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
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

        {/* =========================================================================
            INPUT / EDIT TARGET DIALOG
           ========================================================================= */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zen-sand/40 rounded-2xl shadow-zen">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-zen-matcha" />
                <DialogTitle className="text-base font-bold font-serif text-zen-charcoal">
                  Atur Target Penjualan Cabang
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-zen-muted">
                Masukkan nilai target tahunan. Sistem otomatis membaginya menjadi target bulanan dan harian.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Select Outlet */}
              <div>
                <label className="text-[11px] font-bold text-zen-muted uppercase tracking-wider block mb-1">
                  Pilih Cabang (Outlet)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zen-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={editingOutletCode}
                    onChange={(e) => handleOutletSelectChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zen-paper border border-zen-sand/50 rounded-xl font-bold text-zen-charcoal focus:outline-none focus:ring-1 focus:ring-zen-matcha"
                  >
                    {outlets.map((o) => (
                      <option key={o.kode_outlet} value={o.kode_outlet}>
                        {o.kode_outlet} - {o.name_outlet}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Year */}
              <div>
                <label className="text-[11px] font-bold text-zen-muted uppercase tracking-wider block mb-1">
                  Tahun Anggaran
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zen-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={inputYear}
                    onChange={(e) => setInputYear(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zen-paper border border-zen-sand/50 rounded-xl font-bold text-zen-charcoal focus:outline-none focus:ring-1 focus:ring-zen-matcha"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                      <option key={y} value={y}>
                        {y} ({daysInYear(y)} Hari)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input Target Tahunan */}
              <div>
                <label className="text-[11px] font-bold text-zen-muted uppercase tracking-wider block mb-1">
                  Target Tahunan (IDR)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-zen-matcha absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rawTahunanValue ? Number(rawTahunanValue).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setRawTahunanValue(clean);
                    }}
                    placeholder="Contoh: 3.650.000.000"
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-zen-charcoal bg-zen-paper border border-zen-sand/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-zen-matcha font-mono"
                  />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[1800000000, 3650000000, 5400000000, 7300000000].map((quickVal) => (
                    <button
                      key={quickVal}
                      type="button"
                      onClick={() => setRawTahunanValue(String(quickVal))}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-zen-stone/40 hover:bg-zen-matcha hover:text-white transition-colors text-zen-muted font-medium"
                    >
                      {(quickVal / 1000000000).toFixed(1)} Miliar
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Split Live Preview Cards */}
              <div className="p-3.5 bg-zen-paper/80 rounded-xl border border-zen-sand/50 space-y-2.5">
                <div className="text-[11px] font-bold text-zen-moss flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zen-matcha" />
                  <span>Kalkulasi Auto-Split Otomatis:</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2.5 rounded-lg border border-zen-sand/40">
                    <span className="text-[9px] uppercase font-bold text-zen-muted block mb-0.5">
                      Target Bulanan (\(\div 12\))
                    </span>
                    <span className="text-xs font-bold font-mono text-zen-charcoal block truncate">
                      {formatIDR(previewBulanan)}
                    </span>
                    <span className="text-[9px] text-zen-muted">per bulan</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-zen-sand/40">
                    <span className="text-[9px] uppercase font-bold text-zen-muted block mb-0.5">
                      Target Harian (\(\div {daysInYear(inputYear)}\))
                    </span>
                    <span className="text-xs font-bold font-mono text-zen-moss block truncate">
                      {formatIDR(previewHarian)}
                    </span>
                    <span className="text-[9px] text-zen-muted">per hari</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-zen-paper hover:bg-zen-stone text-zen-charcoal text-xs font-bold transition-colors border border-zen-sand/40"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTarget}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-zen-matcha hover:bg-zen-moss text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Target'}</span>
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
export default MasterTargetPage;

