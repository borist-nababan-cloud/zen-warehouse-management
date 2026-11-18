import { useState, useEffect } from 'react'
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/useCustomer'
import { useAllBanks } from '@/hooks/useBank'
import { useAuthUser } from '@/hooks/useAuth'
import { masterOutletService } from '@/services/masterOutletService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  MasterBank,
  MasterCustomer,
  MasterCustomerWithRelations,
  MasterOutlet,
} from '@/types/database'
import { Plus, Pencil, Trash2, Search, Users, Store, Loader2 } from 'lucide-react'

interface CustomerFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    data: Omit<MasterCustomer, 'kode_customer' | 'created_at' | 'update_at'>
  ) => Promise<void>
  editingCustomer?: MasterCustomerWithRelations | null
  banks: MasterBank[]
  outlets: MasterOutlet[]
  canSelectOutlet: boolean
  defaultOutlet: string
  userId: string
  isSubmitting: boolean
}

function CustomerFormDialog({
  isOpen,
  onClose,
  onSubmit,
  editingCustomer,
  banks,
  outlets,
  canSelectOutlet,
  defaultOutlet,
  userId,
  isSubmitting,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState({
    kode_outlet: defaultOutlet,
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    pic_name: '',
    pic_phone: '',
    pic_mail: '',
    kode_bank: '',
    no_rekening: '',
    nama_rekening: '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        kode_outlet: editingCustomer?.kode_outlet || defaultOutlet,
        name: editingCustomer?.name || '',
        address: editingCustomer?.address || '',
        city: editingCustomer?.city || '',
        phone: editingCustomer?.phone || '',
        email: editingCustomer?.email || '',
        pic_name: editingCustomer?.pic_name || '',
        pic_phone: editingCustomer?.pic_phone || '',
        pic_mail: editingCustomer?.pic_mail || '',
        kode_bank: editingCustomer?.kode_bank || '',
        no_rekening: editingCustomer?.no_rekening || '',
        nama_rekening: editingCustomer?.nama_rekening || '',
      })
    }
  }, [isOpen, editingCustomer, defaultOutlet])

  if (!isOpen) return null

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Nama customer wajib diisi')
      return
    }
    if (!formData.kode_outlet) {
      toast.error('Silakan pilih outlet terlebih dahulu')
      return
    }

    await onSubmit({
      kode_outlet: formData.kode_outlet,
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      pic_name: formData.pic_name.trim() || null,
      pic_phone: formData.pic_phone.trim() || null,
      pic_mail: formData.pic_mail.trim() || null,
      kode_bank: formData.kode_bank || null,
      no_rekening: formData.no_rekening.trim() || null,
      nama_rekening: formData.nama_rekening.trim() || null,
      created_by: editingCustomer ? editingCustomer.created_by : userId,
      update_by: userId,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-background border border-border w-full max-w-2xl rounded-xl shadow-lg p-6 my-auto max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-foreground mb-4">
          {editingCustomer ? 'Ubah Data Customer' : 'Tambah Customer Baru'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canSelectOutlet && !editingCustomer && (
              <div className="md:col-span-2">
                <Label htmlFor="cust_outlet">Gerai / Outlet *</Label>
                <Select
                  value={formData.kode_outlet}
                  onValueChange={(val) => handleChange('kode_outlet', val)}
                >
                  <SelectTrigger id="cust_outlet" className="mt-1.5">
                    <SelectValue placeholder="Pilih Outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.kode_outlet} value={o.kode_outlet}>
                        [{o.kode_outlet}] {o.name_outlet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="cust_name">Nama Customer / Perusahaan *</Label>
              <Input
                id="cust_name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Contoh: PT. Mitra Sejahtera"
                className="mt-1.5"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="cust_address">Alamat Lengkap</Label>
              <Input
                id="cust_address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Alamat kantor atau lokasi pengiriman"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="cust_city">Kota</Label>
              <Input
                id="cust_city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Contoh: Bandung"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="cust_phone">No. Telepon Perusahaan</Label>
              <Input
                id="cust_phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="022-xxxxxxx / 08xxxxxxxxxx"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="cust_email">Email Perusahaan</Label>
              <Input
                id="cust_email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="purchasing@customer.co.id"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Informasi PIC (Person In Charge)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pic_name">Nama PIC</Label>
                <Input
                  id="pic_name"
                  value={formData.pic_name}
                  onChange={(e) => handleChange('pic_name', e.target.value)}
                  placeholder="Nama lengkap PIC"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="pic_phone">No. HP / WA PIC</Label>
                <Input
                  id="pic_phone"
                  value={formData.pic_phone}
                  onChange={(e) => handleChange('pic_phone', e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="pic_mail">Email PIC</Label>
                <Input
                  id="pic_mail"
                  type="email"
                  value={formData.pic_mail}
                  onChange={(e) => handleChange('pic_mail', e.target.value)}
                  placeholder="pic@customer.co.id"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Informasi Rekening Bank (Opsional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cust_bank">Bank</Label>
                <select
                  id="cust_bank"
                  value={formData.kode_bank}
                  onChange={(e) => handleChange('kode_bank', e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih Bank...</option>
                  {banks.map((bank) => (
                    <option key={bank.kode_bank} value={bank.kode_bank}>
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="cust_rek">Nomor Rekening</Label>
                <Input
                  id="cust_rek"
                  value={formData.no_rekening}
                  onChange={(e) => handleChange('no_rekening', e.target.value)}
                  placeholder="xxxx-xxxx-xxxx"
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cust_nama_rek">Nama Pemilik Rekening</Label>
                <Input
                  id="cust_nama_rek"
                  value={formData.nama_rekening}
                  onChange={(e) => handleChange('nama_rekening', e.target.value)}
                  placeholder="Nama sesuai buku rekening"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCustomer ? 'Simpan Perubahan' : 'Simpan Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CustomerPage() {
  const { user } = useAuthUser()
  const roleId = Number(user?.user_role)
  const canOpenAllOutlets = [5, 8, 13].includes(roleId)
  const canEdit = [5, 6, 8, 13].includes(roleId)

  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    canOpenAllOutlets ? 'ALL' : user?.kode_outlet || ''
  )
  const [outlets, setOutlets] = useState<MasterOutlet[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<MasterCustomerWithRelations | null>(null)

  useEffect(() => {
    if (!canOpenAllOutlets && user?.kode_outlet) {
      setSelectedOutlet(user.kode_outlet)
    } else if (canOpenAllOutlets) {
      setSelectedOutlet('ALL')
      masterOutletService
        .getAllWhOutlet()
        .then(setOutlets)
        .catch((err) => console.error('Gagal memuat daftar outlet:', err))
    }
  }, [canOpenAllOutlets, user?.kode_outlet])

  const activeOutletFilter = canOpenAllOutlets ? selectedOutlet : user?.kode_outlet || ''

  const { data: customersRes, isLoading, error, refetch } = useCustomers(activeOutletFilter)
  const { data: banksRes } = useAllBanks()

  const customers = customersRes?.data || []
  const banks = banksRes?.data || []

  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const filteredData = customers.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.pic_name?.toLowerCase().includes(q) ||
      c.pic_phone?.toLowerCase().includes(q) ||
      c.pic_mail?.toLowerCase().includes(q)
    )
  })

  const handleCreate = () => {
    if (!canOpenAllOutlets && !user?.kode_outlet) {
      toast.error('Kode outlet akun Anda tidak ditemukan.')
      return
    }
    setEditingCustomer(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (customer: MasterCustomerWithRelations) => {
    setEditingCustomer(customer)
    setIsDialogOpen(true)
  }

  const handleDelete = async (customer: MasterCustomerWithRelations) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus customer "${customer.name}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return
    }

    const res = await deleteMutation.mutateAsync(customer.kode_customer)
    if (res.isSuccess) {
      toast.success('Data customer berhasil dihapus')
    } else {
      toast.error(res.error || 'Gagal menghapus data customer')
    }
  }

  const handleSubmit = async (
    formData: Omit<MasterCustomer, 'kode_customer' | 'created_at' | 'update_at'>
  ) => {
    const res = editingCustomer
      ? await updateMutation.mutateAsync({
          kode_customer: editingCustomer.kode_customer,
          data: formData,
        })
      : await createMutation.mutateAsync(formData)

    if (res.isSuccess) {
      toast.success(
        editingCustomer
          ? 'Data customer berhasil diperbarui'
          : 'Customer baru berhasil ditambahkan'
      )
      setIsDialogOpen(false)
    } else {
      toast.error(res.error || 'Gagal menyimpan data customer')
    }
  }

  const defaultModalOutlet =
    canOpenAllOutlets && selectedOutlet !== 'ALL'
      ? selectedOutlet
      : user?.kode_outlet || outlets[0]?.kode_outlet || ''

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Master Customer (B2B)</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kelola data pelanggan B2B dan kontak PIC untuk{' '}
              {canOpenAllOutlets
                ? selectedOutlet === 'ALL'
                  ? 'Semua Outlet'
                  : `Gerai ${selectedOutlet}`
                : `Gerai ${user?.kode_outlet || '-'}`}
              .
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Customer
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Customer</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredData.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama customer, kota, nama PIC, telepon PIC, atau email PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {canOpenAllOutlets && (
                <div className="w-full md:w-64">
                  <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                    <SelectTrigger>
                      <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Pilih Outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Outlet</SelectItem>
                      {outlets.map((o) => (
                        <SelectItem key={o.kode_outlet} value={o.kode_outlet}>
                          [{o.kode_outlet}] {o.name_outlet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
            <p className="text-muted-foreground">Memuat data customer...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-destructive">Gagal memuat data customer</p>
            <Button onClick={() => refetch()}>Coba Lagi</Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Gerai
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Nama Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Kontak Perusahaan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        PIC (Penanggung Jawab)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Info Rekening
                      </th>
                      {canEdit && (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canEdit ? 6 : 5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          Belum ada data customer ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((cust) => (
                        <tr key={cust.kode_customer} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {cust.kode_outlet}
                            </span>
                            {cust.master_outlet?.name_outlet && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {cust.master_outlet.name_outlet}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-semibold text-foreground">{cust.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {cust.address || '-'}
                              {cust.city ? `, ${cust.city}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>{cust.phone || '-'}</div>
                            <div className="text-xs text-muted-foreground">{cust.email || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">{cust.pic_name || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {cust.pic_phone || '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {cust.pic_mail || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">{cust.master_bank?.bank_name || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {cust.no_rekening || '-'}
                            </div>
                            <div className="text-xs text-muted-foreground italic">
                              {cust.nama_rekening || ''}
                            </div>
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Ubah Customer"
                                  onClick={() => handleEdit(cust)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Customer"
                                  onClick={() => handleDelete(cust)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <CustomerFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          editingCustomer={editingCustomer}
          banks={banks}
          outlets={outlets}
          canSelectOutlet={canOpenAllOutlets}
          defaultOutlet={defaultModalOutlet}
          userId={user?.id || ''}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </DashboardLayout>
  )
}

export default CustomerPage
