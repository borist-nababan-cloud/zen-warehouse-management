/**
 * Product Page - Master Data > Master Produk
 *
 * CRUD operations for master_barang table with role-based access:
 * - Roles 1, 5, 6: Full CRUD access to own outlet's products
 * - Role 8: Read-only access to all products
 * - Roles 1, 8: Can see all outlets' products
 * - Roles 5, 6: Can only see their outlet's products
 *
 * UPDATES (Oct 2026):
 * - Moved to src/pages/master/
 * - Added is_laundry boolean switch toggle and badge
 * - Added Supabase Storage upload for image1_url and image2_url (Device browse only, NO camera)
 * - Harmonized with Zen Brand aesthetics and Dark Mode
 */

import { useState, useEffect, useRef } from 'react'
import {
  useProductsPaginated,
  useCreateProduct,
  useUpdateProduct,
  useSoftDeleteProduct,
  useCanEditProducts,
  useCanSeeAllOutlets
} from '@/hooks/useMasterBarang'
import { useAllTypes } from '@/hooks/useMasterType'
import { useAuthUser } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { type MasterBarangWithType, type MasterType } from '@/types/database'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Shirt,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Layers,
  Filter,
  Store
} from 'lucide-react'

// ============================================
// IMAGE UPLOAD FIELD COMPONENT
// ============================================

interface ImageUploadFieldProps {
  label: string
  currentUrl: string | null | undefined
  onUrlChange: (url: string) => void
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  previewUrl: string | null
  onClear: () => void
  disabled?: boolean
}

