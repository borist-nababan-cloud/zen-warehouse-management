import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { CrmChatBox, ChatRoom } from './CrmChatBox'
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Building2, 
  CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CrmInboxOutletPage() {
  const { user } = useAuthUser()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE_WAITING') // 'ALL' | 'ACTIVE_WAITING' | 'WAITING_STAFF' | 'RESOLVED'
  const [outlets, setOutlets] = useState<{ kode_outlet: string; nama_outlet: string }[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<string>('')

  // Determine user outlet permissions (Roles 5, 8, 13 have multi-outlet access)
  const isMultiOutletRole = user?.user_role === 8 || user?.user_role === 5 || user?.user_role === 13
  const currentOutlet = useMemo(() => {
    if (isMultiOutletRole) {
      return selectedOutlet
    }
    return user?.kode_outlet || ''
  }, [user, isMultiOutletRole, selectedOutlet])

  // Fetch outlet master if multi-outlet role
  useEffect(() => {
    if (!isMultiOutletRole) return
    const fetchOutlets = async () => {
      const { data } = await supabase
        .from('master_outlet')
        .select('kode_outlet, name_outlet')
        .order('name_outlet')
      if (data) {
        setOutlets(data.map((o) => ({ kode_outlet: o.kode_outlet, nama_outlet: o.name_outlet })))
      }
    }
    fetchOutlets()
  }, [isMultiOutletRole])

  // Fetch chat rooms for this outlet
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('web_chat_rooms')
        .select('*')
        .eq('category', 'RESERVASI') // Strict isolation: only show reservation chats for outlet
        .order('last_message_at', { ascending: false })

      if (currentOutlet) {
        query = query.eq('kode_outlet', currentOutlet)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching chat rooms:', error)
        toast.error('Gagal memuat daftar chat reservasi')
      } else {
        setRooms((data as ChatRoom[]) || [])
        // Auto-select first room if none selected
        if (data && data.length > 0 && !selectedRoomId) {
          setSelectedRoomId(data[0].id)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [currentOutlet, selectedRoomId])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // Realtime subscription for room updates
  useEffect(() => {
    const channel = supabase
      .channel('crm_rooms_outlet_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'web_chat_rooms',
        },
        () => {
          fetchRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRooms])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Status filter
      if (statusFilter === 'ACTIVE_WAITING') {
        if (r.status !== 'WAITING_STAFF' && r.status !== 'ACTIVE') return false
      } else if (statusFilter === 'WAITING_STAFF') {
        if (r.status !== 'WAITING_STAFF') return false
      } else if (statusFilter === 'RESOLVED') {
        if (r.status !== 'RESOLVED') return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = r.member_name?.toLowerCase().includes(q)
        const matchPhone = r.member_phone?.toLowerCase().includes(q)
        const matchMsg = r.last_message?.toLowerCase().includes(q)
        return matchName || matchPhone || matchMsg
      }
      return true
    })
  }, [rooms, statusFilter, searchQuery])

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || null
  }, [rooms, selectedRoomId])

  const unreadCount = useMemo(() => {
    return rooms.filter((r) => r.unread_by_outlet && r.status !== 'RESOLVED').length
  }, [rooms])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-170px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-lg">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Antrean Reservasi Tamu
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {unreadCount} Baru
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pemberitahuan chat reservasi aktif terhubung ke Zen System Desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMultiOutletRole && outlets.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Semua Outlet</option>
                  {outlets.map((o) => (
                    <option key={o.kode_outlet} value={o.kode_outlet}>
                      {o.nama_outlet} ({o.kode_outlet})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRooms}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* Master-Detail Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Room List */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {/* Search and Filters */}
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari nama, nomor HP, pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Status Tabs */}
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-center">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE_WAITING')}
                  className={`text-[11px] py-1 font-medium rounded-md transition-all ${
                    statusFilter === 'ACTIVE_WAITING'
                      ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('WAITING_STAFF')}
                  className={`text-[11px] py-1 font-medium rounded-md transition-all ${
                    statusFilter === 'WAITING_STAFF'
                      ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Menunggu
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('RESOLVED')}
                  className={`text-[11px] py-1 font-medium rounded-md transition-all ${
                    statusFilter === 'RESOLVED'
                      ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Selesai
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`text-[11px] py-1 font-medium rounded-md transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredRooms.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Belum ada percakapan reservasi</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Tamu yang membuka chat di website akan muncul di sini.
                  </p>
                </div>
              ) : (
                filteredRooms.map((r) => {
                  const isSelected = r.id === selectedRoomId
                  const isWaiting = r.status === 'WAITING_STAFF'
                  const isResolved = r.status === 'RESOLVED'
                  const hasUnread = r.unread_by_outlet

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`p-3.5 cursor-pointer transition-colors relative flex items-start gap-3 ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-l-amber-600 dark:border-l-amber-500'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {r.member_name ? r.member_name.substring(0, 2) : 'TM'}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs truncate ${hasUnread ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'font-medium text-zinc-800 dark:text-zinc-200'}`}>
                            {r.member_name}
                          </span>
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            {r.last_message_at
                              ? new Date(r.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>

                        {/* Outlet Tag & Status Tag */}
                        <div className="flex items-center gap-1.5 mb-1">
                          {r.kode_outlet && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded font-mono">
                              {r.kode_outlet}
                            </span>
                          )}
                          {isWaiting ? (
                            <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 rounded font-semibold">
                              Menunggu Resepsionis
                            </span>
                          ) : isResolved ? (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded">
                              Selesai
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded">
                              Aktif
                            </span>
                          )}
                        </div>

                        {/* Snippet */}
                        <p className={`text-xs truncate ${hasUnread ? 'text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {r.last_message || 'Belum ada pesan'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Box */}
          <div className="hidden md:flex flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
            {selectedRoom ? (
              <CrmChatBox
                key={selectedRoom.id}
                room={selectedRoom}
                staffRoleType="OUTLET_STAFF"
                onRoomUpdated={fetchRooms}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Pilih Percakapan Tamu
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Pilih salah satu antrean reservasi dari panel sebelah kiri untuk mulai merespons tamu secara langsung.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
