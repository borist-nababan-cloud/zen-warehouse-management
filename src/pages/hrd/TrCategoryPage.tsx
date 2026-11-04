import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { hrdEvaluationService } from '@/services/hrdEvaluationService';
import { HrdReportTrCategory } from '@/types/hrd';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  FolderTree,
  ArrowUpDown,
  RotateCcw
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

export function TrCategoryPage() {
  const { user } = useAuthUser();
  const [categories, setCategories] = useState<HrdReportTrCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<HrdReportTrCategory | null>(null);
  const [namaKategori, setNamaKategori] = useState<string>('');
  const [urutan, setUrutan] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<HrdReportTrCategory | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await hrdEvaluationService.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Error loading TR evaluation categories:', err);
      toast.error('Gagal memuat kategori evaluasi terapis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setNamaKategori('');
    setUrutan(categories.length + 1);
    setIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: HrdReportTrCategory) => {
    setEditingCategory(cat);
    setNamaKategori(cat.nama_kategori);
    setUrutan(cat.urutan);
    setIsActive(cat.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!namaKategori.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await hrdEvaluationService.updateCategory(
          editingCategory.uid,
          {
            nama_kategori: namaKategori.trim(),
            urutan: Number(urutan) || 0,
            active: isActive,
          },
          user?.id
        );
        toast.success('Kategori evaluasi berhasil diperbarui');
      } else {
        await hrdEvaluationService.createCategory(
          namaKategori.trim(),
          Number(urutan) || 0,
          user?.id
        );
        toast.success('Kategori evaluasi baru berhasil dibuat');
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving category:', err);
      toast.error(err.message || 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setDeleting(true);
      await hrdEvaluationService.deleteCategory(categoryToDelete.uid);
      toast.success('Kategori berhasil dihapus');
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      loadData();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      toast.error('Gagal menghapus kategori. Pastikan tidak ada variabel yang masih terkait.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.nama_kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-zen-sand/40 shadow-zen">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zen-matcha/10 flex items-center justify-center border border-zen-matcha/20 text-zen-moss">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal">
                Kategori Evaluasi TR
              </h1>
              <p className="text-xs text-zen-muted mt-0.5">
                Kelola master kelompok/kategori penilaian kinerja dan kepatuhan SOP Terapis
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
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Kategori
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zen-muted" />
            <Input
              type="text"
              placeholder="Cari nama kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-white border-zen-sand/60 text-xs focus:ring-zen-matcha/30"
            />
          </div>
          <span className="text-xs text-zen-muted font-medium">
            Total {filteredCategories.length} Kategori
          </span>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-2xl border border-zen-sand/40 shadow-zen overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zen-paper/70 text-zen-charcoal uppercase tracking-wider font-semibold border-b border-zen-stone/60">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Urutan</th>
                  <th className="py-3.5 px-4">Nama Kategori</th>
                  <th className="py-3.5 px-4 w-32 text-center">Status</th>
                  <th className="py-3.5 px-4 w-36 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-stone/40">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-zen-muted">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-zen-matcha border-t-transparent mb-2"></div>
                      <p>Memuat data kategori evaluasi...</p>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-zen-muted">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-30 text-zen-moss" />
                      <p>Belum ada data kategori evaluasi yang ditemukan.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.uid} className="hover:bg-zen-paper/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zen-moss">
                        {cat.urutan}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-zen-charcoal text-sm">
                          {cat.nama_kategori}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {cat.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <XCircle className="w-3 h-3 mr-1" />
                            Non-aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 rounded-lg text-zen-muted hover:text-zen-moss hover:bg-zen-paper transition"
                            title="Edit Kategori"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCategoryToDelete(cat);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zen-muted hover:text-red-600 hover:bg-red-50 transition"
                            title="Hapus Kategori"
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

        {/* DIALOG ADD/EDIT CATEGORY */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingCategory ? 'Edit Kategori Evaluasi' : 'Tambah Kategori Evaluasi'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kategori digunakan untuk mengelompokkan variabel penilaian pada saat evaluasi terapis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-zen-charcoal mb-1">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Kualitas Pijat & Anatomi"
                  value={namaKategori}
                  onChange={(e) => setNamaKategori(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zen-charcoal mb-1 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zen-muted" />
                  <span>Nomor Urutan Tampilan</span>
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
                  id="categoryActiveCheckbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-zen-matcha rounded border-zen-sand focus:ring-zen-matcha"
                />
                <label htmlFor="categoryActiveCheckbox" className="text-xs font-semibold text-zen-charcoal cursor-pointer">
                  Kategori Aktif (Bisa dipilih pada saat pengisian evaluasi)
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
                {saving ? 'Menyimpan...' : 'Simpan Kategori'}
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
                Hapus Kategori?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus kategori <strong>"{categoryToDelete?.nama_kategori}"</strong>?
                Tindakan ini tidak dapat dibatalkan jika masih ada variabel yang terhubung.
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

export default TrCategoryPage;

