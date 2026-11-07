import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { hrdFaultService } from '@/services/hrdFaultService';
import {
  HrdMasterFault,
  HrdTrFault,
  HrdEmployeeSimple,
  FaultCategory,
} from '@/types/hrd';
import { MasterOutlet } from '@/types/database';
import {
  AlertCircle,
  Calendar,
  Building2,
  User,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TrFaultsPage() {
  const { user } = useAuthUser();
  const isReception = user?.user_role === 19;

  // Master Data States
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [masterFaults, setMasterFaults] = useState<HrdMasterFault[]>([]);
  const [therapists, setTherapists] = useState<HrdEmployeeSimple[]>([]);
  const [loadingTherapists, setLoadingTherapists] = useState<boolean>(false);

  // Form States
  const todayStr = new Date().toISOString().split('T')[0];
  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [selectedTherapist, setSelectedTherapist] = useState<HrdEmployeeSimple | null>(null);
  const [selectedFault, setSelectedFault] = useState<HrdMasterFault | null>(null);
  const [keterangan, setKeterangan] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Recent Records State
  const [recentFaults, setRecentFaults] = useState<HrdTrFault[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(false);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<HrdTrFault | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // 1. Initial Load: Outlets & Master Faults
  useEffect(() => {
    const initData = async () => {
      try {
        const [outletsRes, faultsRes] = await Promise.all([
          supabase
            .from('master_outlet')
            .select('kode_outlet, name_outlet, city, province, active')
            .eq('active', true)
            .order('kode_outlet', { ascending: true }),
          hrdFaultService.getMasterFaults(true), // Only active faults
        ]);

        const rawOutlets = (outletsRes.data as MasterOutlet[]) || [];
        setOutlets(rawOutlets);
        setMasterFaults(faultsRes);

        // Enforce branch lock for reception or user with outlet
        if (isReception && user?.kode_outlet) {
          setSelectedOutlet(user.kode_outlet);
        } else if (user?.kode_outlet) {
          setSelectedOutlet(user.kode_outlet);
        } else if (rawOutlets.length > 0) {
          setSelectedOutlet(rawOutlets[0].kode_outlet);
        }
      } catch (err: any) {
        console.error('Error loading initial data for TR faults:', err);
        toast.error('Gagal memuat data master cabang atau kesalahan');
      }
    };

    initData();
  }, [user, isReception]);

  // 2. Load Therapists when selectedOutlet changes
  useEffect(() => {
    if (!selectedOutlet) {
      setTherapists([]);
      setSelectedTherapist(null);
      return;
    }

    const loadTherapists = async () => {
      try {
        setLoadingTherapists(true);
        setSelectedTherapist(null);
        const data = await hrdFaultService.getTherapistsByOutlet(selectedOutlet);
        setTherapists(data);
      } catch (err: any) {
        console.error('Error loading therapists for outlet:', err);
        toast.error('Gagal memuat daftar terapis cabang');
      } finally {
        setLoadingTherapists(false);
      }
    };

    loadTherapists();
    loadRecentFaults(selectedOutlet, tanggal);
  }, [selectedOutlet]);

  // 3. Load Recent Faults (for feedback and multi-record entries)
  const loadRecentFaults = async (outletCode: string, dateStr: string) => {
    if (!outletCode) return;
    try {
      setLoadingRecent(true);
      const data = await hrdFaultService.getTrFaults({
        startDate: dateStr,
        endDate: dateStr,
        kodeOutlet: outletCode,
      });
      setRecentFaults(data);
    } catch (err: any) {
      console.error('Error loading recent faults:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleFaultSelect = (faultUid: string) => {
    const f = masterFaults.find((item) => item.uid === faultUid) || null;
    setSelectedFault(f);
  };

  const handleTherapistSelect = (kodekaryawan: string) => {
    const t = therapists.find((item) => item.kodekaryawan === kodekaryawan) || null;
    setSelectedTherapist(t);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOutlet) {
      toast.error('Pilih cabang outlet terlebih dahulu');
      return;
    }
    if (!selectedTherapist) {
      toast.error('Pilih terapis yang melakukan kesalahan');
      return;
    }
    if (!selectedFault) {
      toast.error('Pilih jenis kesalahan master');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        tanggal,
        kode_outlet: selectedOutlet,
        kodekaryawan: selectedTherapist.kodekaryawan,
        idkaryawan: Number(selectedTherapist.idkaryawan) || 0,
        fault_id: selectedFault.uid,
        nama_faults: selectedFault.nama_faults,
        kategori: selectedFault.kategori,
        pengurang: selectedFault.pengurang,
        keterangan: keterangan.trim() || null,
      };

      await hrdFaultService.createTrFault(payload, user?.id);

      toast.success(
        `Catatan kesalahan untuk ${selectedTherapist.namakaryawan} (-${selectedFault.pengurang} poin) berhasil disimpan.`
      );

      // Reset form fields except outlet and tanggal for fast repeated entries
      setSelectedFault(null);
      setKeterangan('');

      // Reload recent table
      loadRecentFaults(selectedOutlet, tanggal);
    } catch (err: any) {
      console.error('Error saving TR fault:', err);
      toast.error(err.message || 'Gagal menyimpan catatan kesalahan terapis');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await hrdFaultService.deleteTrFault(itemToDelete.uid);
      toast.success('Catatan kesalahan berhasil dihapus');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      loadRecentFaults(selectedOutlet, tanggal);
    } catch (err: any) {
      console.error('Error deleting TR fault:', err);
      toast.error('Gagal menghapus catatan kesalahan');
    } finally {
      setDeleting(false);
    }
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
        <div className="bg-white dark:bg-[#22221B] p-6 rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold tracking-wider text-[#889D35] uppercase">
                  HRD & Operasional Cabang
                </span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                Pencatatan Kesalahan Terapis (TR Faults)
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Formulir pencatatan insiden pelanggaran SOP atau keluhan tamu harian terhadap terapis. Mendukung multi-record per hari.
              </p>
            </div>

            {isReception && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-2 rounded-xl text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Mode Resepsionis: Terkunci pada Cabang <strong>{user?.kode_outlet}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Input Form Card */}
        <div className="bg-white dark:bg-[#22221B] p-6 rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
          <h2 className="text-base font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF] mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#889D35]" />
            <span>Formulir Input Kesalahan Baru</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tanggal */}
              <div>
                <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#889D35]" />
                  <span>Tanggal Kejadian</span>
                </label>
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => {
                    setTanggal(e.target.value);
                    loadRecentFaults(selectedOutlet, e.target.value);
                  }}
                  className="bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
                />
              </div>

              {/* Outlet */}
              <div>
                <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#889D35]" />
                  <span>Cabang / Outlet</span>
                </label>
                <select
                  value={selectedOutlet}
                  disabled={isReception}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className={`w-full bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35] ${
                    isReception ? 'opacity-80 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''
                  }`}
                >
                  {outlets.map((o) => (
                    <option key={o.kode_outlet} value={o.kode_outlet}>
                      [{o.kode_outlet}] {o.name_outlet} - {o.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Terapis */}
              <div>
                <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#889D35]" />
                  <span>Terapis (TR / TB Aktif)</span>
                </label>
                <select
                  value={selectedTherapist?.kodekaryawan || ''}
                  onChange={(e) => handleTherapistSelect(e.target.value)}
                  disabled={loadingTherapists || therapists.length === 0}
                  className="w-full bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
                >
                  <option value="">
                    {loadingTherapists
                      ? 'Memuat daftar terapis...'
                      : therapists.length === 0
                      ? 'Tidak ada terapis aktif'
                      : '-- Pilih Terapis --'}
                  </option>
                  {therapists.map((t) => (
                    <option key={t.kodekaryawan} value={t.kodekaryawan}>
                      {t.namakaryawan} ({t.kodekaryawan} - {t.departemen})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Master Kesalahan Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Jenis Kesalahan / Pelanggaran</span>
                </label>
                <select
                  value={selectedFault?.uid || ''}
                  onChange={(e) => handleFaultSelect(e.target.value)}
                  className="w-full bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
                >
                  <option value="">-- Pilih Jenis Kesalahan Master --</option>
                  {masterFaults.map((f) => (
                    <option key={f.uid} value={f.uid}>
                      [{f.kategori}] {f.nama_faults} (-{f.pengurang} Poin)
                    </option>
                  ))}
                </select>
              </div>

              {/* Snapshot Display Badge */}
              <div>
                <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] block mb-1.5">
                  Bobot & Poin Penalti
                </label>
                <div className="h-10 px-3 bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl flex items-center gap-2">
                  {selectedFault ? (
                    <>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getKategoriBadge(
                          selectedFault.kategori
                        )}`}
                      >
                        {selectedFault.kategori}
                      </span>
                      <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                        -{selectedFault.pengurang} Poin
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Pilih jenis kesalahan terlebih dahulu</span>
                  )}
                </div>
              </div>
            </div>

            {/* Keterangan Detail */}
            <div>
              <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-[#889D35]" />
                <span>Keterangan Kronologi / Catatan Tambahan (Opsional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Tamu di Kamar 3 mengeluhkan tekanan terlalu keras pada sesi reflexology pukul 14:00."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={submitting || !selectedTherapist || !selectedFault}
                className="bg-[#889D35] hover:bg-[#72852B] text-white px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Menyimpan...' : 'Simpan Catatan Kesalahan'}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Recent Entries for Today */}
        <div className="bg-white dark:bg-[#22221B] rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#D2C0A7]/30 dark:border-[#38382E] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#3C3C32] dark:text-[#EBE6DF] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#889D35]" />
                <span>Catatan Kesalahan di Cabang Ini ({tanggal})</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Riwayat catatan kesalahan yang dimasukkan pada tanggal terpilih untuk verifikasi langsung.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRecentFaults(selectedOutlet, tanggal)}
              className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-600 dark:text-gray-300 rounded-xl"
              title="Segarkan Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F5F1] dark:bg-[#191914] text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 border-b border-[#D2C0A7]/30 dark:border-[#38382E]">
                <tr>
                  <th className="px-4 py-3">Nama Terapis</th>
                  <th className="px-4 py-3">Jenis Kesalahan</th>
                  <th className="px-4 py-3 w-28">Kategori</th>
                  <th className="px-4 py-3 w-28 text-center">Poin</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 w-40">Dicatat Oleh</th>
                  <th className="px-4 py-3 w-20 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2C0A7]/20 dark:divide-[#38382E]">
                {loadingRecent ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      Memuat data catatan kesalahan...
                    </td>
                  </tr>
                ) : recentFaults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      Belum ada catatan kesalahan terapis untuk tanggal dan cabang ini.
                    </td>
                  </tr>
                ) : (
                  recentFaults.map((item) => (
                    <tr
                      key={item.uid}
                      className="hover:bg-[#F8F5F1]/50 dark:hover:bg-[#191914]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[#3C3C32] dark:text-[#EBE6DF]">
                        <div>{item.namakaryawan || item.kodekaryawan}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {item.kodekaryawan} • {item.departemen || 'TR'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#3C3C32] dark:text-[#EBE6DF]">
                        {item.nama_faults}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getKategoriBadge(
                            item.kategori
                          )}`}
                        >
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                          -{item.pengurang}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={item.keterangan || '-'}>
                        {item.keterangan || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {item.created_by_name || 'Petugas'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setItemToDelete(item);
                            setDeleteConfirmOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Confirm Delete */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-sm bg-white dark:bg-[#22221B] border border-red-200 dark:border-red-900/40 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Hapus Catatan Kesalahan</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 pt-2">
                Apakah Anda yakin ingin menghapus catatan kesalahan untuk terapis{' '}
                <strong className="text-[#3C3C32] dark:text-white">
                  "{itemToDelete?.namakaryawan || itemToDelete?.kodekaryawan}"
                </strong>
                ? Poin penalti akan dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default TrFaultsPage;
