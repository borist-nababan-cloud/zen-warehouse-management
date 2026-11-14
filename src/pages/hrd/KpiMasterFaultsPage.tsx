import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdFaultService } from '@/services/hrdFaultService';
import { HrdKpiMasterFault, FaultCategory } from '@/types/hrd';
import {
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Clock,
  User,
  SlidersHorizontal,
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

export function KpiMasterFaultsPage() {
  const { user } = useAuthUser();
  const [faults, setFaults] = useState<HrdKpiMasterFault[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('ALL');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingFault, setEditingFault] = useState<HrdKpiMasterFault | null>(null);
  const [namaFaults, setNamaFaults] = useState<string>('');
  const [pengurang, setPengurang] = useState<number>(3);
  const [kategori, setKategori] = useState<FaultCategory>('Ringan');
  const [urutan, setUrutan] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [faultToDelete, setFaultToDelete] = useState<HrdKpiMasterFault | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await hrdFaultService.getKpiMasterFaults(false);
      setFaults(data);
    } catch (err: any) {
      console.error('Error loading KPI master faults:', err);
      toast.error('Gagal memuat master jenis kesalahan KPI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingFault(null);
    setNamaFaults('');
    setPengurang(3);
    setKategori('Ringan');
    setUrutan(faults.length + 1);
    setIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (fault: HrdKpiMasterFault) => {
    setEditingFault(fault);
    setNamaFaults(fault.nama_faults);
    setPengurang(fault.pengurang);
    setKategori(fault.kategori);
    setUrutan(fault.urutan);
    setIsActive(fault.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!namaFaults.trim()) {
      toast.error('Nama kesalahan tidak boleh kosong');
      return;
    }
    if (!pengurang || pengurang <= 0) {
      toast.error('Poin pengurang harus lebih besar dari 0');
      return;
    }

    try {
      setSaving(true);
      if (editingFault) {
        await hrdFaultService.updateKpiMasterFault(
          editingFault.uid,
          {
            nama_faults: namaFaults.trim(),
            pengurang: Number(pengurang),
            kategori,
            urutan: Number(urutan) || 0,
            active: isActive,
          },
          user?.id
        );
        toast.success('Jenis kesalahan KPI berhasil diperbarui');
      } else {
        await hrdFaultService.createKpiMasterFault(
          {
            nama_faults: namaFaults.trim(),
            pengurang: Number(pengurang),
            kategori,
            urutan: Number(urutan) || 0,
            active: isActive,
          },
          user?.id
        );
        toast.success('Jenis kesalahan KPI baru berhasil ditambahkan');
      }

      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving KPI master fault:', err);
      toast.error(err.message || 'Gagal menyimpan jenis kesalahan KPI');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (fault: HrdKpiMasterFault) => {
    try {
      await hrdFaultService.updateKpiMasterFault(
        fault.uid,
        { active: !fault.active },
        user?.id
      );
      toast.success(
        `Kesalahan KPI "${fault.nama_faults}" sekarang ${!fault.active ? 'Aktif' : 'Nonaktif'}`
      );
      loadData();
    } catch (err: any) {
      console.error('Error toggling KPI fault status:', err);
      toast.error('Gagal memperbarui status aktif');
    }
  };

  const handleDelete = async () => {
    if (!faultToDelete) return;
    try {
      setDeleting(true);
      await hrdFaultService.deleteKpiMasterFault(faultToDelete.uid);
      toast.success('Jenis kesalahan KPI berhasil dihapus');
      setDeleteConfirmOpen(false);
      setFaultToDelete(null);
      loadData();
    } catch (err: any) {
      console.error('Error deleting KPI master fault:', err);
      toast.error('Gagal menghapus jenis kesalahan KPI. Item mungkin terikat transaksi.');
    } finally {
      setDeleting(false);
    }
  };

  const getKategoriBadge = (kat: FaultCategory) => {
    switch (kat) {
      case 'Ringan':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'Sedang':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'Berat':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const filteredFaults = faults.filter((f) => {
    const matchesSearch =
      f.nama_faults.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategori =
      kategoriFilter === 'ALL' || f.kategori === kategoriFilter;
    return matchesSearch && matchesKategori;
  });

  const totalRingan = faults.filter((f) => f.kategori === 'Ringan').length;
  const totalSedang = faults.filter((f) => f.kategori === 'Sedang').length;
  const totalBerat = faults.filter((f) => f.kategori === 'Berat').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#22221B] p-6 rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-lg bg-[#889D35]/10 text-[#889D35] dark:bg-[#889D35]/20">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-[#889D35] uppercase">
                HRD &amp; Standar Kinerja KPI Departemen
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
              KPI Mstr. Faults
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Katalog standar jenis pelanggaran, kategori tingkat bobot, dan poin pengurang untuk audit KPI departemen (non-TR/TB).
            </p>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="bg-[#889D35] hover:bg-[#72852B] text-white flex items-center gap-2 rounded-xl px-5 py-2.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jenis Kesalahan</span>
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Total Kesalahan KPI
            </div>
            <div className="text-2xl font-bold text-[#3C3C32] dark:text-[#EBE6DF] mt-1">
              {faults.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">Tersimpan dalam katalog</div>
          </div>
          <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Kategori Ringan
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {totalRingan}
            </div>
            <div className="text-xs text-emerald-600/70 mt-1">Bobot pengurang rendah</div>
          </div>
          <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Kategori Sedang
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
              {totalSedang}
            </div>
            <div className="text-xs text-amber-600/70 mt-1">Bobot pengurang moderat</div>
          </div>
          <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm">
            <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Kategori Berat
            </div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
              {totalBerat}
            </div>
            <div className="text-xs text-rose-600/70 mt-1">Pelanggaran serius SOP</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari jenis kesalahan / kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Ringan">Ringan</option>
              <option value="Sedang">Sedang</option>
              <option value="Berat">Berat</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-[#D2C0A7]/40 dark:border-[#38382E] text-gray-600 dark:text-gray-300 rounded-xl"
              title="Segarkan Data"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-[#22221B] rounded-2xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F5F1] dark:bg-[#191914] text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 border-b border-[#D2C0A7]/30 dark:border-[#38382E]">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Urutan</th>
                  <th className="px-4 py-3.5">Nama Kesalahan</th>
                  <th className="px-4 py-3.5 w-32">Kategori</th>
                  <th className="px-4 py-3.5 w-32 text-center">Poin Pengurang</th>
                  <th className="px-4 py-3.5 w-24 text-center">Status</th>
                  <th className="px-4 py-3.5 w-52">Terakhir Diperbarui Oleh</th>
                  <th className="px-4 py-3.5 w-44">Waktu Update</th>
                  <th className="px-4 py-3.5 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2C0A7]/20 dark:divide-[#38382E]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#889D35] border-t-transparent rounded-full animate-spin" />
                        <span>Memuat data master kesalahan KPI...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredFaults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Tidak ada jenis kesalahan yang cocok dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  filteredFaults.map((item) => (
                    <tr
                      key={item.uid}
                      className="hover:bg-[#F8F5F1]/50 dark:hover:bg-[#191914]/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-center font-mono text-gray-500 text-xs">
                        {item.urutan}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#3C3C32] dark:text-[#EBE6DF]">
                        {item.nama_faults}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getKategoriBadge(
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
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            item.active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {item.active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#889D35] shrink-0" />
                          <span
                            className="truncate max-w-[180px] font-medium"
                            title={item.update_by_name || '-'}
                          >
                            {item.update_by_name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            {item.update_at
                              ? new Date(item.update_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#889D35] dark:text-gray-300"
                            title="Ubah Kesalahan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFaultToDelete(item);
                              setDeleteConfirmOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 dark:text-gray-400"
                            title="Hapus Kesalahan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Dialog: Add / Edit Fault */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-[#22221B] border border-[#D2C0A7]/30 dark:border-[#38382E] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                {editingFault ? 'Ubah Jenis Kesalahan KPI' : 'Tambah Jenis Kesalahan KPI Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Tentukan deskripsi kesalahan SOP KPI departemen, bobot kategori, dan nilai pengurang poin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] block mb-1">
                  Nama / Deskripsi Kesalahan <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Kesalahan input transaksi atau keterlambatan laporan harian"
                  value={namaFaults}
                  onChange={(e) => setNamaFaults(e.target.value)}
                  className="bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] block mb-1">
                    Kategori Tingkat Bobot <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as FaultCategory)}
                    className="w-full bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] block mb-1">
                    Poin Pengurang (Penalti) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={pengurang}
                    onChange={(e) => setPengurang(Number(e.target.value))}
                    className="bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] block mb-1">
                    Urutan Tampilan
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={urutan}
                    onChange={(e) => setUrutan(Number(e.target.value))}
                    className="bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF] block mb-1">
                    Status Aktif
                  </label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    className="w-full bg-[#F8F5F1]/50 dark:bg-[#191914] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl px-3 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-3 gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="border-[#D2C0A7]/40 dark:border-[#38382E] rounded-xl text-sm"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#889D35] hover:bg-[#72852B] text-white rounded-xl text-sm px-4"
              >
                {saving ? 'Menyimpan...' : editingFault ? 'Simpan Perubahan' : 'Tambah Kesalahan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Confirm Delete */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-sm bg-white dark:bg-[#22221B] border border-red-200 dark:border-red-900/40 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Konfirmasi Hapus Kesalahan KPI</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 pt-2">
                Apakah Anda yakin ingin menghapus kesalahan{' '}
                <strong className="text-[#3C3C32] dark:text-white">
                  "{faultToDelete?.nama_faults}"
                </strong>
                ? Tindakan ini tidak dapat dibatalkan.
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

export default KpiMasterFaultsPage;
