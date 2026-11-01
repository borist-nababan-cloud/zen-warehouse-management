import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Link as LinkIcon,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'

export interface WebService {
  id: string
  service_code: string
  name: string
  category: 'Body Massage' | 'Foot Reflexology' | 'Addition'
  duration_minutes: number
  description?: string | null
  benefits?: string | null
  image_url?: string | null
  active: boolean
  sort_order: number
  created_at: string
  update_at: string
}

const CATEGORIES = [
  'Body Massage',
  'Foot Reflexology',
  'Addition'
] as const

// ============================================
// IMAGE UPLOAD COMPONENT FOR SERVICES
// ============================================

interface ServiceImageUploadProps {
  currentUrl: string
  selectedFile: File | null
  previewUrl: string | null
  onFileSelect: (file: File | null) => void
  onClear: () => void
  onUrlChange: (url: string) => void
  disabled?: boolean
}

function ServiceImageUpload({
  currentUrl,
  selectedFile,
  previewUrl,
  onFileSelect,
  onClear,
  onUrlChange,
  disabled
}: ServiceImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [useUrlMode, setUseUrlMode] = useState<boolean>(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal 5 MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format gambar harus JPG, PNG, atau WebP')
      return
    }

    onFileSelect(file)
  }

  const effectiveDisplayUrl = previewUrl || currentUrl
  const isSupabaseStored = currentUrl && currentUrl.includes('supabase.co/storage')

  return (
    <div className="space-y-1.5 p-3 rounded-lg border border-[#E5DACB] dark:border-[#38382E] bg-[#F8F5F1]/60 dark:bg-[#191914]/60">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
          Foto Layanan Perawatan
        </label>
        <button
          type="button"
          onClick={() => setUseUrlMode(!useUrlMode)}
          disabled={disabled}
          className="text-[11px] text-[#889D35] hover:underline flex items-center gap-1 cursor-pointer font-medium"
        >
          {useUrlMode ? (
            <>
              <Upload className="w-3 h-3" />
              Upload dari Perangkat
            </>
          ) : (
            <>
              <LinkIcon className="w-3 h-3" />
              Input URL Langsung
            </>
          )}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        disabled={disabled}
      />

      {useUrlMode ? (
        <div className="space-y-2">
          <Input
            value={currentUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://contoh.com/foto-layanan.jpg"
            className="h-8 text-xs border-[#D2C0A7] bg-white dark:bg-[#25251F]"
            disabled={disabled}
          />
          <p className="text-[10px] text-muted-foreground">
            Masukkan tautan gambar langsung (CDN/Hosting eksternal).
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative w-20 h-16 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-[#D2C0A7]/60 flex items-center justify-center shrink-0">
            {effectiveDisplayUrl ? (
              <img
                src={effectiveDisplayUrl}
                alt="Pratinjau"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                }}
              />
            ) : (
              <span className="text-[10px] text-muted-foreground text-center px-1">
                Belum ada foto
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-7 text-xs border-[#889D35] text-[#889D35] hover:bg-[#889D35]/10 flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                {selectedFile ? 'Ganti File' : 'Pilih Foto'}
              </Button>
              {(selectedFile || currentUrl) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  disabled={disabled}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  Hapus
                </Button>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground space-y-0.5">
              {selectedFile ? (
                <span className="text-emerald-600 font-medium truncate block max-w-[240px]">
                  ✓ Siap diunggah: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              ) : isSupabaseStored ? (
                <span className="text-blue-600 dark:text-blue-400 font-medium block truncate max-w-[240px]">
                  ✓ Tersimpan di Supabase Storage
                </span>
              ) : currentUrl ? (
                <span className="truncate block max-w-[240px] text-[10px]">
                  URL: {currentUrl}
                </span>
              ) : (
                <span>Format: JPG, PNG, WebP (Maks. 5 MB). Rasio rekomendasi 16:9 atau 4:3.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT: SERVICES MENU
// ============================================

export function ServicesMenuPage() {
  const [services, setServices] = useState<WebService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    service_code: '',
    name: '',
    category: 'Body Massage' as 'Body Massage' | 'Foot Reflexology' | 'Addition',
    duration_minutes: 60,
    description: '',
    benefits: '',
    image_url: '',
    active: true,
    sort_order: 10
  })

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<WebService | null>(null)

  // Load Services from Supabase
  const loadServices = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('web_services')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching web_services:', error)
        toast.error('Gagal memuat katalog menu layanan: ' + error.message)
      } else {
        setServices(data || [])
      }
    } catch (err: any) {
      console.error('Fetch exception:', err)
      toast.error('Terjadi kesalahan jaringan saat memuat menu layanan.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  // Open Modal for Create
  const handleAddNew = () => {
    setIsEditing(false)
    setEditingId(null)
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)

    // Calculate default next sort order
    const maxSort = services.reduce((max, s) => Math.max(max, s.sort_order || 0), 0)
    setFormData({
      service_code: `SRV-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'Body Massage',
      duration_minutes: 60,
      description: '',
      benefits: '',
      image_url: '',
      active: true,
      sort_order: maxSort + 10
    })
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleEdit = (item: WebService) => {
    setIsEditing(true)
    setEditingId(item.id)
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)

    setFormData({
      service_code: item.service_code,
      name: item.name,
      category: item.category,
      duration_minutes: item.duration_minutes || 60,
      description: item.description || '',
      benefits: item.benefits || '',
      image_url: item.image_url || '',
      active: item.active,
      sort_order: item.sort_order || 10
    })
    setIsModalOpen(true)
  }

  const handleFileSelect = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, image_url: '' }))
  }

  // Upload to Supabase Storage Bucket 'web-services'
  const uploadServiceImage = async (file: File, serviceCode: string): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const cleanCode = serviceCode.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const fileName = `services/zen-${cleanCode}-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('web-services')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      throw new Error(`Gagal mengunggah foto layanan: ${error.message}`)
    }

    const { data: pubData } = supabase.storage
      .from('web-services')
      .getPublicUrl(data.path)

    return pubData.publicUrl
  }

  // Save Service (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.service_code.trim()) {
      toast.error('Kode layanan wajib diisi!')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Nama layanan perawatan wajib diisi!')
      return
    }

    setIsSaving(true)
    try {
      let finalImageUrl = formData.image_url.trim()

      if (selectedFile) {
        toast.loading('Mengunggah gambar layanan ke Supabase Storage...', { id: 'upload-progress' })
        finalImageUrl = await uploadServiceImage(selectedFile, formData.service_code)
        toast.dismiss('upload-progress')
      }

      const payload = {
        service_code: formData.service_code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        duration_minutes: Number(formData.duration_minutes) || 60,
        description: formData.description.trim() || null,
        benefits: formData.benefits.trim() || null,
        image_url: finalImageUrl || null,
        active: formData.active,
        sort_order: Number(formData.sort_order) || 10,
        update_at: new Date().toISOString()
      }

      if (isEditing && editingId) {
        const { error } = await supabase
          .from('web_services')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Layanan perawatan berhasil diperbarui!')
      } else {
        const { data: inserted, error } = await supabase
          .from('web_services')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        // Automatically create availability records in web_outlet_services for all active outlets
        if (inserted?.id) {
          const { data: outlets } = await supabase
            .from('master_outlet')
            .select('kode_outlet')
            .eq('active', true)

          if (outlets && outlets.length > 0) {
            const outletServices = outlets.map(o => ({
              kode_outlet: o.kode_outlet,
              service_id: inserted.id,
              is_available: true
            }))
            await supabase
              .from('web_outlet_services')
              .upsert(outletServices, { onConflict: 'kode_outlet,service_id' })
          }
        }

        toast.success('Layanan perawatan baru berhasil ditambahkan!')
      }

      setIsModalOpen(false)
      loadServices()
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error('Gagal menyimpan layanan: ' + (err.message || 'Terjadi kesalahan sistem.'))
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle Active directly from table
  const handleToggleActive = async (item: WebService) => {
    try {
      const newActive = !item.active
      const { error } = await supabase
        .from('web_services')
        .update({ active: newActive, update_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) throw error

      setServices(prev =>
        prev.map(s => (s.id === item.id ? { ...s, active: newActive } : s))
      )
      toast.success(`Layanan "${item.name}" berhasil di-${newActive ? 'aktifkan' : 'nonaktifkan'}.`)
    } catch (err: any) {
      toast.error('Gagal mengubah status: ' + err.message)
    }
  }

  // Delete Action
  const handleDeleteClick = (item: WebService) => {
    setDeletingItem(item)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('web_services')
        .delete()
        .eq('id', deletingItem.id)

      if (error) throw error

      toast.success(`Layanan "${deletingItem.name}" berhasil dihapus.`)
      setDeleteConfirmOpen(false)
      setDeletingItem(null)
      loadServices()
    } catch (err: any) {
      toast.error('Gagal menghapus layanan: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter Services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.service_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'ALL' || s.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5DACB] dark:border-[#38382E] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#889D35]/15 flex items-center justify-center text-[#889D35] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                Menu Layanan Perawatan
              </h1>
              <p className="text-xs text-[#717163] dark:text-[#A8A29E] mt-0.5">
                Katalog master menu perawatan Zen Family Spa (sinkronisasi langsung dengan website resmi)
              </p>
            </div>
          </div>

          <Button
            onClick={handleAddNew}
            className="bg-[#889D35] hover:bg-[#73852C] text-white shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Layanan Baru
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1E1E19] p-4 rounded-xl border border-[#E5DACB] dark:border-[#38382E] shadow-xs">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('ALL')}
              className={`h-8 text-xs font-medium cursor-pointer rounded-lg ${
                selectedCategory === 'ALL'
                  ? 'bg-[#889D35] text-white hover:bg-[#73852C]'
                  : 'text-[#717163] border-[#E5DACB] dark:border-[#38382E]'
              }`}
            >
              Semua Kategori ({services.length})
            </Button>
            {CATEGORIES.map((cat) => {
              const count = services.filter((s) => s.category === cat).length
              const active = selectedCategory === cat
              return (
                <Button
                  key={cat}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-8 text-xs font-medium cursor-pointer rounded-lg ${
                    active
                      ? 'bg-[#889D35] text-white hover:bg-[#73852C]'
                      : 'text-[#717163] border-[#E5DACB] dark:border-[#38382E]'
                  }`}
                >
                  {cat} ({count})
                </Button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode atau nama layanan..."
              className="pl-9 h-8 text-xs border-[#E5DACB] dark:border-[#38382E] bg-white dark:bg-[#25251F]"
            />
          </div>
        </div>

        {/* Info Note on Multi-Branch Pricing */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Catatan Kebijakan Tarif & Cabang:</span>
            <span>
              Tarif layanan berbeda di masing-masing kota/cabang. Oleh karena itu, katalog master ini tidak memuat harga tunggal agar tidak menimbulkan salah persepsi di situs publik. Ketersediaan menu per cabang dapat disesuaikan pada halaman <strong>Pengaturan Informasi Cabang</strong>.
            </span>
          </div>
        </div>

        {/* Services List / Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1E1E19] rounded-xl border border-[#E5DACB] dark:border-[#38382E]">
            <Loader2 className="w-8 h-8 animate-spin text-[#889D35] mb-2" />
            <p className="text-xs text-muted-foreground">Memuat data menu layanan...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1E1E19] rounded-xl border border-[#E5DACB] dark:border-[#38382E] text-center p-6">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
              Tidak Ada Layanan Ditemukan
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {searchQuery
                ? `Tidak ada layanan yang cocok dengan kata kunci "${searchQuery}".`
                : 'Belum ada menu perawatan yang terdaftar pada kategori ini.'}
            </p>
            <Button
              onClick={handleAddNew}
              variant="outline"
              size="sm"
              className="mt-4 text-xs border-[#889D35] text-[#889D35]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Layanan Sekarang
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E1E19] rounded-xl border border-[#E5DACB] dark:border-[#38382E] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F5F1] dark:bg-[#25251F] border-b border-[#E5DACB] dark:border-[#38382E] text-[#717163] dark:text-[#A8A29E] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Urutan</th>
                    <th className="py-3 px-4 w-20">Foto</th>
                    <th className="py-3 px-4">Layanan</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Durasi</th>
                    <th className="py-3 px-4">Manfaat Utama</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACB]/60 dark:divide-[#38382E]/60 text-[#3C3C32] dark:text-[#EBE6DF]">
                  {filteredServices.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8F5F1]/50 dark:hover:bg-[#25251F]/50 transition-colors"
                    >
                      {/* Sort Order */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-muted-foreground">
                        {item.sort_order}
                      </td>

                      {/* Image Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-[#E5DACB] dark:border-[#38382E] relative flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>'
                              }}
                            />
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">No image</span>
                          )}
                        </div>
                      </td>

                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm text-[#3C3C32] dark:text-[#EBE6DF]">
                          {item.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {item.service_code}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-[#717163] dark:text-[#A8A29E] line-clamp-1 mt-0.5 max-w-sm">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#889D35]/15 text-[#6E8027] dark:text-[#A3B84E]">
                          {item.category}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-xs text-[#3C3C32] dark:text-[#EBE6DF]">
                          <Clock className="w-3.5 h-3.5 text-[#889D35]" />
                          {item.duration_minutes} Menit
                        </span>
                      </td>

                      {/* Benefits */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs">
                        <span className="line-clamp-2 italic">
                          {item.benefits ? `"${item.benefits}"` : '-'}
                        </span>
                      </td>

                      {/* Status Active Switch */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                            item.active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {item.active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Nonaktif
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-[#889D35] cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Service */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white dark:bg-[#1E1E19] rounded-2xl border border-[#E5DACB] dark:border-[#38382E] shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-[#E5DACB] dark:border-[#38382E] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                  {isEditing ? 'Ubah Layanan Perawatan' : 'Tambah Layanan Perawatan Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Service Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                      Kode Layanan *
                    </label>
                    <Input
                      required
                      value={formData.service_code}
                      onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
                      placeholder="Contoh: SRV-MASSAGE-ROYAL"
                      className="h-9 text-xs border-[#D2C0A7] bg-white dark:bg-[#25251F]"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                      Nama Layanan *
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: The Royal Zen Body Massage"
                      className="h-9 text-xs border-[#D2C0A7] bg-white dark:bg-[#25251F]"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                      Kategori *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as any
                        })
                      }
                      className="w-full h-9 px-3 rounded-md border border-[#D2C0A7] bg-white dark:bg-[#25251F] text-xs text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-hidden focus:ring-1 focus:ring-[#889D35]"
                      disabled={isSaving}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration Minutes */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                      Durasi (Menit) *
                    </label>
                    <Input
                      type="number"
                      min={15}
                      step={5}
                      required
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({ ...formData, duration_minutes: Number(e.target.value) })
                      }
                      className="h-9 text-xs border-[#D2C0A7] bg-white dark:bg-[#25251F]"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                      Urutan Tampil
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: Number(e.target.value) })
                      }
                      className="h-9 text-xs border-[#D2C0A7] bg-white dark:bg-[#25251F]"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                    Deskripsi Perawatan
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Jelaskan teknik atau ritual perawatan secara ringkas..."
                    className="w-full p-2.5 rounded-md border border-[#D2C0A7] bg-white dark:bg-[#25251F] text-xs text-[#3C3C32] dark:text-[#EBE6DF] focus:outline-hidden focus:ring-1 focus:ring-[#889D35]"
                    disabled={isSaving}
                  />
                </div>

                {/* Benefits */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                    Manfaat Utama bagi Tubuh
                  </label>
                  <Input
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    placeholder="Contoh: Melancarkan peredaran darah, meredakan nyeri otot leher..."
                    className="h-9 text-xs border-[#D2C0A7] bg-white dark:bg-[#25251F]"
                    disabled={isSaving}
                  />
                </div>

                {/* Image Upload Component */}
                <ServiceImageUpload
                  currentUrl={formData.image_url}
                  selectedFile={selectedFile}
                  previewUrl={previewUrl}
                  onFileSelect={handleFileSelect}
                  onClear={handleClearFile}
                  onUrlChange={(url) => setFormData({ ...formData, image_url: url })}
                  disabled={isSaving}
                />

                {/* Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="service_active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-[#889D35] rounded cursor-pointer"
                    disabled={isSaving}
                  />
                  <label
                    htmlFor="service_active"
                    className="text-xs font-medium text-[#3C3C32] dark:text-[#EBE6DF] cursor-pointer"
                  >
                    Tampilkan di Website Resmi (Aktif)
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACB] dark:border-[#38382E]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                    className="text-xs cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#889D35] hover:bg-[#73852C] text-white text-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isEditing ? 'Simpan Perubahan' : 'Tambah Layanan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmOpen && deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#1E1E19] rounded-2xl border border-[#E5DACB] dark:border-[#38382E] shadow-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-destructive">
                Konfirmasi Hapus Layanan
              </h3>
              <p className="text-xs text-[#717163] dark:text-[#A8A29E] leading-relaxed">
                Apakah Anda yakin ingin menghapus layanan{' '}
                <strong className="text-[#3C3C32] dark:text-[#EBE6DF]">
                  "{deletingItem.name}"
                </strong>{' '}
                ({deletingItem.service_code})?
                <br />
                Tindakan ini juga akan menghapus data ketersediaan layanan ini di seluruh cabang terkait.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isSaving}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={isSaving}
                  className="text-xs flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Hapus Permanen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
