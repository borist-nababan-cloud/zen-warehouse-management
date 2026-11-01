import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Bath,
  Zap,
  ShowerHead,
  Armchair,
  Coffee,
  Wifi,
  Car,
  Heart,
  HelpCircle,
  Loader2,
  Upload,
  Link as LinkIcon
} from 'lucide-react'
import { toast } from 'sonner'

export interface WebFacility {
  id: string
  facility_code: string
  name: string
  category: string
  description?: string | null
  icon_name?: string | null
  image_url_1?: string | null
  image_url_2?: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  update_at: string
}

const AVAILABLE_ICONS = [
  { name: 'Bath', label: 'Bathtub / Bak Rendam', icon: Bath },
  { name: 'Sparkles', label: 'VIP / Bintang', icon: Sparkles },
  { name: 'Zap', label: 'SPKLU / Listrik', icon: Zap },
  { name: 'ShowerHead', label: 'Shower / Bilas', icon: ShowerHead },
  { name: 'Armchair', label: 'Lounge / Kursi Santai', icon: Armchair },
  { name: 'Coffee', label: 'Wedang / Minuman', icon: Coffee },
  { name: 'Wifi', label: 'Wi-Fi Internet', icon: Wifi },
  { name: 'Car', label: 'Area Parkir / Valet', icon: Car },
  { name: 'Heart', label: 'Kesehatan & Rileks', icon: Heart }
]

const CATEGORIES = [
  'Ruang Perawatan',
  'Kenyamanan & Higienitas',
  'Fasilitas Umum'
]

// ============================================
// IMAGE UPLOAD COMPONENT FOR FACILITIES
// ============================================

interface ImageUploadSlotProps {
  label: string
  slotNumber: 1 | 2
  currentUrl: string
  selectedFile: File | null
  previewUrl: string | null
  onFileSelect: (file: File | null) => void
  onClear: () => void
  onUrlChange: (url: string) => void
  disabled?: boolean
}

