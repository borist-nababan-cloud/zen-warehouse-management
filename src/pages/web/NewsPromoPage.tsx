import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Globe,
  Tag,
  Calendar,
  ExternalLink,
  Sparkles,
  Megaphone,
  X
} from 'lucide-react'
import { toast } from 'sonner'

export interface WebNewsPromo {
  id: string
  title: string
  title_en?: string | null
  subtitle?: string | null
  subtitle_en?: string | null
  description?: string | null
  description_en?: string | null
  image_url: string
  badge_text?: string | null
  cta_url?: string | null
  start_date?: string | null
  end_date?: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

const BADGE_PRESETS = [
  'PROMO',
  'SPECIAL OFFER',
  'BERITA TERKINI',
  'EXCLUSIVE',
  'WEEKEND DEAL',
  'NEW TREATMENT'
]

// ============================================
// IMAGE UPLOAD COMPONENT FOR PROMO
// ============================================

interface PromoImageUploadProps {
  currentUrl: string
  selectedFile: File | null
  previewUrl: string | null
  onFileSelect: (file: File | null) => void
  onClear: () => void
  disabled?: boolean
}

function PromoImageUpload({
  currentUrl,
  selectedFile,
  previewUrl,
  onFileSelect,
  onClear,
  disabled
}: PromoImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal 5 MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format foto harus JPG, PNG, atau WebP')
      return
    }

