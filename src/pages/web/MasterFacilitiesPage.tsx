import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
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
  Loader2
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

export function MasterFacilitiesPage() {
  const [facilities, setFacilities] = useState<WebFacility[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const handleOpenAdd = () => {
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
      const payload = {
        facility_code: formData.facility_code.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        icon_name: formData.icon_name,
        image_url_1: formData.image_url_1.trim() || null,
        image_url_2: formData.image_url_2.trim() || null,
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
        toast.success('Master fasilitas berhasil diperbarui')
      } else {
        const { error } = await supabase
          .from('web_facilities')
          .insert([payload])

        if (error) throw error
        toast.success('Master fasilitas baru berhasil ditambahkan')
      }

      setIsModalOpen(false)
      fetchFacilities()
    } catch (err: any) {
      console.error('Save facility error:', err)
      toast.error('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'))
    } finally {
      setIsSaving(false)
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
      setFacilities((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, is_active: newStatus } : f))
      )
      toast.success(`Fasilitas "${item.name}" kini ${newStatus ? 'Aktif' : 'Nonaktif'}`)
    } catch (err: any) {
      toast.error('Gagal mengubah status: ' + err.message)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus fasilitas "${name}"? Ini juga akan menghapus relasi fasilitas pada seluruh cabang.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('web_facilities')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success(`Fasilitas "${name}" berhasil dihapus`)
      fetchFacilities()
    } catch (err: any) {
      toast.error('Gagal menghapus fasilitas: ' + err.message)
    }
  }

  const renderIcon = (iconName?: string | null) => {
    const matched = AVAILABLE_ICONS.find((i) => i.name === iconName)
    const IconComp = matched ? matched.icon : Sparkles
    return <IconComp className="w-5 h-5 text-[#889D35]" />
  }

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.facility_code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'ALL' || f.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3C3C32] dark:text-[#EBE6DF]">
            Master Fasilitas Website
          </h1>
          <p className="text-sm text-[#717163] dark:text-[#A0A090]">
            Kelola katalog fasilitas spa publik (maks. 2 foto) yang dapat dipilih oleh masing-masing cabang di Info Outlet.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-[#889D35] hover:bg-[#6E8027] text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Fasilitas</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#22221B] p-4 rounded-xl border border-[#E5DACB] dark:border-[#38382E] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari nama atau kode fasilitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#F8F5F1] dark:bg-[#191914] border-[#E5DACB] dark:border-[#38382E]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <Button
            size="sm"
            variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('ALL')}
            className={selectedCategory === 'ALL' ? 'bg-[#889D35] hover:bg-[#6E8027] text-white' : ''}
          >
            Semua ({facilities.length})
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'bg-[#889D35] hover:bg-[#6E8027] text-white' : ''}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Facilities Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#22221B] rounded-2xl border border-[#E5DACB] dark:border-[#38382E]">
          <HelpCircle className="w-12 h-12 text-[#889D35] mx-auto mb-3 opacity-60" />
          <p className="text-base font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
            Tidak ada fasilitas yang ditemukan
          </p>
          <p className="text-xs text-[#717163] mt-1">
            Klik tombol "Tambah Fasilitas" untuk mendaftarkan fasilitas baru ke dalam sistem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#22221B] rounded-2xl border border-[#E5DACB] dark:border-[#38382E] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* 2 Images Preview Container */}
                <div className="h-44 bg-[#F8F5F1] dark:bg-[#191914] relative flex">
                  {item.image_url_1 ? (
                    <div className={`relative ${item.image_url_2 ? 'w-1/2' : 'w-full'} h-full border-r border-white/20`}>
                      <img
                        src={item.image_url_1}
                        alt={`${item.name} 1`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Foto 1
                      </span>
                    </div>
                  ) : null}

                  {item.image_url_2 ? (
                    <div className={`relative ${item.image_url_1 ? 'w-1/2' : 'w-full'} h-full`}>
                      <img
                        src={item.image_url_2}
                        alt={`${item.name} 2`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Foto 2
                      </span>
                    </div>
                  ) : null}

                  {!item.image_url_1 && !item.image_url_2 && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-[11px]">Belum ada foto</span>
                    </div>
                  )}

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-white/90 dark:bg-black/80 text-[#3C3C32] dark:text-[#EBE6DF] shadow-sm">
                      {item.category}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition ${
                        item.is_active
                          ? 'bg-[#889D35] text-white hover:bg-[#6E8027]'
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                    >
                      {item.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{item.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#889D35]/15 flex items-center justify-center shrink-0">
                      {renderIcon(item.icon_name)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-[#889D35] uppercase block">
                        {item.facility_code}
                      </span>
                      <h3 className="font-bold text-base text-[#3C3C32] dark:text-[#EBE6DF]">
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-[#717163] dark:text-[#A0A090] line-clamp-3 leading-relaxed">
                    {item.description || 'Tidak ada deskripsi khusus.'}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-5 pt-0 border-t border-[#E5DACB]/50 dark:border-[#38382E]/50 flex items-center justify-between gap-2 mt-2">
                <span className="text-[11px] text-[#717163]">Urutan: {item.sort_order}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 px-2.5 text-xs text-[#3C3C32] dark:text-[#EBE6DF] border-[#E5DACB]"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Ubah
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#22221B] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E5DACB] dark:border-[#38382E] animate-fadeIn max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#3C3C32] dark:text-[#EBE6DF] mb-4">
              {editingId ? 'Ubah Master Fasilitas' : 'Tambah Master Fasilitas Baru'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#3C3C32] dark:text-[#EBE6DF]">
                    Kode Fasilitas *
                  </label>
                  <Input
                    required
                    value={formData.facility_code}
                    onChange={(e) => setFormData({ ...formData, facility_code: e.target.value.toUpperCase() })}
                    placeholder="FAC-BATHTUB"
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

              {/* 2 Image URLs */}
              <div className="space-y-2 pt-1 border-t border-[#E5DACB]/50 dark:border-[#38382E]/50">
                <span className="text-xs font-bold text-[#889D35] uppercase block">
                  Galeri Foto Fasilitas (Maks. 2 Foto)
                </span>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">URL Foto 1:</label>
                  <Input
                    type="url"
                    value={formData.image_url_1}
                    onChange={(e) => setFormData({ ...formData, image_url_1: e.target.value })}
                    placeholder="https://... (Foto utama)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">URL Foto 2:</label>
                  <Input
                    type="url"
                    value={formData.image_url_2}
                    onChange={(e) => setFormData({ ...formData, image_url_2: e.target.value })}
                    placeholder="https://... (Foto sekunder)"
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
                  onClick={() => setIsModalOpen(false)}
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
                      Menyimpan...
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
  )
}
export default MasterFacilitiesPage
