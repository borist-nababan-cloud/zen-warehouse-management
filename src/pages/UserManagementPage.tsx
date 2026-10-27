import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  Building2,
  Briefcase,
  Hash,
  AlertTriangle,
  Clock,
  Edit3,
  BadgeCheck,
  Unlink2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

interface RoleOption {
  id: number
  role_name: string
}

interface ManageableUser {
  uid: string
  email: string
  full_name: string
  google_name?: string
  namakaryawan?: string
  avatar_url: string
  kodekaryawan?: string
  kode_outlet?: string
  name_outlet?: string
  departemen?: string
  role_user: number
  user_role: number
  role_name?: string
  approval_status: 'UNLINKED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  is_active: boolean
  rejected_reason?: string | null
  approved_at?: string | null
  created_at: string
}

export function UserManagementPage() {
  const { user: currentUser, isLoading: authLoading } = useAuthUser()
  const [users, setUsers] = useState<ManageableUser[]>([])
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [callerOutlet, setCallerOutlet] = useState<string | null>(currentUser?.kode_outlet || null)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [outletFilter, setOutletFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals state
  const [rejectingUser, setRejectingUser] = useState<ManageableUser | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editingRoleUser, setEditingRoleUser] = useState<ManageableUser | null>(null)
  const [newSelectedRole, setNewSelectedRole] = useState<number>(12)
  const [unlinkingUser, setUnlinkingUser] = useState<ManageableUser | null>(null)
  const [selectedPendingRoles, setSelectedPendingRoles] = useState<Record<string, number>>({})

  // Strict Permission Check: Only Role 8 (SUPERUSER) & Role 6 (outlet_admin)
  const isSuperuser = currentUser?.user_role === 8
  const isOutletAdmin = currentUser?.user_role === 6
  const isAllowed = isSuperuser || isOutletAdmin

  // 1. Fetch available roles dynamically from public.role_user
  const fetchRoleOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_user')
        .select('id, role_name')
        .order('id')
      if (data && !error) {
        setRoleOptions(data)
      }
    } catch (e) {
      console.warn('Error fetching roles from role_user:', e)
    }
  }

  // 2. Fetch manageable users list via RPC
  const fetchUsers = async () => {
    if (!isAllowed) return
    setLoading(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('get_manageable_users')
      if (error) {
        setFeedback({ type: 'error', message: error.message || 'Gagal mengambil data pengguna.' })
      } else if (data && data.success) {
        setCallerOutlet(data.caller_outlet)
        setUsers(data.users || [])
      } else {
        setFeedback({ type: 'error', message: data?.message || 'Gagal memuat pengguna.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAllowed) {
      fetchRoleOptions()
      fetchUsers()
    }
  }, [authLoading, currentUser?.user_role])

  // Handle Approve User (Only Role 8 can pass custom role; Role 6 always defaults to 12)
  const handleApprove = async (userItem: ManageableUser) => {
    const roleToAssign = isSuperuser ? (selectedPendingRoles[userItem.uid] || 12) : 12
    setActionLoading(userItem.uid)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('approve_user_access', {
        p_target_uid: userItem.uid,
        p_role_user: roleToAssign,
      })

      if (error) {
        setFeedback({ type: 'error', message: error.message })
        toast.error(error.message)
      } else if (data?.success) {
        setFeedback({ type: 'success', message: data.message })
        toast.success(data.message)
        await fetchUsers()
      } else {
        setFeedback({ type: 'error', message: data?.message || 'Gagal menyetujui pengguna.' })
        toast.error(data?.message || 'Gagal menyetujui pengguna.')
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Kesalahan saat menyetujui user.' })
    } finally {
      setActionLoading(null)
    }
  }

  // Handle Reject User Confirm
  const handleRejectConfirm = async () => {
    if (!rejectingUser) return
    setActionLoading(rejectingUser.uid)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('reject_user_access', {
        p_target_uid: rejectingUser.uid,
        p_reason: rejectReason.trim() || 'Ditolak oleh admin.',
      })

      if (error) {
        setFeedback({ type: 'error', message: error.message })
        toast.error(error.message)
      } else if (data?.success) {
        setFeedback({ type: 'success', message: data.message })
        toast.success(data.message)
        setRejectingUser(null)
        setRejectReason('')
        await fetchUsers()
      } else {
        setFeedback({ type: 'error', message: data?.message || 'Gagal menolak pengguna.' })
        toast.error(data?.message || 'Gagal menolak pengguna.')
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Kesalahan saat menolak user.' })
    } finally {
      setActionLoading(null)
    }
  }

  // Handle Edit Role for APPROVED User (Superuser only)
  const handleEditRoleConfirm = async () => {
    if (!editingRoleUser) return
    setActionLoading(editingRoleUser.uid)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('update_user_role', {
        p_target_uid: editingRoleUser.uid,
        p_new_role: newSelectedRole,
      })

      if (error) {
        setFeedback({ type: 'error', message: error.message })
        toast.error(error.message)
      } else if (data?.success) {
        setFeedback({ type: 'success', message: data.message })
        toast.success(data.message)
        setEditingRoleUser(null)
        await fetchUsers()
      } else {
        setFeedback({ type: 'error', message: data?.message || 'Gagal mengubah role pengguna.' })
        toast.error(data?.message || 'Gagal mengubah role pengguna.')
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Kesalahan saat mengubah role.' })
    } finally {
      setActionLoading(null)
    }
  }

  // Handle Unlink / Reset Kode Karyawan Confirm
  const handleUnlinkConfirm = async () => {
    if (!unlinkingUser) return
    setActionLoading(unlinkingUser.uid)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('unlink_employee_user', {
        p_target_uid: unlinkingUser.uid,
      })

      if (error) {
        setFeedback({ type: 'error', message: error.message })
        toast.error(error.message)
      } else if (data?.success) {
        setFeedback({ type: 'success', message: data.message })
        toast.success(data.message)
        setUnlinkingUser(null)
        await fetchUsers()
      } else {
        setFeedback({ type: 'error', message: data?.message || 'Gagal melepas tautan karyawan.' })
        toast.error(data?.message || 'Gagal melepas tautan karyawan.')
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Kesalahan saat melepas tautan user.' })
    } finally {
      setActionLoading(null)
    }
  }

  // Categorize counts
  const pendingUsers = useMemo(() => {
    return users.filter((u) => u.approval_status === 'PENDING')
  }, [users])

  const approvedUsers = useMemo(() => {
    return users.filter((u) => u.approval_status === 'APPROVED')
  }, [users])

  const linkedUsersCount = useMemo(() => {
    return users.filter((u) => !!u.kodekaryawan).length
  }, [users])

  // Unique outlets for filter
  const outletOptions = useMemo(() => {
    const outlets = new Map<string, string>()
    users.forEach((u) => {
      if (u.kode_outlet) {
        outlets.set(u.kode_outlet, u.name_outlet || u.kode_outlet)
      }
    })
    return Array.from(outlets.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [users])

  // Filtered lists
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeTab === 'pending' && u.approval_status !== 'PENDING') return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchName = u.namakaryawan?.toLowerCase().includes(query) || u.full_name?.toLowerCase().includes(query)
        const matchGoogle = u.google_name?.toLowerCase().includes(query)
        const matchEmail = u.email?.toLowerCase().includes(query)
        const matchCode = u.kodekaryawan?.toLowerCase().includes(query)
        const matchOutlet = u.kode_outlet?.toLowerCase().includes(query) || u.name_outlet?.toLowerCase().includes(query)
        if (!matchName && !matchGoogle && !matchEmail && !matchCode && !matchOutlet) return false
      }

      if (activeTab === 'all' && statusFilter !== 'all') {
        if (statusFilter === 'approved' && u.approval_status !== 'APPROVED') return false
        if (statusFilter === 'pending' && u.approval_status !== 'PENDING') return false
        if (statusFilter === 'rejected' && u.approval_status !== 'REJECTED') return false
        if (statusFilter === 'unlinked' && u.approval_status !== 'UNLINKED') return false
      }

      if (isSuperuser && outletFilter !== 'all' && u.kode_outlet !== outletFilter) {
        return false
      }

      return true
    })
  }, [users, activeTab, searchQuery, statusFilter, outletFilter, isSuperuser])

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Akses Ditolak</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Modul Manajemen Pengguna hanya dapat diakses oleh <strong>Admin Gerai (Role 6)</strong> untuk gerai masing-masing atau <strong>Superuser (Role 8)</strong>.
          </p>
          <p className="text-xs text-slate-400">
            Peran Anda saat ini: Role {currentUser?.user_role}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Scope Banner */}
        <div className="bg-gradient-to-r from-white via-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800">
                  Manajemen Pengguna & Staf
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isSuperuser
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isSuperuser ? 'SUPERUSER (Role 8)' : `ADMIN GERAI (Outlet ${callerOutlet || currentUser?.kode_outlet})`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSuperuser
                  ? 'Wewenang penuh mengelola, menyetujui, mengubah role, dan melepas tautan kode karyawan dari seluruh gerai.'
                  : `Wewenang mengelola staf khusus gerai Anda (${callerOutlet || currentUser?.kode_outlet}).`}
              </p>
            </div>
          </div>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="self-end sm:self-auto px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Menunggu Verifikasi</p>
              <p className="text-lg font-bold text-amber-600">{pendingUsers.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Staf Tertaut HRD</p>
              <p className="text-lg font-bold text-emerald-600">{linkedUsersCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total Disetujui</p>
              <p className="text-lg font-bold text-slate-800">{approvedUsers.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total Pengguna</p>
              <p className="text-lg font-bold text-slate-800">{users.length}</p>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between border animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Tabs & Search Filters */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          {/* Tab Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'pending'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-800'
                }`}
              >
                <span>Menunggu Persetujuan</span>
                {pendingUsers.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === 'pending' ? 'bg-white text-primary' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {pendingUsers.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-800'
                }`}
              >
                <span>Semua Pengguna ({users.length})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, kode, gerai..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-slate-50/50"
              />
            </div>
          </div>

          {/* Sub-Filters for All tab */}
          {activeTab === 'all' && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center mr-1">
                <Filter className="w-3 h-3 mr-1 text-primary" /> Filter:
              </span>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium text-xs outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="approved">Disetujui (Approved)</option>
                <option value="pending">Menunggu Verifikasi</option>
                <option value="rejected">Ditolak</option>
                <option value="unlinked">Belum Taut Kode</option>
              </select>

              {isSuperuser && outletOptions.length > 0 && (
                <select
                  value={outletFilter}
                  onChange={(e) => setOutletFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium text-xs outline-none"
                >
                  <option value="all">Semua Gerai ({outletOptions.length})</option>
                  {outletOptions.map(([k, name]) => (
                    <option key={k} value={k}>
                      Gerai {k} • {name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* User List */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Memuat data pengguna dari Supabase...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-14 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                {activeTab === 'pending'
                  ? 'Tidak ada antrean pengguna yang menunggu persetujuan.'
                  : 'Tidak ada pengguna yang cocok dengan kriteria pencarian.'}
              </p>
              <p className="text-xs text-slate-500">
                {activeTab === 'pending'
                  ? 'Semua permohonan staf sudah diproses atau belum ada karyawan baru yang menautkan kode.'
                  : 'Coba ubah kata kunci pencarian atau filter status Anda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const isPending = u.approval_status === 'PENDING'
                const isApproved = u.approval_status === 'APPROVED'
                const isRejected = u.approval_status === 'REJECTED'
                const isUnlinked = u.approval_status === 'UNLINKED'
                const isActionRunning = actionLoading === u.uid

                const primaryName = u.namakaryawan || u.full_name || u.email
                const hasOfficialName = !!u.namakaryawan

                return (
                  <div
                    key={u.uid}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isPending
                        ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                        : 'bg-white hover:bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* User Identity Column */}
                      <div className="flex items-start space-x-3.5 min-w-0">
                        <div className="relative shrink-0">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={primaryName}
                              className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center">
                              {primaryName?.slice(0, 2).toUpperCase() || 'ST'}
                            </div>
                          )}
                          <div
                            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-neutral-400'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-800 truncate flex items-center">
                              {primaryName}
                              {hasOfficialName && (
                                <span title="Terverifikasi HRD" className="inline-flex items-center">
                                  <BadgeCheck className="w-4 h-4 text-emerald-600 ml-1 shrink-0" />
                                </span>
                              )}
                            </h3>

                            {/* Status Badge */}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Menunggu Verifikasi
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Disetujui
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                Ditolak
                              </span>
                            )}
                            {isUnlinked && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-sand/25 text-zen-charcoal/80 border border-zen-border">
                                Terdaftar WHM
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {hasOfficialName && u.google_name && u.google_name !== u.namakaryawan ? (
                              <span>Akun Google: <strong className="font-medium text-slate-700">{u.google_name}</strong> • {u.email}</span>
                            ) : (
                              <span>{u.email}</span>
                            )}
                          </p>

                          {/* Metadata chips */}
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-600">
                            {u.kodekaryawan && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-mono font-semibold text-slate-700 flex items-center">
                                <Hash className="w-2.5 h-2.5 mr-1" />
                                {u.kodekaryawan}
                              </span>
                            )}

                            {u.kode_outlet ? (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-medium flex items-center">
                                <Building2 className="w-2.5 h-2.5 mr-1 text-primary" />
                                Gerai {u.kode_outlet} {u.name_outlet ? `• ${u.name_outlet}` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-medium text-slate-400 flex items-center">
                                <Building2 className="w-2.5 h-2.5 mr-1" />
                                Pusat / Holding
                              </span>
                            )}

                            {u.departemen && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-medium flex items-center">
                                <Briefcase className="w-2.5 h-2.5 mr-1" />
                                {u.departemen}
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold flex items-center">
                              <Shield className="w-2.5 h-2.5 mr-1" />
                              Role {u.user_role || u.role_user} ({u.role_name || 'Staff'})
                            </span>
                          </div>

                          {u.rejected_reason && isRejected && (
                            <p className="text-[11px] text-red-600 mt-1 italic">
                              Alasan: "{u.rejected_reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {isPending ? (
                          <>
                            {isSuperuser ? (
                              <div className="flex items-center space-x-1">
                                <span className="text-[11px] text-slate-500 hidden sm:inline">
                                  Beri Role:
                                </span>
                                <select
                                  value={selectedPendingRoles[u.uid] || 12}
                                  onChange={(e) =>
                                    setSelectedPendingRoles({
                                      ...selectedPendingRoles,
                                      [u.uid]: Number(e.target.value),
                                    })
                                  }
                                  disabled={isActionRunning}
                                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 outline-none focus:border-primary"
                                >
                                  {roleOptions.length > 0 ? (
                                    roleOptions.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.id} - {r.role_name}
                                      </option>
                                    ))
                                  ) : (
                                    <>
                                      <option value={12}>12 - operational_staff</option>
                                      <option value={11}>11 - THERAPIST</option>
                                      <option value={6}>6 - outlet_admin</option>
                                      <option value={7}>7 - gudang_outlet</option>
                                      <option value={10}>10 - finance_outlet</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                Role 12 (Staf Operasional)
                              </span>
                            )}

                            <button
                              onClick={() => handleApprove(u)}
                              disabled={isActionRunning}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-all flex items-center space-x-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingUser(u)
                                setRejectReason('')
                              }}
                              disabled={isActionRunning}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs transition-all flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>

                            {/* Superuser can also directly change role on pending user */}
                            {isSuperuser && (
                              <button
                                onClick={() => {
                                  setEditingRoleUser(u)
                                  setNewSelectedRole(u.user_role || u.role_user || 12)
                                }}
                                disabled={isActionRunning}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-zen-sand/20 hover:bg-zen-sand/40 text-zen-charcoal border border-zen-border transition-all shadow-xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-zen-moss" />
                                <span>Ubah Role</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Superuser (Role 8): Always show Ubah Role button even without kode_karyawan */}
                            {isSuperuser && (
                              <button
                                onClick={() => {
                                  setEditingRoleUser(u)
                                  setNewSelectedRole(u.user_role || u.role_user || 12)
                                }}
                                disabled={isActionRunning}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-zen-sand/20 hover:bg-zen-sand/40 text-zen-charcoal border border-zen-border transition-all shadow-xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-zen-moss" />
                                <span>Ubah Role</span>
                              </button>
                            )}

                            {u.kodekaryawan && (
                              <button
                                onClick={() => setUnlinkingUser(u)}
                                disabled={isActionRunning}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all"
                                title="Lepas tautan kode karyawan agar staf dapat menautkan kode baru"
                              >
                                <Unlink2 className="w-3 h-3" />
                                <span>Lepas Tautan</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Edit Role Modal (SUPERUSER only) */}
        {editingRoleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 text-primary">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Ubah Role Pengguna
                  </h3>
                  <p className="text-[11px] text-slate-500">Pilih role baru dari tabel master role_user</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nama Staf:</span>
                  <span className="font-bold text-slate-800">
                    {editingRoleUser.namakaryawan || editingRoleUser.full_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[220px]">
                    {editingRoleUser.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gerai / Lokasi:</span>
                  <span className="font-medium text-slate-800">
                    {editingRoleUser.kode_outlet ? `Gerai ${editingRoleUser.kode_outlet} ${editingRoleUser.name_outlet ? `• ${editingRoleUser.name_outlet}` : ''}` : 'Pusat / Holding'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Role Saat Ini:</span>
                  <span className="font-bold text-primary">
                    Role {editingRoleUser.user_role || editingRoleUser.role_user} ({editingRoleUser.role_name || 'Staff'})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Role Baru:
                </label>
                <select
                  value={newSelectedRole}
                  onChange={(e) => setNewSelectedRole(Number(e.target.value))}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-slate-50"
                >
                  {roleOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      Role {r.id} - {r.role_name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Daftar role dibaca langsung secara dinamis dari tabel database <code>public.role_user</code>.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setEditingRoleUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleEditRoleConfirm}
                  disabled={actionLoading === editingRoleUser.uid}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs"
                >
                  {actionLoading === editingRoleUser.uid ? 'Menyimpan...' : 'Simpan Role Baru'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unlink / Reset Kode Karyawan Modal */}
        {unlinkingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 text-amber-600">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <Unlink2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Lepas Tautan Kode Karyawan
                  </h3>
                  <p className="text-[11px] text-slate-500">Reset kode karyawan agar dapat ditautkan ulang</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan melepas tautan kode karyawan <strong>{unlinkingUser.kodekaryawan}</strong> dari akun{' '}
                <strong>{unlinkingUser.namakaryawan || unlinkingUser.full_name}</strong> ({unlinkingUser.email}).
              </p>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1 leading-relaxed">
                <p className="font-bold flex items-center">
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-700" />
                  Dampak Aksi Ini:
                </p>
                <p>• Kode karyawan <strong>{unlinkingUser.kodekaryawan}</strong> seketika bebas di database dan dapat digunakan oleh karyawan yang berhak.</p>
                <p>• Akun staf ini akan dikembalikan ke status <code>UNLINKED</code>, sehingga saat login berikutnya staf akan diminta memasukkan kode yang benar.</p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setUnlinkingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleUnlinkConfirm}
                  disabled={actionLoading === unlinkingUser.uid}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                >
                  {actionLoading === unlinkingUser.uid ? 'Memproses...' : 'Ya, Lepas Tautan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 text-red-600">
                <div className="p-2 rounded-xl bg-red-100">
                  <UserX className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Tolak Akses Karyawan
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan menolak pengajuan akun <strong>{rejectingUser.namakaryawan || rejectingUser.full_name}</strong> (Kode:{' '}
                {rejectingUser.kodekaryawan || '-'}). Pengguna akan menerima notifikasi alasan penolakan.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan (Opsional):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Bukan staf dari gerai ini, atau silakan hubungi HRD untuk perbaikan data."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none bg-slate-50 resize-none h-20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setRejectingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={actionLoading === rejectingUser.uid}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                >
                  {actionLoading === rejectingUser.uid ? 'Memproses...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
