import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { karyawanService } from '@/services/karyawanService';
import { masterOutletService } from '@/services/masterOutletService';
import { MasterOutlet } from '@/types/database';
import { HrdKaryawanInfo } from '@/types/hrd';
import {
  Users,
  Search,
  Building2,
  RefreshCw,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  UserCheck,
  UserX,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function KaryawanInfoPage() {
  const { user } = useAuthUser();

  // Multi-outlet roles (Roles 5, 8, 13 can view and switch outlets)
  const canSelectOutlet = [2, 5, 8, 13].includes(Number(user?.user_role));
  const userOutletCode = user?.kode_outlet || '';

  // Outlet State
  const [outlets, setOutlets] = useState<MasterOutlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>(() => {
    if (canSelectOutlet) return userOutletCode || 'ALL';
    return userOutletCode;
  });

  // Filter States
  const [activeStatus, setActiveStatus] = useState<'Y' | 'N' | 'ALL'>('Y');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Data States
  const [karyawanList, setKaryawanList] = useState<HrdKaryawanInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Status Change Modal States
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [targetKaryawan, setTargetKaryawan] = useState<HrdKaryawanInfo | null>(null);
  const [targetStatus, setTargetStatus] = useState<'Y' | 'N'>('N');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Photo Upload Modal States
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const [photoKaryawan, setPhotoKaryawan] = useState<HrdKaryawanInfo | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fullscreen Photo Preview Modal
  const [previewImageModalOpen, setPreviewImageModalOpen] = useState<boolean>(false);
  const [fullPreviewData, setFullPreviewData] = useState<{ url: string; name: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Outlets list (if multi-outlet role)
  useEffect(() => {
    if (canSelectOutlet) {
      masterOutletService
        .getAllWhOutlet()
        .then((data) => setOutlets(data))
        .catch((err) => console.error('Error fetching outlets:', err));
    }
  }, [canSelectOutlet]);

  // Load Karyawan Data
  const loadKaryawan = useCallback(async () => {
    try {
      setLoading(true);
      const effectiveOutlet = canSelectOutlet ? selectedOutlet : userOutletCode;

      const res = await karyawanService.getKaryawanList({
        page,
        pageSize,
        kode_outlet: effectiveOutlet,
        activeStatus,
        search: debouncedSearch,
      });

      setKaryawanList(res.data);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Error fetching karyawan:', err);
      toast.error('Gagal memuat data karyawan: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedOutlet, userOutletCode, canSelectOutlet, activeStatus, debouncedSearch]);

  useEffect(() => {
    loadKaryawan();
  }, [loadKaryawan]);

  // Status Change Handlers
  const handleOpenStatusModal = (karyawan: HrdKaryawanInfo, newStatus: 'Y' | 'N') => {
    setTargetKaryawan(karyawan);
    setTargetStatus(newStatus);
    setStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!targetKaryawan) return;
    try {
      setUpdatingStatus(true);
      await karyawanService.updateKaryawanStatus(targetKaryawan.id, targetStatus);
      toast.success(
        `Status karyawan ${targetKaryawan.namakaryawan} berhasil diubah menjadi ${
          targetStatus === 'Y' ? 'AKTIF' : 'NON-AKTIF'
        }`
      );
      setStatusModalOpen(false);
      setTargetKaryawan(null);
      loadKaryawan();
    } catch (err: any) {
      toast.error('Gagal memperbarui status: ' + (err.message || 'Kesalahan koneksi'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Photo Modal Handlers
  const handleOpenPhotoModal = (karyawan: HrdKaryawanInfo) => {
    setPhotoKaryawan(karyawan);
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(karyawan.foto_url || null);
    setPhotoModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('File yang dipilih harus berupa gambar (JPG, PNG, atau WEBP).');
        return;
      }
      setSelectedPhotoFile(file);
      const objUrl = URL.createObjectURL(file);
      setPhotoPreviewUrl(objUrl);
    }
  };

  const handleSavePhoto = async () => {
    if (!photoKaryawan || !selectedPhotoFile) {
      toast.error('Silakan pilih berkas foto terlebih dahulu.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const newFotoUrl = await karyawanService.uploadEmployeePhoto(
        selectedPhotoFile,
        photoKaryawan.kode_outlet,
        photoKaryawan.kodekaryawan,
        photoKaryawan.id
      );

      toast.success(`Foto profil karyawan ${photoKaryawan.namakaryawan} berhasil diperbarui.`);
      setPhotoModalOpen(false);
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);
      setPhotoKaryawan(null);

      // Refresh list or update local state
      setKaryawanList((prev) =>
        prev.map((k) => (k.id === photoKaryawan.id ? { ...k, foto_url: newFotoUrl } : k))
      );
    } catch (err: any) {
      toast.error('Gagal mengunggah foto: ' + (err.message || 'Kesalahan upload'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoKaryawan) return;
    if (!confirm(`Hapus foto profil untuk ${photoKaryawan.namakaryawan}?`)) return;

    try {
      setUploadingPhoto(true);
      await karyawanService.removeEmployeePhoto(photoKaryawan.id);
      toast.success('Foto profil berhasil dihapus.');
      setPhotoModalOpen(false);
      setKaryawanList((prev) =>
        prev.map((k) => (k.id === photoKaryawan.id ? { ...k, foto_url: null } : k))
      );
    } catch (err: any) {
      toast.error('Gagal menghapus foto: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Helper Initials
  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Helper Department Badges
  const renderDepartmentBadge = (dept?: string | null) => {
    if (!dept) return <span className="text-xs text-slate-400">-</span>;
    const cleanDept = dept.trim().toUpperCase();
    if (cleanDept === 'TR') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          TR • Reflexology
        </span>
      );
    }
    if (cleanDept === 'TB') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          TB • Body Massage
        </span>
      );
    }
    if (cleanDept === 'FO' || cleanDept === 'KASIR') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          {cleanDept} • Front Office
        </span>
      );
    }
    if (cleanDept === 'HK' || cleanDept === 'OB') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          {cleanDept} • Housekeeping
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
        {cleanDept}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D2C0A7]/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#889D35]/15 text-[#889D35] rounded-xl shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#3C3C32]">
                Informasi & Status Karyawan
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola status keaktifan dan foto profil identitas resmi staf outlet Zen Family Spa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadKaryawan}
              disabled={loading}
              className="border-[#D2C0A7] text-[#3C3C32] hover:bg-[#F8F5F1] gap-2 h-9"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <Card className="border-[#D2C0A7]/50 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Outlet Selector (Roles 5, 8, 13 only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3C3C32] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#889D35]" />
                  Outlet Cabang
                </label>
                {canSelectOutlet ? (
                  <Select value={selectedOutlet} onValueChange={(val) => { setSelectedOutlet(val); setPage(1); }}>
                    <SelectTrigger className="w-full bg-[#F8F5F1]/50 border-[#D2C0A7] text-sm h-10">
                      <SelectValue placeholder="Pilih Outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">SEMUA OUTLET (PUSAT)</SelectItem>
                      {outlets.map((ot) => (
                        <SelectItem key={ot.kode_outlet} value={ot.kode_outlet}>
                          [{ot.kode_outlet}] {ot.name_outlet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 px-3 bg-slate-100 border border-slate-200 rounded-md flex items-center text-sm font-medium text-slate-700">
                    Outlet Cabang: [{userOutletCode}]
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3C3C32] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#889D35]" />
                  Status Keaktifan
                </label>
                <Select
                  value={activeStatus}
                  onValueChange={(val: 'Y' | 'N' | 'ALL') => {
                    setActiveStatus(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full bg-[#F8F5F1]/50 border-[#D2C0A7] text-sm h-10">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Hanya Karyawan Aktif (Y)</SelectItem>
                    <SelectItem value="N">Hanya Non-Aktif (N)</SelectItem>
                    <SelectItem value="ALL">Semua Status (Y & N)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search by Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-[#3C3C32] flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#889D35]" />
                  Cari Nama Karyawan
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Ketik nama karyawan (min. 2 karakter)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F8F5F1]/50 border-[#D2C0A7] text-sm h-10 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats and active filters */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-2">
                <span>
                  Total Ditemukan: <strong className="text-[#3C3C32]">{totalCount}</strong> orang
                </span>
                <span>•</span>
                <span>
                  Status:{' '}
                  <Badge variant="outline" className="border-[#889D35] text-[#889D35] font-semibold">
                    {activeStatus === 'Y' ? 'Hanya Aktif' : activeStatus === 'N' ? 'Hanya Non-Aktif' : 'Semua'}
                  </Badge>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-[#D2C0A7] rounded px-2 py-0.5 text-xs text-[#3C3C32] focus:outline-none"
                >
                  <option value={10}>10 baris</option>
                  <option value={25}>25 baris</option>
                  <option value={50}>50 baris</option>
                  <option value={100}>100 baris</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-[#D2C0A7]/50 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F8F5F1] text-[#3C3C32] border-b border-[#D2C0A7]/60 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Foto</th>
                  <th className="py-3 px-4">Nama Lengkap & ID</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Outlet</th>
                  <th className="py-3 px-4">Tanggal Masuk</th>
                  <th className="py-3 px-4 text-center">Status Keaktifan</th>
                  <th className="py-3 px-4 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#889D35]" />
                        <span>Memuat data karyawan...</span>
                      </div>
                    </td>
                  </tr>
                ) : karyawanList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserX className="w-8 h-8 text-slate-300" />
                        <span className="font-medium text-slate-600">Tidak ada data karyawan yang sesuai</span>
                        <span className="text-xs text-slate-400">
                          Cobalah mengganti filter status aktif atau kata kunci pencarian.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  karyawanList.map((emp) => {
                    const isActive = emp.active === 'Y';
                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-[#F8F5F1]/50 transition-colors ${
                          !isActive ? 'bg-slate-50/60 opacity-80' : ''
                        }`}
                      >
                        {/* Foto / Avatar */}
                        <td className="py-3 px-4 text-center">
                          <div className="relative inline-block group">
                            {emp.foto_url ? (
                              <img
                                src={emp.foto_url}
                                alt={emp.namakaryawan}
                                onClick={() => {
                                  setFullPreviewData({ url: emp.foto_url!, name: emp.namakaryawan });
                                  setPreviewImageModalOpen(true);
                                }}
                                className="w-10 h-10 rounded-full object-cover border-2 border-[#D2C0A7] cursor-pointer hover:border-[#889D35] shadow-2xs"
                              />
                            ) : (
                              <div
                                onClick={() => handleOpenPhotoModal(emp)}
                                className="w-10 h-10 rounded-full bg-[#3C3C32] text-white flex items-center justify-center text-xs font-bold border-2 border-[#D2C0A7] cursor-pointer hover:bg-[#889D35] transition-colors shadow-2xs"
                              >
                                {getInitials(emp.namakaryawan)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Nama & ID */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#3C3C32] flex items-center gap-2">
                            {emp.namakaryawan}
                            {!isActive && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                NON-AKTIF
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Kode: <strong className="text-slate-700">{emp.kodekaryawan}</strong></span>
                            {emp.idkaryawan && (
                              <>
                                <span>•</span>
                                <span>ID: {emp.idkaryawan}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Departemen */}
                        <td className="py-3 px-4">{renderDepartmentBadge(emp.departemen)}</td>

                        {/* Outlet */}
                        <td className="py-3 px-4">
                          <div className="text-xs font-semibold text-slate-800">
                            {emp.master_outlet?.name_outlet || `Outlet ${emp.kode_outlet}`}
                          </div>
                          <div className="text-[11px] text-slate-400">Kode: {emp.kode_outlet}</div>
                        </td>

                        {/* Tanggal Masuk */}
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {emp.tglmasukkerja ? (
                            <span>{new Date(emp.tglmasukkerja).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Status Toggle Badge */}
                        <td className="py-3 px-4 text-center">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(emp, 'N')}
                              title="Klik untuk menonaktifkan karyawan ini"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                              Aktif (Y)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(emp, 'Y')}
                              title="Klik untuk mengaktifkan kembali karyawan ini"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-colors cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              Non-Aktif (N)
                            </button>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPhotoModal(emp)}
                              title="Unggah atau ubah foto resmi"
                              className="h-8 px-2.5 text-xs border-[#D2C0A7] text-[#3C3C32] hover:bg-[#889D35]/15 hover:text-[#889D35] gap-1"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Foto
                            </Button>

                            {isActive ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusModal(emp, 'N')}
                                title="Ubah status ke Non-Aktif (N)"
                                className="h-8 px-2.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 gap-1"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Nonaktif
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusModal(emp, 'Y')}
                                title="Ubah status ke Aktif (Y)"
                                className="h-8 px-2.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Aktifkan
                              </Button>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-[#F8F5F1]/30">
              <div>
                Menampilkan halaman <strong className="text-[#3C3C32]">{page}</strong> dari{' '}
                <strong className="text-[#3C3C32]">{totalPages}</strong> ({totalCount} total karyawan)
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1 || loading}
                  className="h-8 px-3 border-[#D2C0A7] text-xs gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </Button>

                <div className="px-3 py-1 font-semibold text-[#3C3C32] bg-white border border-[#D2C0A7] rounded-md">
                  {page}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  className="h-8 px-3 border-[#D2C0A7] text-xs gap-1"
                >
                  Selanjutnya
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ======================================================== */}
        {/* MODAL 1: Konfirmasi Perubahan Status Aktif (Y / N)       */}
        {/* ======================================================== */}
        <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border-[#D2C0A7]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#3C3C32]">
                {targetStatus === 'N' ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                Konfirmasi Perubahan Status Karyawan
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Pastikan Anda telah memverifikasi status kepegawaian terkini sebelum menyimpan.
              </DialogDescription>
            </DialogHeader>

            {targetKaryawan && (
              <div className="space-y-4 py-2 text-sm text-[#3C3C32]">
                <div className="p-3 bg-[#F8F5F1] rounded-lg border border-[#D2C0A7]/60 space-y-1">
                  <div>
                    Nama: <strong className="text-slate-800">{targetKaryawan.namakaryawan}</strong>
                  </div>
                  <div className="text-xs text-slate-600">
                    Kode: <strong>{targetKaryawan.kodekaryawan}</strong> • Departemen: <strong>{targetKaryawan.departemen || '-'}</strong>
                  </div>
                  <div className="text-xs text-slate-600">
                    Outlet: <strong>{targetKaryawan.master_outlet?.name_outlet || targetKaryawan.kode_outlet}</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  {targetStatus === 'N' ? (
                    <span className="text-rose-700 font-medium">
                      Perhatian: Mengubah status menjadi <strong>NON-AKTIF (N)</strong> akan mengecualikan karyawan ini dari roster operasional aktif dan daftar evaluasi cabang.
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">
                      Mengubah status menjadi <strong>AKTIF (Y)</strong> akan mengembalikan karyawan ini ke dalam daftar aktif operasional cabang.
                    </span>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatusModalOpen(false)}
                disabled={updatingStatus}
                className="border-slate-300"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={updatingStatus}
                className={
                  targetStatus === 'N'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
                    : 'bg-[#889D35] hover:bg-[#778B2E] text-white font-semibold'
                }
              >
                {updatingStatus ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  `Ya, Ubah ke ${targetStatus === 'Y' ? 'AKTIF (Y)' : 'NON-AKTIF (N)'}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 2: Unggah / Ganti Foto Karyawan                     */}
        {/* ======================================================== */}
        <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border-[#D2C0A7]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#3C3C32]">
                <Camera className="w-5 h-5 text-[#889D35]" />
                Foto Profil Karyawan
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Unggah foto identitas resmi karyawan untuk keperluan pengenalan dan profil operasional.
              </DialogDescription>
            </DialogHeader>

            {photoKaryawan && (
              <div className="space-y-4 py-2">
                <div className="text-center">
                  <div className="inline-block relative">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-[#889D35] shadow-md mx-auto"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-[#3C3C32] text-white text-2xl font-bold flex items-center justify-center border-4 border-[#D2C0A7] mx-auto shadow-md">
                        {getInitials(photoKaryawan.namakaryawan)}
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-[#3C3C32] mt-3">{photoKaryawan.namakaryawan}</h3>
                  <p className="text-xs text-slate-500">
                    {photoKaryawan.kodekaryawan} • {photoKaryawan.departemen || 'Staf'}
                  </p>
                </div>

                {/* Upload Input Control */}
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="flex-1 border-[#D2C0A7] text-[#3C3C32] hover:bg-[#F8F5F1] gap-2"
                    >
                      <Upload className="w-4 h-4 text-[#889D35]" />
                      Pilih Foto Baru
                    </Button>

                    {photoKaryawan.foto_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemovePhoto}
                        disabled={uploadingPhoto}
                        className="border-rose-300 text-rose-600 hover:bg-rose-50"
                        title="Hapus foto saat ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    Format: JPG, PNG, WEBP (Otomatis dikompresi maksimal 1.000px).
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhotoModalOpen(false)}
                disabled={uploadingPhoto}
                className="border-slate-300"
              >
                Tutup
              </Button>
              {selectedPhotoFile && (
                <Button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={uploadingPhoto}
                  className="bg-[#889D35] hover:bg-[#778B2E] text-white font-semibold"
                >
                  {uploadingPhoto ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mengunggah...
                    </span>
                  ) : (
                    'Simpan Foto'
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 3: Pratinjau Foto Ukuran Penuh                      */}
        {/* ======================================================== */}
        <Dialog open={previewImageModalOpen} onOpenChange={setPreviewImageModalOpen}>
          <DialogContent className="sm:max-w-lg bg-white border-[#D2C0A7] p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-[#3C3C32] truncate">
                Foto: {fullPreviewData?.name}
              </DialogTitle>
            </DialogHeader>
            {fullPreviewData && (
              <div className="flex items-center justify-center p-2">
                <img
                  src={fullPreviewData.url}
                  alt={fullPreviewData.name}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewImageModalOpen(false)}
                className="border-slate-300"
              >
                Tutup Pratinjau
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default KaryawanInfoPage;

