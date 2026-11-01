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
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

export interface WebGallery {
  id: string
  title: string
  description?: string | null
  category: string
  image_url: string
  kode_outlet?: string | null
  active: boolean
  sort_order: number
  created_at: string
  update_at: string
}

const CATEGORIES = [
  'Suasana & Interior',
  'Perawatan & Spa',
  'Refleksi',
  'Bahan Alami',
  'Fasilitas Umum'
]

// ============================================
// IMAGE UPLOAD COMPONENT FOR GALLERY
// ============================================

interface GalleryImageUploadProps {
  currentUrl: string
  selectedFile: File | null
  previewUrl: string | null
  onFileSelect: (file: File | null) => void
  onClear: () => void
  onUrlChange: (url: string) => void
  disabled?: boolean
}

function GalleryImageUpload({
  currentUrl,
  selectedFile,
  previewUrl,
  onFileSelect,
  onClear,
  onUrlChange,
  disabled
}: GalleryImageUploadProps) {
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
          Foto Galeri *
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
            <div className="relative w-24 h-24 rounded-md overflow-hidden bg-slate-100 border border-slate-300 dark:border-[#38382E]">
              <img
                src={currentUrl}
                alt="Preview"
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
        <div className="flex items-center gap-3 p-2.5 rounded-md bg-white dark:bg-[#22221B] border border-slate-200 dark:border-[#38382E]">
          <div className="relative w-20 h-20 rounded-md overflow-hidden bg-slate-200 dark:bg-[#191914] shrink-0 border border-slate-300 dark:border-[#38382E]">
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
              {selectedFile ? selectedFile.name : 'Foto Galeri Tersimpan'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A6A095]">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB (File Baru Dipilih)`
                : isSupabaseStored
                ? 'Tersimpan di Supabase Storage'
                : 'Link Gambar Terpasang'}
            </p>

            <div className="flex items-center gap-2 mt-2">
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
          className="w-full border-2 border-dashed border-[#E5DACB] dark:border-[#38382E] hover:border-[#889D35] dark:hover:border-[#889D35] rounded-lg p-5 text-center transition-colors bg-white/60 dark:bg-[#22221B]/60 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
        >
          <div className="p-2.5 rounded-full bg-[#F8F5F1] dark:bg-[#191914] text-[#889D35]">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
            Pilih Foto Galeri dari Perangkat
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

