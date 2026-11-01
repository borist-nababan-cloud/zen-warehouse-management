import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  MessageSquareQuote,
  MapPin,
  Calendar,
  Eye,
  Frown,
  Meh,
  Smile,
  Laugh,
  Angry,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'

export interface WebTestimonialItem {
  id: string
  auth_user_id: string
  member_id?: string | null
  customer_name: string
  customer_avatar?: string | null
  kode_outlet?: string | null
  rating: number // 1 to 5
  comment: string
  photo_url?: string | null
  published: boolean
  created_at: string
  update_at: string
  master_outlet?: {
    kode_outlet: string
    name_outlet: string
    city: string
  } | null
}

const SMILE_CONFIG: Record<number, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  1: {
    label: 'Sangat Kecewa',
    icon: Angry,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40'
  },
  2: {
    label: 'Kurang Puas',
    icon: Frown,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40'
  },
  3: {
    label: 'Cukup / Netral',
    icon: Meh,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40'
  },
  4: {
    label: 'Puas',
    icon: Smile,
    color: 'text-lime-600',
    bg: 'bg-lime-50 dark:bg-lime-950/30 border-lime-200 dark:border-lime-900/40'
  },
  5: {
    label: 'Sangat Puas',
    icon: Laugh,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40'
  }
}

