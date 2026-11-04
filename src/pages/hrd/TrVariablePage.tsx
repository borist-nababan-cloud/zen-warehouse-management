import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import { HrdReportTrCategory, HrdReportTrVariable } from '@/types/hrd';
import {
  ListChecks,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  RotateCcw,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TrVariablePage() {
  const { user } = useAuthUser();
  const [categories, setCategories] = useState<HrdReportTrCategory[]>([]);
  const [variables, setVariables] = useState<HrdReportTrVariable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Dialog Add/Edit State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingVar, setEditingVar] = useState<HrdReportTrVariable | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [namaVariable, setNamaVariable] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [urutan, setUrutan] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [varToDelete, setVarToDelete] = useState<HrdReportTrVariable | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, vars] = await Promise.all([
        hrdEvaluationService.getCategories(),
        hrdEvaluationService.getVariables(),
      ]);
      setCategories(cats);
      setVariables(vars);
    } catch (err: any) {
      console.error('Error loading variables:', err);
      toast.error('Gagal memuat variabel evaluasi terapis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingVar(null);
    setCategoryId(categories.length > 0 ? categories[0].uid : '');
    setNamaVariable('');
    setDeskripsi('');
    setUrutan(variables.length + 1);
    setIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (v: HrdReportTrVariable) => {
    setEditingVar(v);
    setCategoryId(v.category_id);
    setNamaVariable(v.nama_variable);
    setDeskripsi(v.deskripsi || '');
    setUrutan(v.urutan);
    setIsActive(v.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryId) {
      toast.error('Pilih kategori untuk variabel ini');
      return;
    }
    if (!namaVariable.trim()) {
      toast.error('Nama variabel tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);
      if (editingVar) {
        await hrdEvaluationService.updateVariable(
          editingVar.uid,
          {
            category_id: categoryId,
            nama_variable: namaVariable.trim(),
            deskripsi: deskripsi.trim() || null,
            urutan: Number(urutan) || 0,
            active: isActive,
          },
          user?.id
        );
        toast.success('Variabel evaluasi berhasil diperbarui');
      } else {
        await hrdEvaluationService.createVariable(
          categoryId,
          namaVariable.trim(),
          deskripsi.trim() || undefined,
          Number(urutan) || 0,
          user?.id
        );
        toast.success('Variabel evaluasi baru berhasil dibuat');
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving variable:', err);
      toast.error(err.message || 'Gagal menyimpan variabel');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!varToDelete) return;
    try {
      setDeleting(true);
      await hrdEvaluationService.deleteVariable(varToDelete.uid);
      toast.success('Variabel berhasil dihapus');
      setDeleteConfirmOpen(false);
      setVarToDelete(null);
      loadData();
    } catch (err: any) {
      console.error('Error deleting variable:', err);
      toast.error('Gagal menghapus variabel evaluasi');
    } finally {
      setDeleting(false);
    }
  };

  const filteredVariables = variables.filter((v) => {
    const matchCategory =
      selectedCategoryFilter === 'ALL' || v.category_id === selectedCategoryFilter;
    const matchSearch =
      v.nama_variable.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.deskripsi && v.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.category?.nama_kategori && v.category.nama_kategori.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-zen-sand/40 shadow-zen">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zen-matcha/10 flex items-center justify-center border border-zen-matcha/20 text-zen-moss">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal">
                Variabel Evaluasi TR
              </h1>
              <p className="text-xs text-zen-muted mt-0.5">
                Kelola butir-butir variabel penilaian standar kinerja (default nilai 5, maksimal 10)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="rounded-xl border-zen-sand/60 text-zen-charcoal hover:bg-zen-paper"
              disabled={loading}
            >
              <RotateCcw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="rounded-xl bg-zen-matcha hover:bg-zen-moss text-white shadow-sm"
              disabled={categories.length === 0}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Variabel
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zen-muted" />
              <Input
                type="text"
                placeholder="Cari variabel atau panduan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-white border-zen-sand/60 text-xs focus:ring-zen-matcha/30"
              />
            </div>

            {/* Filter Kategori Dropdown */}
            <div className="flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-zen-muted" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs text-zen-charcoal font-medium focus:ring-2 focus:ring-zen-matcha/30"
              >
                <option value="ALL">Semua Kategori ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.nama_kategori}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs text-zen-muted font-medium self-end sm:self-auto">
            Menampilkan {filteredVariables.length} dari {variables.length} Variabel
          </span>
        </div>

        {/* Variables Table */}
        <div className="bg-white rounded-2xl border border-zen-sand/40 shadow-zen overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zen-paper/70 text-zen-charcoal uppercase tracking-wider font-semibold border-b border-zen-stone/60">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Urutan</th>
                  <th className="py-3.5 px-4 w-52">Kategori</th>
                  <th className="py-3.5 px-4">Nama Variabel & Panduan Penilaian</th>
                  <th className="py-3.5 px-4 w-28 text-center">Status</th>
                  <th className="py-3.5 px-4 w-32 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-stone/40">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zen-muted">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-zen-matcha border-t-transparent mb-2"></div>
                      <p>Memuat daftar variabel evaluasi...</p>
                    </td>
                  </tr>
                ) : filteredVariables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zen-muted">
                      <Tag className="w-8 h-8 mx-auto mb-2 opacity-30 text-zen-moss" />
                      <p>Belum ada variabel evaluasi yang sesuai filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredVariables.map((v) => (
                    <tr key={v.uid} className="hover:bg-zen-paper/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zen-moss">
                        {v.urutan}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zen-paper border border-zen-sand/50 text-zen-moss">
                          {v.category?.nama_kategori || 'Tanpa Kategori'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-zen-charcoal text-sm">
                          {v.nama_variable}
                        </p>
                        {v.deskripsi && (
                          <p className="text-[11px] text-zen-muted mt-0.5 leading-relaxed">
                            {v.deskripsi}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {v.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <XCircle className="w-3 h-3 mr-1" />
                            Non-aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 rounded-lg text-zen-muted hover:text-zen-moss hover:bg-zen-paper transition"
                            title="Edit Variabel"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setVarToDelete(v);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zen-muted hover:text-red-600 hover:bg-red-50 transition"
                            title="Hapus Variabel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DIALOG ADD/EDIT VARIABLE */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingVar ? 'Edit Variabel Evaluasi' : 'Tambah Variabel Evaluasi'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Variabel ini akan muncul otomatis dengan nilai default 5 (skala 1-10) saat form evaluasi dibuat.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-zen-charcoal mb-1">
                  Kategori Induk <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-zen-sand/60 text-xs font-medium focus:ring-2 focus:ring-zen-matcha/30"
                >
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories.map((c) => (
                    <option key={c.uid} value={c.uid}>
                      {c.nama_kategori}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zen-charcoal mb-1">
                  Nama Variabel Penilaian <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Ketepatan Tekanan & Titik Pijat"
                  value={namaVariable}
                  onChange={(e) => setNamaVariable(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zen-charcoal mb-1">
                  Deskripsi / Panduan Penilaian (Opsional)
                </label>
                <Textarea
                  placeholder="Panduan bagi penilai mengenai kriteria skor penilaian ini..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zen-charcoal mb-1">
                  Nomor Urutan Tampilan
                </label>
                <Input
                  type="number"
                  min={1}
                  value={urutan}
                  onChange={(e) => setUrutan(Number(e.target.value))}
                  className="rounded-xl w-32"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="varActiveCheckbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-zen-matcha rounded border-zen-sand focus:ring-zen-matcha"
                />
                <label htmlFor="varActiveCheckbox" className="text-xs font-semibold text-zen-charcoal cursor-pointer">
                  Variabel Aktif (Otomatis dimunculkan pada saat Buat Evaluasi TR)
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-zen-matcha hover:bg-zen-moss text-white"
              >
                {saving ? 'Menyimpan...' : 'Simpan Variabel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG CONFIRM DELETE */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Hapus Variabel?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus variabel <strong>"{varToDelete?.nama_variable}"</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
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

export default TrVariablePage;