export function GalleryPage() {
  const [galleries, setGalleries] = useState<WebGallery[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [uploadMessage, setUploadMessage] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Selected File & Local Blob Preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    category: 'Suasana & Interior',
    description: '',
    image_url: '',
    active: true,
    sort_order: 10
  })

  useEffect(() => {
    fetchGalleries()
  }, [])

  const fetchGalleries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('web_galleries')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setGalleries(data || [])
    } catch (err: any) {
      console.error('Error fetching web_galleries:', err)
      toast.error('Gagal memuat galeri: ' + (err.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadMessage('')
    setIsModalOpen(false)
  }

  const handleOpenAdd = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setEditingId(null)
    setFormData({
      title: '',
      category: 'Suasana & Interior',
      description: '',
      image_url: '',
      active: true,
      sort_order: (galleries.length + 1) * 10
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: WebGallery) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setEditingId(item.id)
    setFormData({
      title: item.title,
      category: item.category,
      description: item.description || '',
      image_url: item.image_url,
      active: item.active,
      sort_order: item.sort_order
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

  // Upload to Supabase Storage Bucket 'web-gallery'
  const uploadGalleryImage = async (file: File, title: string): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30) || 'foto'
    const fileName = `gallery/zen-${slug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('web-gallery')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      throw new Error(`Gagal mengunggah foto galeri: ${error.message}`)
    }

    const { data: pubData } = supabase.storage
      .from('web-gallery')
      .getPublicUrl(data.path)

    return pubData.publicUrl
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Judul foto wajib diisi!')
      return
    }

    if (!selectedFile && !formData.image_url.trim()) {
      toast.error('Foto galeri wajib dipilih atau diisi URL!')
      return
    }

    try {
      setIsSaving(true)
      let finalImageUrl = formData.image_url.trim()

      if (selectedFile) {
        setUploadMessage('Mengunggah foto ke Supabase Storage...')
        finalImageUrl = await uploadGalleryImage(selectedFile, formData.title)
      }

      setUploadMessage('Menyimpan data galeri ke database...')

      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        image_url: finalImageUrl,
        active: formData.active,
        sort_order: Number(formData.sort_order) || 10,
        update_at: new Date().toISOString()
      }

      if (editingId) {
        const { error } = await supabase
          .from('web_galleries')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Foto galeri berhasil diperbarui!')
      } else {
        const { error } = await supabase
          .from('web_galleries')
          .insert([payload])

        if (error) throw error
        toast.success('Foto galeri baru berhasil ditambahkan!')
      }

      handleCloseModal()
      fetchGalleries()
    } catch (err: any) {
      console.error('Save gallery error:', err)
      toast.error('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'))
    } finally {
      setIsSaving(false)
      setUploadMessage('')
    }
  }

  // Instant Toggle Active (ON/OFF)
  const handleToggleActive = async (item: WebGallery) => {
    try {
      const newStatus = !item.active
      const { error } = await supabase
        .from('web_galleries')
        .update({ active: newStatus, update_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) throw error
      toast.success(
        newStatus
          ? `Foto "${item.title}" sekarang TAMPIL di website statis (ON)`
          : `Foto "${item.title}" DISEMBUNYIKAN dari website statis (OFF)`
      )
      setGalleries(prev =>
        prev.map(g => (g.id === item.id ? { ...g, active: newStatus } : g))
      )
    } catch (err: any) {
      console.error('Toggle active error:', err)
      toast.error('Gagal mengubah status: ' + (err.message || 'Error'))
    }
  }

  const handleDelete = async (item: WebGallery) => {
    if (!window.confirm(`Yakin ingin menghapus foto "${item.title}" dari galeri?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('web_galleries')
        .delete()
        .eq('id', item.id)

      if (error) throw error
      toast.success('Foto galeri berhasil dihapus')
      fetchGalleries()
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error('Gagal menghapus foto: ' + (err.message || 'Error'))
    }
  }

  // Filter items
  const filteredGalleries = galleries.filter((g) => {
    const matchSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())

    const matchCategory = selectedCategory === 'ALL' || g.category === selectedCategory

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
                Galeri Foto Website
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#889D35]/15 text-[#889D35] border border-[#889D35]/30">
                Web Data
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-[#A6A095] mt-1">
              Kelola katalog foto suasana, interior, dan relaksasi yang tampil di Website Utama Zen Family Spa.
            </p>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="bg-[#889D35] hover:bg-[#6E8027] text-white flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Foto Galeri
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-[#1E1E18] p-4 rounded-xl border border-[#E5DACB] dark:border-[#38382E] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul foto, kategori, atau deskripsi..."
              className="pl-9 bg-[#F8F5F1]/50 dark:bg-[#191914] border-[#E5DACB] dark:border-[#38382E] text-sm"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-[#889D35] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#2A2A22] text-gray-600 dark:text-[#A6A095] hover:bg-gray-200'
              }`}
            >
              Semua ({galleries.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = galleries.filter((g) => g.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
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

        {/* Gallery Grid Cards */}
        {loading ? (
          <div className="bg-white dark:bg-[#1E1E18] rounded-xl border border-[#E5DACB] dark:border-[#38382E] flex flex-col items-center justify-center p-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#889D35] mb-2" />
            <p className="text-sm">Memuat galeri foto website...</p>
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1E18] rounded-xl border border-[#E5DACB] dark:border-[#38382E] p-16 text-center text-gray-400">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium">Tidak ada foto galeri ditemukan.</p>
            <p className="text-xs text-gray-400 mt-1">
              Silakan sesuaikan pencarian atau tambah foto baru ke katalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGalleries.map((item) => (
              <div
                key={item.id}
                className={`group bg-white dark:bg-[#1E1E18] rounded-xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col ${
                  item.active
                    ? 'border-[#E5DACB] dark:border-[#38382E]'
                    : 'border-dashed border-gray-300 dark:border-gray-700 opacity-70'
                }`}
              >
                {/* Image Cover */}
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#191914] overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                    }}
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                      {item.category}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/90 text-gray-800 shadow-xs">
                      Urutan: {item.sort_order}
                    </span>
                  </div>

                  {/* Active Indicator on Image */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer backdrop-blur-xs ${
                        item.active
                          ? 'bg-emerald-600/90 text-white hover:bg-emerald-700'
                          : 'bg-rose-600/90 text-white hover:bg-rose-700'
                      }`}
                    >
                      {item.active ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Tayang di Web (ON)
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Disembunyikan (OFF)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#3C3C32] dark:text-[#EBE6DF] mb-1">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="text-xs text-gray-500 dark:text-[#A6A095] line-clamp-2">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Tanpa deskripsi</p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E5DACB]/60 dark:border-[#38382E]/60">
                    <a
                      href={item.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#889D35] hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat Ukuran Penuh
                    </a>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 w-7 p-0 text-gray-600 hover:text-[#889D35] hover:bg-[#889D35]/10 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Dialog Form (Create / Edit) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1E1E18] rounded-2xl border border-[#E5DACB] dark:border-[#38382E] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#E5DACB] dark:border-[#38382E] pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                    {editingId ? 'Edit Foto Galeri' : 'Tambah Foto Galeri Baru'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Foto akan disimpan ke Supabase Storage bucket `web-gallery`
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
                {/* Image Upload Area */}
                <GalleryImageUpload
                  currentUrl={formData.image_url}
                  selectedFile={selectedFile}
                  previewUrl={previewUrl}
                  onFileSelect={handleFileSelect}
                  onClear={handleClearFile}
                  onUrlChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  disabled={isSaving}
                />

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                    Judul Foto / Suasana *
                  </label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Ruang Perawatan Privat"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                      Urutan Tampil
                    </label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                    Deskripsi Singkat / Caption
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Contoh: Pencahayaan temaram dan aromaterapi serai yang menenangkan batin..."
                    className="w-full p-2.5 text-sm rounded-md border border-[#E5DACB] dark:border-[#38382E] bg-white dark:bg-[#191914]"
                  />
                </div>

                {/* Active switch */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E5DACB]/50 dark:border-[#38382E]/50">
                  <input
                    type="checkbox"
                    id="gallery_active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-[#889D35] rounded cursor-pointer"
                  />
                  <label htmlFor="gallery_active" className="text-xs font-semibold cursor-pointer">
                    Tayangkan di Website Statis (Aktif / ON)
                  </label>
                </div>

                {/* Modal Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-[#E5DACB] dark:border-[#38382E]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSaving}
                    className="cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#889D35] hover:bg-[#6E8027] text-white cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {uploadMessage || 'Menyimpan...'}
                      </>
                    ) : (
                      'Simpan Foto Galeri'
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
export default GalleryPage