export function UserTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<WebTestimonialItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PUBLISHED'>('ALL')

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<WebTestimonialItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load Testimonials
  const loadTestimonials = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('web_testimonials')
        .select(`
          id,
          auth_user_id,
          member_id,
          customer_name,
          customer_avatar,
          kode_outlet,
          rating,
          comment,
          photo_url,
          published,
          created_at,
          update_at,
          master_outlet (
            kode_outlet,
            name_outlet,
            city
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching testimonials:', error)
        toast.error('Gagal memuat testimoni pengunjung: ' + error.message)
      } else {
        setTestimonials((data as any) || [])
      }
    } catch (err: any) {
      console.error('Fetch exception:', err)
      toast.error('Terjadi gangguan jaringan saat memuat data testimoni.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTestimonials()
  }, [])

  // Toggle Publish Status
  const handleTogglePublish = async (item: WebTestimonialItem) => {
    const newStatus = !item.published
    try {
      const { error } = await supabase
        .from('web_testimonials')
        .update({
          published: newStatus,
          update_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error

      setTestimonials((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, published: newStatus } : t))
      )

      toast.success(
        newStatus
          ? `Testimoni dari "${item.customer_name}" telah dipublikasikan ke website!`
          : `Testimoni dari "${item.customer_name}" disembunyikan dari website.`
      )
    } catch (err: any) {
      toast.error('Gagal memperbarui status publikasi: ' + err.message)
    }
  }

  // Delete Action
  const handleDeleteClick = (item: WebTestimonialItem) => {
    setDeletingItem(item)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('web_testimonials')
        .delete()
        .eq('id', deletingItem.id)

      if (error) throw error

      toast.success(`Testimoni dari "${deletingItem.customer_name}" berhasil dihapus.`)
      setDeleteModalOpen(false)
      setDeletingItem(null)
      loadTestimonials()
    } catch (err: any) {
      toast.error('Gagal menghapus testimoni: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter List
  const filteredTestimonials = testimonials.filter((t) => {
    const matchesSearch =
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.master_outlet?.name_outlet &&
        t.master_outlet.name_outlet.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && !t.published) ||
      (statusFilter === 'PUBLISHED' && t.published)

    return matchesSearch && matchesStatus
  })

  const pendingCount = testimonials.filter((t) => !t.published).length
  const publishedCount = testimonials.filter((t) => t.published).length

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5DACB] dark:border-[#38382E] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#889D35]/15 flex items-center justify-center text-[#889D35] shrink-0">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#3C3C32] dark:text-[#EBE6DF]">
                Manajemen Testimoni Pengunjung
              </h1>
              <p className="text-xs text-[#717163] dark:text-[#A8A29E] mt-0.5">
                Kelola ulasan dan rating 5 senyum dari member resmi Zen Family Spa & Reflexology
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/20 dark:border-blue-900/40 text-blue-950 dark:text-blue-200 text-xs flex items-start gap-2.5 shadow-xs">
          <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Kebijakan Moderasi Testimoni:</span>
            <span>
              Setiap ulasan baru dari member masuk dengan status <strong>Menunggu Moderasi</strong> secara default. Aktifkan tombol toggle <strong>Published</strong> untuk menampilkannya di halaman depan website resmi Zen.
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1E1E19] p-4 rounded-xl border border-[#E5DACB] dark:border-[#38382E] shadow-xs">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className={`h-8 text-xs font-medium cursor-pointer rounded-lg ${
                statusFilter === 'ALL'
                  ? 'bg-[#889D35] text-white hover:bg-[#73852C]'
                  : 'text-[#717163] border-[#E5DACB] dark:border-[#38382E]'
              }`}
            >
              Semua ({testimonials.length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
              className={`h-8 text-xs font-medium cursor-pointer rounded-lg ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
              }`}
            >
              Menunggu Moderasi ({pendingCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'PUBLISHED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`h-8 text-xs font-medium cursor-pointer rounded-lg ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
              }`}
            >
              Sudah Tayang ({publishedCount})
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama member, outlet, ulasan..."
              className="pl-9 h-8 text-xs border-[#E5DACB] dark:border-[#38382E] bg-white dark:bg-[#25251F]"
            />
          </div>
        </div>

        {/* Testimonials Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1E1E19] rounded-xl border border-[#E5DACB] dark:border-[#38382E]">
            <Loader2 className="w-8 h-8 animate-spin text-[#889D35] mb-2" />
            <p className="text-xs text-muted-foreground">Memuat ulasan testimoni...</p>
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1E1E19] rounded-xl border border-[#E5DACB] dark:border-[#38382E] text-center p-6">
            <MessageSquareQuote className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
              Tidak Ada Testimoni Ditemukan
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {searchQuery
                ? `Tidak ada testimoni yang cocok dengan kata kunci "${searchQuery}".`
                : 'Belum ada testimoni pengunjung pada kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E1E19] rounded-xl border border-[#E5DACB] dark:border-[#38382E] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F5F1] dark:bg-[#25251F] border-b border-[#E5DACB] dark:border-[#38382E] text-[#717163] dark:text-[#A8A29E] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Foto</th>
                    <th className="py-3 px-4 w-48">Member</th>
                    <th className="py-3 px-4 w-44">Cabang Dikunjungi</th>
                    <th className="py-3 px-4 w-36">Rating Senyum</th>
                    <th className="py-3 px-4">Komentar Pengalaman</th>
                    <th className="py-3 px-4 w-32">Waktu Posting</th>
                    <th className="py-3 px-4 text-center w-28">Status Tayang</th>
                    <th className="py-3 px-4 text-right w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACB]/60 dark:divide-[#38382E]/60 text-[#3C3C32] dark:text-[#EBE6DF]">
                  {filteredTestimonials.map((item) => {
                    const smile = SMILE_CONFIG[item.rating] || SMILE_CONFIG[5]
                    const SmileIcon = smile.icon
                    const postDate = new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F8F5F1]/50 dark:hover:bg-[#25251F]/50 transition-colors"
                      >
                        {/* Foto Unggahan / Review Image */}
                        <td className="py-3 px-4 text-center">
                          {item.photo_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(item.photo_url || null)}
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#D2C0A7] bg-gray-100 hover:opacity-80 transition cursor-pointer group"
                              title="Klik untuk melihat foto ukuran penuh"
                            >
                              <img
                                src={item.photo_url}
                                alt="Foto ulasan"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-muted-foreground/50 mx-auto">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        {/* Member Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#889D35]/20 flex items-center justify-center text-xs font-bold text-[#889D35] shrink-0 border border-[#889D35]/30">
                              {item.customer_avatar ? (
                                <img
                                  src={item.customer_avatar}
                                  alt={item.customer_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                item.customer_name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-xs block text-[#3C3C32] dark:text-[#EBE6DF] truncate">
                                {item.customer_name}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-normal text-muted-foreground mt-0.5">
                                Zen Member
                              </Badge>
                            </div>
                          </div>
                        </td>

                        {/* Outlet */}
                        <td className="py-3 px-4">
                          {item.master_outlet ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-xs text-[#3C3C32] dark:text-[#EBE6DF] block flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-[#889D35] shrink-0" />
                                {item.master_outlet.name_outlet}
                              </span>
                              <span className="text-[10px] text-muted-foreground block pl-4">
                                {item.master_outlet.city}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              Cabang Umum
                            </span>
                          )}
                        </td>

                        {/* Rating 5 Smile */}
                        <td className="py-3 px-4">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${smile.bg} ${smile.color}`}
                          >
                            <SmileIcon className="w-4 h-4 shrink-0" />
                            <span>{smile.label}</span>
                          </div>
                        </td>

                        {/* Comment */}
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-xs text-[#717163] dark:text-[#A8A29E] line-clamp-3 leading-relaxed italic">
                            "{item.comment}"
                          </p>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-muted-foreground text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            {postDate}
                          </span>
                        </td>

                        {/* Toggle Published */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                              item.published
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                            }`}
                            title={item.published ? 'Klik untuk sembunyikan' : 'Klik untuk tampilkan di web'}
                          >
                            {item.published ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Tayang
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                Tertahan
                              </>
                            )}
                          </button>
                        </td>

                        {/* Delete Action */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(item)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Hapus Testimoni"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Preview Photo */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-2xl w-full bg-white dark:bg-[#1E1E19] rounded-2xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end p-2">
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
                >
                  ✕ Tutup
                </button>
              </div>
              <img
                src={previewImage}
                alt="Foto Ulasan Pengunjung"
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Modal: Confirm Delete */}
        {deleteModalOpen && deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#1E1E19] rounded-2xl border border-[#E5DACB] dark:border-[#38382E] shadow-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-destructive">
                Konfirmasi Hapus Testimoni
              </h3>
              <p className="text-xs text-[#717163] dark:text-[#A8A29E] leading-relaxed">
                Apakah Anda yakin ingin menghapus testimoni dari member{' '}
                <strong className="text-[#3C3C32] dark:text-[#EBE6DF]">
                  "{deletingItem.customer_name}"
                </strong>
                ?
                <br />
                Tindakan ini permanen dan ulasan akan segera hilang dari sistem dan website resmi.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
export default UserTestimonialsPage