function ImageUploadSlot({
  label,
  slotNumber,
  currentUrl,
  selectedFile,
  previewUrl,
  onFileSelect,
  onClear,
  onUrlChange,
  disabled
}: ImageUploadSlotProps) {
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
          {label}
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
            type="url"
            value={currentUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://... (URL foto)"
            disabled={disabled}
            className="text-xs bg-white dark:bg-[#22221B]"
          />
          {currentUrl && (
            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-100 border border-slate-300 dark:border-[#38382E]">
              <img
                src={currentUrl}
                alt={label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                }}
              />
            </div>
          )}
        </div>
      ) : effectiveDisplayUrl ? (
        <div className="flex items-center gap-3 p-2 rounded-md bg-white dark:bg-[#22221B] border border-slate-200 dark:border-[#38382E]">
          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-200 dark:bg-[#191914] shrink-0 border border-slate-300 dark:border-[#38382E]">
            <img
              src={effectiveDisplayUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF] truncate">
              {selectedFile ? selectedFile.name : `Foto Fasilitas (Slot ${slotNumber})`}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A6A095]">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB (File Baru Dipilih)`
                : isSupabaseStored
                ? 'Tersimpan di Supabase Storage'
                : 'Link Gambar Terpasang'}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-6 text-xs px-2 dark:bg-[#191914] dark:border-[#38382E]"
              >
                Ganti Foto
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
          className="w-full border-2 border-dashed border-[#E5DACB] dark:border-[#38382E] hover:border-[#889D35] dark:hover:border-[#889D35] rounded-lg p-3 text-center transition-colors bg-white/60 dark:bg-[#22221B]/60 flex flex-col items-center justify-center gap-1 cursor-pointer"
        >
          <div className="p-2 rounded-full bg-[#F8F5F1] dark:bg-[#191914] text-[#889D35]">
            <Upload className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
            Pilih Foto dari Perangkat
          </span>
          <span className="text-[10px] text-slate-400 dark:text-[#A6A095]">
            JPG, PNG, atau WebP (Maksimal 5 MB)
          </span>
        </button>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function MasterFacilitiesPage() {
  const [facilities, setFacilities] = useState<WebFacility[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [uploadMessage, setUploadMessage] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Selected Files & Local Blob Previews for Supabase Storage Upload
  const [file1, setFile1] = useState<File | null>(null)
  const [preview1, setPreview1] = useState<string | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [preview2, setPreview2] = useState<string | null>(null)

  // Form Fields
  const [formData, setFormData] = useState({
    facility_code: '',
    name: '',
    category: 'Ruang Perawatan',
    description: '',
    icon_name: 'Sparkles',
    image_url_1: '',
    image_url_2: '',
    is_active: true,
    sort_order: 10
  })

  useEffect(() => {
    fetchFacilities()
  }, [])

  const fetchFacilities = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('web_facilities')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setFacilities(data || [])
    } catch (err: any) {
      console.error('Error fetching web_facilities:', err)
      toast.error('Gagal memuat master fasilitas: ' + (err.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    if (preview1) URL.revokeObjectURL(preview1)
    if (preview2) URL.revokeObjectURL(preview2)
    setFile1(null)
    setPreview1(null)
    setFile2(null)
    setPreview2(null)
    setUploadMessage('')
    setIsModalOpen(false)
  }

  const handleOpenAdd = () => {
    if (preview1) URL.revokeObjectURL(preview1)
    if (preview2) URL.revokeObjectURL(preview2)
    setFile1(null)
    setPreview1(null)
    setFile2(null)
    setPreview2(null)
    setEditingId(null)
    setFormData({
      facility_code: `FAC-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'Ruang Perawatan',
      description: '',
      icon_name: 'Sparkles',
      image_url_1: '',
      image_url_2: '',
      is_active: true,
      sort_order: (facilities.length + 1) * 10
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: WebFacility) => {
    if (preview1) URL.revokeObjectURL(preview1)
    if (preview2) URL.revokeObjectURL(preview2)
    setFile1(null)
    setPreview1(null)
    setFile2(null)
    setPreview2(null)
    setEditingId(item.id)
    setFormData({
      facility_code: item.facility_code,
      name: item.name,
      category: item.category,
      description: item.description || '',
      icon_name: item.icon_name || 'Sparkles',
      image_url_1: item.image_url_1 || '',
      image_url_2: item.image_url_2 || '',
      is_active: item.is_active,
      sort_order: item.sort_order
    })
    setIsModalOpen(true)
  }

  // File Select Handlers
  const handleSelectFile1 = (file: File | null) => {
    if (preview1) URL.revokeObjectURL(preview1)
    setFile1(file)
    setPreview1(file ? URL.createObjectURL(file) : null)
  }

  const handleClearFile1 = () => {
    if (preview1) URL.revokeObjectURL(preview1)
    setFile1(null)
    setPreview1(null)
    setFormData(prev => ({ ...prev, image_url_1: '' }))
  }

  const handleSelectFile2 = (file: File | null) => {
    if (preview2) URL.revokeObjectURL(preview2)
    setFile2(file)
    setPreview2(file ? URL.createObjectURL(file) : null)
  }

  const handleClearFile2 = () => {
    if (preview2) URL.revokeObjectURL(preview2)
    setFile2(null)
    setPreview2(null)
    setFormData(prev => ({ ...prev, image_url_2: '' }))
  }

  // Upload to Supabase Storage Bucket 'web-facilities'
  const uploadFacilityImage = async (file: File, facilityCode: string, slot: number): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const cleanCode = (facilityCode || 'FAC').replace(/[^a-zA-Z0-9_-]/g, '')
    const fileName = `facilities/${cleanCode}_${Date.now()}_img${slot}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('web-facilities')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      throw new Error(`Gagal mengunggah foto slot ${slot}: ${error.message}`)
    }

    const { data: pubData } = supabase.storage
      .from('web-facilities')
      .getPublicUrl(data.path)

    return pubData.publicUrl
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.facility_code.trim()) {
      toast.error('Kode fasilitas wajib diisi!')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Nama fasilitas wajib diisi!')
      return
    }

    try {
      setIsSaving(true)
      let finalUrl1 = formData.image_url_1.trim() || null
      let finalUrl2 = formData.image_url_2.trim() || null

      // Upload Slot 1 if new file selected
      if (file1) {
        setUploadMessage('Mengunggah Foto Utama ke Supabase Storage...')
        finalUrl1 = await uploadFacilityImage(file1, formData.facility_code, 1)
      }

      // Upload Slot 2 if new file selected
      if (file2) {
        setUploadMessage('Mengunggah Foto Sekunder ke Supabase Storage...')
        finalUrl2 = await uploadFacilityImage(file2, formData.facility_code, 2)
      }

      setUploadMessage('Menyimpan data fasilitas ke database...')

      const payload = {
        facility_code: formData.facility_code.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        icon_name: formData.icon_name,
        image_url_1: finalUrl1,
        image_url_2: finalUrl2,
        is_active: formData.is_active,
        sort_order: Number(formData.sort_order) || 10,
        update_at: new Date().toISOString()
      }

      if (editingId) {
        const { error } = await supabase
          .from('web_facilities')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Master fasilitas berhasil diperbarui beserta foto!')
      } else {
        const { error } = await supabase
          .from('web_facilities')
          .insert([payload])

        if (error) throw error
        toast.success('Master fasilitas baru berhasil ditambahkan!')
      }

      handleCloseModal()
      fetchFacilities()
    } catch (err: any) {
      console.error('Save facility error:', err)
      toast.error('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'))
    } finally {
      setIsSaving(false)
      setUploadMessage('')
    }
  }

  const handleToggleStatus = async (item: WebFacility) => {
    try {
      const newStatus = !item.is_active
      const { error } = await supabase
        .from('web_facilities')
        .update({ is_active: newStatus, update_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) throw error
      toast.success(`Fasilitas "${item.name}" ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
      fetchFacilities()
    } catch (err: any) {
      console.error('Toggle status error:', err)
      toast.error('Gagal mengubah status: ' + (err.message || 'Error'))
    }
  }

  const handleDelete = async (item: WebFacility) => {
    if (!window.confirm(`Yakin ingin menghapus fasilitas "${item.name}"? Ini juga akan menghapus pemetaannya di seluruh cabang.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('web_facilities')
        .delete()
        .eq('id', item.id)

      if (error) throw error
      toast.success('Fasilitas berhasil dihapus')
      fetchFacilities()
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error('Gagal menghapus fasilitas: ' + (err.message || 'Error'))
    }
  }

  // Render Icon helper
  const renderIcon = (iconName?: string | null) => {
    const found = AVAILABLE_ICONS.find((i) => i.name === iconName)
    if (!found) return <Sparkles className="w-4 h-4 text-[#889D35]" />
    const IconComponent = found.icon
    return <IconComponent className="w-4 h-4 text-[#889D35]" />
  }

  // Filter facilities
  const filteredFacilities = facilities.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.facility_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchCategory = selectedCategory === 'ALL' || f.category === selectedCategory

    return matchSearch && matchCategory
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
              Master Fasilitas Website
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#889D35]/15 text-[#889D35] border border-[#889D35]/30">
              Web Data
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#A6A095] mt-1">
            Katalog fasilitas resmi Zen Family Spa yang dapat dipetakan ke setiap cabang dan tampil di Website Utama.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-[#889D35] hover:bg-[#6E8027] text-white flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Fasilitas
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1E1E18] p-4 rounded-xl border border-[#E5DACB] dark:border-[#38382E] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama fasilitas, kode, deskripsi..."
            className="pl-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#E5DACB] dark:border-[#38382E] text-sm"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-[#889D35] text-white shadow-xs'
                : 'bg-gray-100 dark:bg-[#2A2A22] text-gray-600 dark:text-[#A6A095] hover:bg-gray-200'
            }`}
          >
            Semua ({facilities.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = facilities.filter((f) => f.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#889D35] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#2A2A22] text-gray-600 dark:text-[#A6A095] hover:bg-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white dark:bg-[#1E1E18] rounded-xl border border-[#E5DACB] dark:border-[#38382E] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#889D35] mb-2" />
            <p className="text-sm">Memuat katalog master fasilitas...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium">Tidak ada fasilitas ditemukan.</p>
            <p className="text-xs text-gray-400 mt-1">
              Silakan sesuaikan kata kunci pencarian atau tambah fasilitas baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5DACB] dark:border-[#38382E] bg-[#F8F5F1] dark:bg-[#191914] text-[11px] font-bold uppercase tracking-wider text-[#3C3C32] dark:text-[#A6A095]">
                  <th className="py-3 px-4 w-12 text-center">Urutan</th>
                  <th className="py-3 px-4 w-28">Kode</th>
                  <th className="py-3 px-4">Nama & Kategori</th>
                  <th className="py-3 px-4">Foto (Supabase Storage)</th>
                  <th className="py-3 px-4 text-center w-24">Status</th>
                  <th className="py-3 px-4 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACB]/60 dark:divide-[#38382E] text-xs">
                {filteredFacilities.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-[#F8F5F1]/60 dark:hover:bg-[#25251E] transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-gray-500">
                      {f.sort_order}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#889D35]">
                      {f.facility_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-[#889D35]/10 shrink-0">
                          {renderIcon(f.icon_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#3C3C32] dark:text-[#EBE6DF]">
                            {f.name}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-[#2A2A22] text-gray-600 dark:text-[#A6A095]">
                              {f.category}
                            </span>
                            {f.description && (
                              <span className="truncate max-w-xs text-gray-400">
                                • {f.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {f.image_url_1 ? (
                          <div className="relative group w-12 h-10 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50">
                            <img
                              src={f.image_url_1}
                              alt="Foto 1"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[9px] text-white font-bold">1</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-10 rounded border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-400">
                            -
                          </div>
                        )}
                        {f.image_url_2 ? (
                          <div className="relative group w-12 h-10 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50">
                            <img
                              src={f.image_url_2}
                              alt="Foto 2"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[9px] text-white font-bold">2</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-10 rounded border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-400">
                            -
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(f)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          f.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}
                      >
                        {f.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(f)}
                          className="h-7 w-7 p-0 text-gray-600 hover:text-[#889D35] hover:bg-[#889D35]/10"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(f)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Form (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E18] rounded-2xl border border-[#E5DACB] dark:border-[#38382E] shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5DACB] dark:border-[#38382E] pb-3 mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                  {editingId ? 'Edit Master Fasilitas' : 'Tambah Fasilitas Baru'}
                </h3>
                <p className="text-xs text-gray-500">
                  Data dan foto akan tersimpan di Supabase Storage bucket `web-facilities`
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                    Kode Fasilitas *
                  </label>
                  <Input
                    required
                    value={formData.facility_code}
                    onChange={(e) => setFormData({ ...formData, facility_code: e.target.value })}
                    placeholder="Contoh: FAC-BATHTUB"
                    className="font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                    Kategori *
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm rounded-md border border-[#E5DACB] dark:border-[#38382E] bg-white dark:bg-[#191914]"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                  Nama Fasilitas *
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Bathtub & Jacuzzi Herbal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                  Ikon Fasilitas (Lucide)
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-[#E5DACB] dark:border-[#38382E] bg-white dark:bg-[#191914]"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                >
                  {AVAILABLE_ICONS.map((i) => (
                    <option key={i.name} value={i.name}>
                      {i.name} — {i.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan kenyamanan fasilitas ini bagi tamu..."
                  className="w-full p-2.5 text-sm rounded-md border border-[#E5DACB] dark:border-[#38382E] bg-white dark:bg-[#191914]"
                />
              </div>

              {/* 2 Supabase Storage Image Upload Slots */}
              <div className="space-y-3 pt-2 border-t border-[#E5DACB]/50 dark:border-[#38382E]/50">
                <div>
                  <span className="text-xs font-bold text-[#889D35] uppercase block">
                    Galeri Foto Fasilitas (Supabase Storage)
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Upload foto langsung dari perangkat (JPG, PNG, WebP maks. 5 MB) atau masukkan link URL.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ImageUploadSlot
                    label="Foto Utama (Slot 1)"
                    slotNumber={1}
                    currentUrl={formData.image_url_1}
                    selectedFile={file1}
                    previewUrl={preview1}
                    onFileSelect={handleSelectFile1}
                    onClear={handleClearFile1}
                    onUrlChange={(url) => setFormData(prev => ({ ...prev, image_url_1: url }))}
                    disabled={isSaving}
                  />

                  <ImageUploadSlot
                    label="Foto Sekunder (Slot 2)"
                    slotNumber={2}
                    currentUrl={formData.image_url_2}
                    selectedFile={file2}
                    previewUrl={preview2}
                    onFileSelect={handleSelectFile2}
                    onClear={handleClearFile2}
                    onUrlChange={(url) => setFormData(prev => ({ ...prev, image_url_2: url }))}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Urutan Tampil</label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#889D35] rounded"
                  />
                  <label htmlFor="is_active" className="text-xs font-medium cursor-pointer">
                    Fasilitas Aktif
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5DACB] dark:border-[#38382E]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#889D35] hover:bg-[#6E8027] text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {uploadMessage || 'Menyimpan...'}
                    </>
                  ) : (
                    'Simpan Fasilitas'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
export default MasterFacilitiesPage