    onFileSelect(file)
  }

  const effectiveDisplayUrl = previewUrl || currentUrl

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium dark:text-[#EBE6DF]">Banner / Gambar Promo *</Label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        disabled={disabled}
      />

      {effectiveDisplayUrl ? (
        <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-[#38382E] bg-slate-50 dark:bg-[#191914]">
          <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-[#22221B] shrink-0 border border-slate-300 dark:border-[#38382E]">
            <img
              src={effectiveDisplayUrl}
              alt="Preview Promo"
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-[#EBE6DF] truncate">
              {selectedFile ? selectedFile.name : 'Gambar Tersimpan di Cloud'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A6A095] mt-0.5">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB (Akan diunggah)`
                : 'Bucket web-news-promo'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-7 text-xs px-2.5 dark:bg-[#22221B] dark:border-[#38382E] dark:text-[#EBE6DF]"
              >
                Ganti Foto
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={disabled}
                className="h-7 text-xs px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
          className="w-full border-2 border-dashed border-slate-300 dark:border-[#38382E] hover:border-[#889D35] dark:hover:border-[#889D35] rounded-xl p-6 text-center transition-all bg-slate-50/50 dark:bg-[#191914]/50 flex flex-col items-center justify-center gap-2 cursor-pointer group"
        >
          <div className="p-3 rounded-full bg-slate-100 dark:bg-[#22221B] text-slate-600 dark:text-[#A6A095] group-hover:scale-110 transition-transform">
            <Upload className="w-5 h-5 text-[#889D35]" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
            Pilih Foto Banner Promo dari Perangkat
          </span>
          <span className="text-[11px] text-slate-400 dark:text-[#A6A095]">
            Rasio disarankan 16:9 atau 2:1 (JPG, PNG, atau WebP, Maks. 5 MB)
          </span>
        </button>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function NewsPromoPage() {
  const [items, setItems] = useState<WebNewsPromo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WebNewsPromo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    subtitle: '',
    subtitle_en: '',
    description: '',
    description_en: '',
    badge_text: 'PROMO',
    cta_url: '',
    start_date: '',
    end_date: '',
    sort_order: 0,
    active: true,
    image_url: ''
  })

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Fetch Items
  const fetchItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('web_news_promo')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err: any) {
      console.error('Error fetching news promo:', err)
      toast.error(`Gagal memuat data Berita & Promo: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      title: '',
      title_en: '',
      subtitle: '',
      subtitle_en: '',
      description: '',
      description_en: '',
      badge_text: 'PROMO',
      cta_url: '',
      start_date: '',
      end_date: '',
      sort_order: items.length > 0 ? Math.max(...items.map((i) => i.sort_order || 0)) + 1 : 1,
      active: true,
      image_url: ''
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item: WebNewsPromo) => {
    setEditingItem(item)
    setFormData({
      title: item.title || '',
      title_en: item.title_en || '',
      subtitle: item.subtitle || '',
      subtitle_en: item.subtitle_en || '',
      description: item.description || '',
      description_en: item.description_en || '',
      badge_text: item.badge_text || 'PROMO',
      cta_url: item.cta_url || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      sort_order: item.sort_order ?? 0,
      active: item.active ?? true,
      image_url: item.image_url || ''
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setIsModalOpen(true)
  }

  // Handle File Select
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    } else {
      setPreviewUrl(null)
    }
  }

  // Handle Clear Image
  const handleClearImage = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setFormData((prev) => ({ ...prev, image_url: '' }))
  }

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `banners/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('web-news-promo')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('web-news-promo').getPublicUrl(filePath)
    return data.publicUrl
  }

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Judul berita / promo wajib diisi')
      return
    }

    if (!selectedFile && !formData.image_url) {
      toast.error('Foto banner promo wajib dipilih')
      return
    }

    setIsSubmitting(true)
    try {
      let finalImageUrl = formData.image_url

      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile)
      }

      const payload = {
        title: formData.title.trim(),
        title_en: formData.title_en.trim() || null,
        subtitle: formData.subtitle.trim() || null,
        subtitle_en: formData.subtitle_en.trim() || null,
        description: formData.description.trim() || null,
        description_en: formData.description_en.trim() || null,
        badge_text: formData.badge_text.trim() || 'PROMO',
        cta_url: formData.cta_url.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        sort_order: Number(formData.sort_order) || 0,
        active: formData.active,
        image_url: finalImageUrl
      }

      if (editingItem) {
        const { error } = await supabase
          .from('web_news_promo')
          .update(payload)
          .eq('id', editingItem.id)

        if (error) throw error
        toast.success('Berita & Promo berhasil diperbarui')
      } else {
        const { error } = await supabase.from('web_news_promo').insert([payload])
        if (error) throw error
        toast.success('Berita & Promo baru berhasil ditambahkan')
      }

      setIsModalOpen(false)
      fetchItems()
    } catch (err: any) {
      console.error('Error saving news promo:', err)
      toast.error(`Gagal menyimpan data: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('web_news_promo')
        .update({ active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active: !currentStatus } : item))
      )
      toast.success(`Promo berhasil di${!currentStatus ? 'aktifkan' : 'nonaktifkan'}`)
    } catch (err: any) {
      console.error('Error toggling active status:', err)
      toast.error(`Gagal mengubah status: ${err.message}`)
    }
  }

  // Delete Item
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Yakin ingin menghapus Berita & Promo "${title}"?`)) return

    try {
      const { error } = await supabase.from('web_news_promo').delete().eq('id', id)
      if (error) throw error

      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success('Berita & Promo berhasil dihapus')
    } catch (err: any) {
      console.error('Error deleting news promo:', err)
      toast.error(`Gagal menghapus: ${err.message}`)
    }
  }

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.badge_text || '').toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === 'ACTIVE') return matchesSearch && item.active
    if (statusFilter === 'INACTIVE') return matchesSearch && !item.active
    return matchesSearch
  })

  const totalCount = items.length
  const activeCount = items.filter((i) => i.active).length
  const inactiveCount = totalCount - activeCount

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#889D35]/10 text-[#889D35] dark:bg-[#889D35]/20">
                <Megaphone className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#EBE6DF]">
                Berita & Promo Website
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-[#A6A095] mt-1">
              Kelola banner promosi dan berita terkini yang tampil pada carousel di bawah Hero Section website resmi.
            </p>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-[#889D35] hover:bg-[#76892e] text-white shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Promo Baru
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Total Berita & Promo</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-[#EBE6DF] mt-1">{totalCount}</h3>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#191914] text-slate-600 dark:text-[#A6A095]">
              <Tag className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Aktif Tampil (Maks 5 di Web)</p>
              <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{activeCount}</h3>
            </div>
            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Nonaktif / Berakhir</p>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-[#A6A095] mt-1">{inactiveCount}</h3>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#191914] text-slate-500 dark:text-[#A6A095]">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari judul, subjudul, atau badge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-[#191914] border-slate-200 dark:border-[#38382E] text-sm text-slate-800 dark:text-[#EBE6DF]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Filter Status:</span>
            <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-[#191914] border border-slate-200 dark:border-[#38382E]">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-[#22221B] text-slate-900 dark:text-[#EBE6DF] shadow-xs'
                    : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white dark:bg-[#22221B] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                }`}
              >
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white dark:bg-[#22221B] text-slate-900 dark:text-[#EBE6DF] shadow-xs'
                    : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                }`}
              >
                Nonaktif ({inactiveCount})
              </button>
            </div>
          </div>
        </div>

        {/* Content Table / Card List */}
        <div className="rounded-xl border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#889D35]" />
              <p className="text-sm">Memuat data Berita & Promo...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-[#A6A095] space-y-2">
              <Megaphone className="w-10 h-10 mx-auto text-slate-300 dark:text-[#38382E]" />
              <p className="text-base font-medium">Belum ada Berita & Promo</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tidak ada data yang cocok dengan kriteria pencarian.'
                  : 'Klik tombol "Tambah Promo Baru" di atas untuk menambahkan banner promosi ke website.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 dark:text-[#EBE6DF]">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-[#191914] border-b border-slate-200 dark:border-[#38382E] text-slate-500 dark:text-[#A6A095]">
                  <tr>
                    <th className="px-4 py-3.5 w-14 text-center">Urutan</th>
                    <th className="px-4 py-3.5 w-32">Banner</th>
                    <th className="px-4 py-3.5">Judul & Konten Promo</th>
                    <th className="px-4 py-3.5 w-40">Badge & Link</th>
                    <th className="px-4 py-3.5 w-40">Masa Berlaku</th>
                    <th className="px-4 py-3.5 w-24 text-center">Status</th>
                    <th className="px-4 py-3.5 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#38382E]/50">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#191914]/40 transition-colors"
                    >
                      {/* Urutan */}
                      <td className="px-4 py-3 text-center font-bold text-slate-500 dark:text-[#A6A095]">
                        #{item.sort_order ?? 0}
                      </td>

                      {/* Banner Image */}
                      <td className="px-4 py-3">
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#191914] border border-slate-200 dark:border-[#38382E] relative group">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src =
                                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                            }}
                          />
                        </div>
                      </td>

                      {/* Title & Info */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-[#EBE6DF]">
                              {item.title}
                            </span>
                            {item.title_en && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 font-medium">
                                EN: {item.title_en}
                              </span>
                            )}
                          </div>

                          {item.subtitle && (
                            <p className="text-xs text-slate-600 dark:text-[#A6A095] line-clamp-1">
                              {item.subtitle}
                            </p>
                          )}

                          {item.description && (
                            <p className="text-xs text-slate-400 dark:text-[#7d7971] line-clamp-1 italic">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Badge & Link */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#889D35]/15 text-[#889D35] dark:bg-[#889D35]/25 border border-[#889D35]/30">
                            {item.badge_text || 'PROMO'}
                          </span>

                          {item.cta_url && (
                            <a
                              href={item.cta_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.cta_url}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-[#A6A095]">
                        {item.start_date || item.end_date ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {item.start_date || '...'} s/d {item.end_date || '...'}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">Tanpa batas waktu</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={item.active}
                          onCheckedChange={() => handleToggleActive(item.id, item.active)}
                          className="data-[state=checked]:bg-[#889D35]"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-[#A6A095] dark:hover:text-[#EBE6DF]"
                            title="Ubah Promo"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id, item.title)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Promo"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* MODAL DIALOG: TAMBAH / EDIT PROMO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#22221B] rounded-2xl border border-slate-200 dark:border-[#38382E] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#38382E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#889D35]/10 text-[#889D35]">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-[#EBE6DF]">
                  {editingItem ? 'Ubah Berita & Promo' : 'Tambah Berita & Promo Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Image Upload Component */}
              <PromoImageUpload
                currentUrl={formData.image_url}
                selectedFile={selectedFile}
                previewUrl={previewUrl}
                onFileSelect={handleFileSelect}
                onClear={handleClearImage}
                disabled={isSubmitting}
              />

              {/* Title ID */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                  Judul Promo (Bahasa Indonesia) *
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Diskon Spesial Hari Kemerdekaan 20%"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                />
              </div>

              {/* Subtitle ID */}
              <div className="space-y-1.5">
                <Label htmlFor="subtitle" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                  Subjudul / Slogan Singkat
                </Label>
                <Input
                  id="subtitle"
                  placeholder="Contoh: Nikmati relaksasi mewah dengan harga istimewa di seluruh cabang"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                />
              </div>

              {/* Description ID */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                  Deskripsi Lengkap / Ketentuan Promo
                </Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Tuliskan detail paket, syarat dan ketentuan yang berlaku..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#191914] text-sm text-slate-900 dark:text-[#EBE6DF] focus:outline-none focus:ring-2 focus:ring-[#889D35]/30 focus:border-[#889D35]"
                />
              </div>

              {/* BILINGUAL SECTION (ENGLISH - OPTIONAL) */}
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>🌐 Versi Bahasa Inggris (English — Opsional)</span>
                </div>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-300/70">
                  Isi bila ingin teks otomatis berganti saat pengunjung website memilih bahasa English [EN].
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="title_en" className="text-xs text-slate-700 dark:text-[#EBE6DF]">
                    Title in English
                  </Label>
                  <Input
                    id="title_en"
                    placeholder="e.g. Special Independence Day 20% Discount"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subtitle_en" className="text-xs text-slate-700 dark:text-[#EBE6DF]">
                    Subtitle in English
                  </Label>
                  <Input
                    id="subtitle_en"
                    placeholder="e.g. Experience luxury rejuvenation at special rates nationwide"
                    value={formData.subtitle_en}
                    onChange={(e) => setFormData({ ...formData, subtitle_en: e.target.value })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description_en" className="text-xs text-slate-700 dark:text-[#EBE6DF]">
                    Description in English
                  </Label>
                  <textarea
                    id="description_en"
                    rows={2}
                    placeholder="Terms and conditions, promo package details..."
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#191914] text-sm text-slate-900 dark:text-[#EBE6DF] focus:outline-none focus:ring-2 focus:ring-[#889D35]/30 focus:border-[#889D35]"
                  />
                </div>
              </div>

              {/* Grid: Badge & CTA Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="badge_text" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                    Teks Label / Badge
                  </Label>
                  <Input
                    id="badge_text"
                    list="badge-presets"
                    placeholder="PROMO"
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                  />
                  <datalist id="badge-presets">
                    {BADGE_PRESETS.map((preset) => (
                      <option key={preset} value={preset} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cta_url" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                    Tautan / Link Aksi (Opsional)
                  </Label>
                  <Input
                    id="cta_url"
                    placeholder="https://wa.me/6282367867000 atau #outlets"
                    value={formData.cta_url}
                    onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                  />
                </div>
              </div>

              {/* Grid: Start Date, End Date, Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                    Tanggal Mulai (Opsional)
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end_date" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                    Tanggal Berakhir (Opsional)
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sort_order" className="text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                    Urutan Tampil (Sort Order)
                  </Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#38382E] bg-slate-50 dark:bg-[#191914]">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-[#EBE6DF]">Status Publikasi</p>
                  <p className="text-[11px] text-slate-500 dark:text-[#A6A095]">
                    Jika aktif, promo ini dapat langsung tampil pada carousel website publik.
                  </p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  className="data-[state=checked]:bg-[#889D35]"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#38382E] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#889D35] hover:bg-[#76892e] text-white flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Simpan Perubahan' : 'Terbitkan Promo'}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default NewsPromoPage