function ImageUploadField({
  label,
  currentUrl,
  onFileSelect,
  selectedFile,
  previewUrl,
  onClear,
  disabled
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5 MB')
      return
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format gambar harus JPG, PNG, atau WebP')
      return
    }

    onFileSelect(file)
  }

  const effectiveDisplayUrl = previewUrl || currentUrl

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium dark:text-[#EBE6DF]">{label}</Label>
      
      {/* Hidden file input without capture attribute to ensure standard device file browse */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        disabled={disabled}
      />

      {effectiveDisplayUrl ? (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-[#38382E] bg-slate-50 dark:bg-[#191914]">
          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-200 dark:bg-[#22221B] shrink-0 border border-slate-300 dark:border-[#38382E]">
            <img
              src={effectiveDisplayUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback on broken image
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-[#EBE6DF] truncate">
              {selectedFile ? selectedFile.name : 'Gambar Tersimpan'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A6A095]">
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB (Baru)` : 'Dari Supabase Storage'}
            </p>
            
            <div className="flex items-center gap-2 mt-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-6 text-xs px-2 dark:bg-[#22221B] dark:border-[#38382E] dark:text-[#EBE6DF]"
              >
                Ganti
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={disabled}
                className="h-6 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full border-2 border-dashed border-slate-300 dark:border-[#38382E] hover:border-[#889D35] dark:hover:border-[#889D35] rounded-lg p-3 text-center transition-colors bg-slate-50/50 dark:bg-[#191914]/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
        >
          <div className="p-2 rounded-full bg-slate-100 dark:bg-[#22221B] text-slate-600 dark:text-[#A6A095]">
            <Upload className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-[#EBE6DF]">
            Pilih Foto dari Perangkat
          </span>
          <span className="text-[10px] text-slate-400 dark:text-[#A6A095]">
            JPG, PNG, atau WebP (Maks. 5 MB)
          </span>
        </button>
      )}
    </div>
  )
}

// ============================================
// FORM DIALOG COMPONENT
// ============================================

interface ProductFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  editingProduct?: MasterBarangWithType | null
  types: MasterType[]
  kodeOutlet: string
  isSubmitting: boolean
}

function ProductFormDialog({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  types,
  kodeOutlet,
  isSubmitting,
}: ProductFormDialogProps) {
  const [formData, setFormData] = useState({
    sku: '',
    id_type: null as number | null,
    name: '',
    deleted: false,
    is_laundry: false,
    image1_url: '',
    image2_url: '',
    iamge2_url: '',
  })

  // Selected file states for upload
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [previewUrl1, setPreviewUrl1] = useState<string | null>(null)
  const [previewUrl2, setPreviewUrl2] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Reset form when editingProduct changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        sku: editingProduct?.sku || '',
        id_type: editingProduct?.id_type || null,
        name: editingProduct?.name || '',
        deleted: editingProduct?.deleted || false,
        is_laundry: editingProduct?.is_laundry ?? false,
        image1_url: editingProduct?.image1_url || '',
        image2_url: editingProduct?.image2_url || editingProduct?.iamge2_url || '',
        iamge2_url: editingProduct?.iamge2_url || editingProduct?.image2_url || '',
      })
      setFile1(null)
      setFile2(null)
      setPreviewUrl1(null)
      setPreviewUrl2(null)
    }
  }, [isOpen, editingProduct])

  // Manage object URLs for preview to prevent memory leaks
  const handleSelectFile1 = (file: File | null) => {
    if (previewUrl1) URL.revokeObjectURL(previewUrl1)
    setFile1(file)
    setPreviewUrl1(file ? URL.createObjectURL(file) : null)
  }

  const handleSelectFile2 = (file: File | null) => {
    if (previewUrl2) URL.revokeObjectURL(previewUrl2)
    setFile2(file)
    setPreviewUrl2(file ? URL.createObjectURL(file) : null)
  }

  const handleClearImage1 = () => {
    if (previewUrl1) URL.revokeObjectURL(previewUrl1)
    setFile1(null)
    setPreviewUrl1(null)
    setFormData(prev => ({ ...prev, image1_url: '' }))
  }

  const handleClearImage2 = () => {
    if (previewUrl2) URL.revokeObjectURL(previewUrl2)
    setFile2(null)
    setPreviewUrl2(null)
    setFormData(prev => ({ ...prev, image2_url: '', iamge2_url: '' }))
  }

  // Upload file helper to Supabase Storage
  const uploadToStorage = async (file: File, outlet: string, imgSlot: number): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${outlet}/${Date.now()}_img${imgSlot}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Silakan isi nama produk')
      return
    }
    if (!formData.id_type) {
      toast.error('Silakan pilih kategori produk')
      return
    }

    setIsUploading(true)
    try {
      let finalImg1 = formData.image1_url
      let finalImg2 = formData.image2_url

      // Upload image 1 if new file was chosen
      if (file1) {
        finalImg1 = await uploadToStorage(file1, kodeOutlet, 1)
      }

      // Upload image 2 if new file was chosen
      if (file2) {
        finalImg2 = await uploadToStorage(file2, kodeOutlet, 2)
      }

      const payload = {
        ...formData,
        image1_url: finalImg1 || null,
        image2_url: finalImg2 || null,
        iamge2_url: finalImg2 || null // Keep sync with legacy typo column
      }

      await onSubmit(payload)
    } catch (err: any) {
      console.error('Error uploading product images:', err)
      toast.error(`Gagal mengunggah foto produk: ${err.message || 'Error storage'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleChange = (field: string, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#22221B] border border-slate-200 dark:border-[#38382E] w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#38382E]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#EBE6DF]">
            {editingProduct ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* SKU */}
          <div className="space-y-1.5">
            <Label htmlFor="sku" className="dark:text-[#EBE6DF]">Nomor SKU / Kode Produk</Label>
            <Input
              id="sku"
              value={formData.sku || ''}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder={editingProduct ? 'Kode SKU produk' : 'Otomatis di-generate oleh sistem (ZP25XII0001)'}
              readOnly={!!editingProduct}
              disabled={!editingProduct}
              className="bg-slate-50 dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] font-mono text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-[#A6A095]">
              {!editingProduct
                ? 'Nomor SKU akan di-generate otomatis saat produk pertama kali disimpan.'
                : 'Nomor SKU terkunci dari database (read-only).'}
            </p>
          </div>

          {/* Product Type */}
          <div className="space-y-1.5">
            <Label htmlFor="id_type" className="dark:text-[#EBE6DF]">Kategori Produk <span className="text-rose-500">*</span></Label>
            <select
              id="id_type"
              value={formData.id_type || ''}
              onChange={(e) => handleChange('id_type', e.target.value ? Number(e.target.value) : null)}
              className="flex h-10 w-full rounded-md border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#191914] px-3 py-2 text-sm text-slate-900 dark:text-[#EBE6DF] focus:border-[#889D35] focus:outline-none"
              required
            >
              <option value="">Pilih Kategori...</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nama_type}
                </option>
              ))}
            </select>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="dark:text-[#EBE6DF]">Nama Produk <span className="text-rose-500">*</span></Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Cth: Minyak Zaitun Lemongrass 1L, Handuk Bath Towel White..."
              className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
              required
            />
          </div>

          {/* is_laundry Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-[#38382E] bg-slate-50 dark:bg-[#191914]">
            <div className="space-y-0.5">
              <Label htmlFor="is_laundry" className="text-sm font-medium dark:text-[#EBE6DF] cursor-pointer flex items-center gap-2">
                <Shirt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Barang Binatu / Laundry
              </Label>
              <p className="text-xs text-slate-500 dark:text-[#A6A095]">
                Aktifkan jika item ini termasuk linen/cucian (handuk, kimono, sprei, sarung bantal).
              </p>
            </div>
            <Switch
              id="is_laundry"
              checked={formData.is_laundry}
              onCheckedChange={(checked) => handleChange('is_laundry', checked)}
              className="data-[state=checked]:bg-[#889D35]"
            />
          </div>

          {/* Image Upload 1 & 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <ImageUploadField
              label="Foto Produk 1 (Utama)"
              currentUrl={formData.image1_url}
              onUrlChange={(url) => handleChange('image1_url', url)}
              onFileSelect={handleSelectFile1}
              selectedFile={file1}
              previewUrl={previewUrl1}
              onClear={handleClearImage1}
              disabled={isSubmitting || isUploading}
            />

            <ImageUploadField
              label="Foto Produk 2 (Detail/Samping)"
              currentUrl={formData.image2_url}
              onUrlChange={(url) => {
                handleChange('image2_url', url)
                handleChange('iamge2_url', url)
              }}
              onFileSelect={handleSelectFile2}
              selectedFile={file2}
              previewUrl={previewUrl2}
              onClear={handleClearImage2}
              disabled={isSubmitting || isUploading}
            />
          </div>

          {/* Outlet Info (read-only) */}
          <div className="space-y-1.5 pt-1">
            <Label className="dark:text-[#EBE6DF]">Gerai / Outlet Kepemilikan</Label>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-mono font-medium text-slate-700 dark:text-[#EBE6DF]">
                {kodeOutlet}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#38382E]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isUploading} className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-[#889D35] hover:bg-[#72842B] text-white min-w-[130px]"
            >
              {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Mengunggah...' : isSubmitting ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// MAIN PRODUCT PAGE COMPONENT
// ============================================

export function ProductPage() {
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [laundryFilter, setLaundryFilter] = useState<'ALL' | 'LAUNDRY' | 'REGULAR'>('ALL')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<MasterBarangWithType | null>(null)

  // Zoom preview modal state
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null)

  const { user } = useAuthUser()
  const { canEdit } = useCanEditProducts()
  const { canSeeAll } = useCanSeeAllOutlets()

  // Queries
  const { data, isLoading, error, refetch } = useProductsPaginated(
    page,
    100,
    false, // includeDeleted
    user?.kode_outlet || undefined
  )
  const { data: typesResponse, isLoading: typesLoading, error: typesError } = useAllTypes()
  const types = typesResponse?.data || []

  if (typesError && !typesLoading) {
    console.error('Failed to load product types:', typesError)
  }

  // Mutations
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useSoftDeleteProduct()

  // Filter data based on search and laundry flag
  const filteredData = (data?.data || []).filter((product) => {
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch = !query || (
      (product.name && product.name.toLowerCase().includes(query)) ||
      (product.sku && product.sku.toLowerCase().includes(query)) ||
      (product.master_type?.nama_type && product.master_type.nama_type.toLowerCase().includes(query))
    )

    const matchesLaundry =
      laundryFilter === 'ALL' ||
      (laundryFilter === 'LAUNDRY' && product.is_laundry) ||
      (laundryFilter === 'REGULAR' && !product.is_laundry)

    return matchesSearch && matchesLaundry
  })

  const pageSize = 100
  const totalPages = Math.ceil((data?.count || 0) / pageSize)

  const handleCreate = () => {
    if (!user?.kode_outlet) {
      toast.error('Profil Anda belum terhubung dengan outlet. Silakan hubungi administrator.')
      return
    }
    setEditingProduct(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (product: MasterBarangWithType) => {
    setEditingProduct(product)
    setIsDialogOpen(true)
  }

  const handleDelete = async (product: MasterBarangWithType) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.name || 'Produk tanpa nama'}"?`)) {
      return
    }

    const result = await deleteMutation.mutateAsync({
      kodeOutlet: product.kode_outlet,
      id: product.id,
    })

    if (result.isSuccess) {
      toast.success('Produk berhasil dihapus')
      refetch()
    } else {
      toast.error(result.error || 'Gagal menghapus produk')
    }
  }

  const handleSubmit = async (formData: any) => {
    const submitData = editingProduct
      ? formData
      : (({ sku, ...rest }) => rest)(formData)

    const result = editingProduct
      ? await updateMutation.mutateAsync({
        kodeOutlet: editingProduct.kode_outlet,
        id: editingProduct.id,
        data: submitData,
      })
      : await createMutation.mutateAsync(submitData)

    if (result.isSuccess) {
      toast.success(editingProduct ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan')
      setIsDialogOpen(false)
      refetch()
    } else {
      toast.error(result.error || 'Gagal menyimpan produk')
    }
  }

  const handlePrevPage = () => {
    if (page > 0) setPage(page - 1)
  }

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage(page + 1)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#889D35]" />
          <p className="text-slate-500 dark:text-[#A6A095]">Memuat katalog produk...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-rose-600">Gagal memuat produk dari database.</p>
          <Button onClick={() => refetch()} variant="outline">Coba Lagi</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-[#889D35]/15 text-[#889D35]">
                  <Layers className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                  Master Produk
                </h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-[#A6A095] mt-1">
                Katalog master barang, spesifikasi kategori, penandaan linen/laundry, dan dokumentasi foto produk.
                {!canSeeAll && user?.kode_outlet && (
                  <span className="font-medium text-slate-700 dark:text-[#EBE6DF]"> (Outlet: {user.kode_outlet})</span>
                )}
                {user?.user_role === 8 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium"> — Mode Lihat Saja (Read-Only)</span>
                )}
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleCreate} className="bg-[#889D35] hover:bg-[#72842B] text-white shadow-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tambah Produk
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Total Produk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-[#EBE6DF]">{data?.count || 0}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Barang Laundry / Linen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {(data?.data || []).filter(p => p.is_laundry).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Produk Terfilter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-[#EBE6DF]">{filteredData.length}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Halaman</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-900 dark:text-[#EBE6DF]">{page + 1} / {totalPages || 1}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Cari berdasarkan nama produk, SKU, atau kategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                  />
                </div>

                <Select value={laundryFilter} onValueChange={(val: any) => setLaundryFilter(val)}>
                  <SelectTrigger className="w-full sm:w-48 h-10 text-sm dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                    <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    <SelectValue placeholder="Filter Laundry" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                    <SelectItem value="ALL">Semua Barang</SelectItem>
                    <SelectItem value="LAUNDRY">Khusus Laundry/Linen</SelectItem>
                    <SelectItem value="REGULAR">Bukan Laundry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 dark:bg-[#191914]/80 text-slate-700 dark:text-[#EBE6DF] border-b border-slate-200 dark:border-[#38382E]">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider w-16 text-center">Foto</th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider w-36">SKU</th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider min-w-[220px]">Nama Produk</th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider">Kategori</th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-center">Tipe / Laundry</th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider">Gerai</th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-center">Status</th>
                      {canEdit && (
                        <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-right w-24">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#38382E]/50">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 8 : 7} className="px-4 py-12 text-center text-slate-400 dark:text-[#A6A095]">
                          Tidak ada produk ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((product) => {
                        const img = product.image1_url || product.image2_url || product.iamge2_url
                        return (
                          <tr
                            key={`${product.kode_outlet}-${product.id}`}
                            className="hover:bg-slate-50/60 dark:hover:bg-[#191914]/40 transition-colors"
                          >
                            {/* Photo Thumbnail */}
                            <td className="px-4 py-3 text-center">
                              {img ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalUrl(img)}
                                  className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-[#38382E] inline-block hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
                                  title="Klik untuk memperbesar"
                                >
                                  <img
                                    src={img}
                                    alt={product.name || 'Produk'}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-[#191914] border border-slate-200 dark:border-[#38382E] inline-flex items-center justify-center text-slate-400">
                                  <ImageIcon className="w-4 h-4 opacity-50" />
                                </div>
                              )}
                            </td>

                            {/* SKU */}
                            <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-[#A6A095]">
                              {product.sku || '-'}
                            </td>

                            {/* Product Name */}
                            <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-[#EBE6DF]">
                              {product.name || '-'}
                            </td>

                            {/* Category */}
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-[#A6A095]">
                              {product.master_type?.nama_type || '-'}
                            </td>

                            {/* Laundry Badge */}
                            <td className="px-4 py-3 text-center">
                              {product.is_laundry ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                                  <Shirt className="w-3 h-3" />
                                  Laundry
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-600">
                                  Reguler
                                </span>
                              )}
                            </td>

                            {/* Outlet */}
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-[#A6A095]">
                              {product.master_outlet?.name_outlet || product.kode_outlet}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-center">
                              {product.deleted ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                                  Nonaktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  Aktif
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            {canEdit && (
                              <td className="px-4 py-3 text-right text-sm">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-600 dark:text-[#EBE6DF] hover:text-[#889D35] hover:bg-[#889D35]/10"
                                    onClick={() => handleEdit(product)}
                                    title="Ubah Produk"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    onClick={() => handleDelete(product)}
                                    title="Hapus Produk"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-[#A6A095]">
            <p>
              Menampilkan {filteredData.length} dari {data?.count || 0} produk
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={page === 0}
                className="h-8 w-8 dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                Halaman {page + 1} dari {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Form Dialog */}
        <ProductFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          editingProduct={editingProduct}
          types={types}
          kodeOutlet={user?.kode_outlet || ''}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />

        {/* Zoom Photo Modal */}
        {previewModalUrl && (
          <Dialog open={!!previewModalUrl} onOpenChange={() => setPreviewModalUrl(null)}>
            <DialogContent className="max-w-md bg-white dark:bg-[#22221B] border-slate-200 dark:border-[#38382E] p-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold dark:text-[#EBE6DF]">Foto Produk</DialogTitle>
              </DialogHeader>
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-[#38382E] bg-black/5 dark:bg-black/40">
                <img
                  src={previewModalUrl}
                  alt="Zoom Foto"
                  className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export default ProductPage
