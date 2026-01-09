/**
 * Supplier Page - Master Data > Supplier
 *
 * CRUD operations for master_supplier table with role-based access:
 * - Roles 1, 6: Full CRUD access to own outlet's suppliers
 * - Roles 5, 8: Read-only access
 * - Strict isolation: Users can only see their own outlet's data
 */

import { useState, useEffect } from 'react'
import {
    useSuppliers,
    useCreateSupplier,
    useUpdateSupplier,
    useDeleteSupplier,
    useCanEditSuppliers,
} from '@/hooks/useSupplier'
import { useAllBanks } from '@/hooks/useBank'
import { useAuthUser } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { type MasterSupplier, type MasterSupplierWithBank, type MasterBank } from '@/types/database'
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react'

// ============================================
// FORM DIALOG COMPONENT
// ============================================

interface SupplierFormDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: Omit<MasterSupplier, 'kode_supplier' | 'created_at'>) => Promise<void>
    editingSupplier?: MasterSupplierWithBank | null
    banks: MasterBank[]
    kodeOutlet: string
    isSubmitting: boolean
}

function SupplierFormDialog({
    isOpen,
    onClose,
    onSubmit,
    editingSupplier,
    banks,
    kodeOutlet,
    isSubmitting,
}: SupplierFormDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        pic_name: '',
        kode_bank: '',
        no_rekening: '',
        nama_rekening: '',
    })

    // Reset form when editingSupplier changes or dialog opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: editingSupplier?.name || '',
                address: editingSupplier?.address || '',
                city: editingSupplier?.city || '',
                phone: editingSupplier?.phone || '',
                email: editingSupplier?.email || '',
                pic_name: editingSupplier?.pic_name || '',
                kode_bank: editingSupplier?.kode_bank || '',
                no_rekening: editingSupplier?.no_rekening || '',
                nama_rekening: editingSupplier?.nama_rekening || '',
            })
        }
    }, [isOpen, editingSupplier])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        // Prepare data
        // We need to pass all fields expected by the submit handler
        // And ensure kode_outlet is set
        const submitData = {
            ...formData,
            kode_outlet: editingSupplier ? editingSupplier.kode_outlet : kodeOutlet
        } as Omit<MasterSupplier, 'kode_supplier' | 'created_at'>

        await onSubmit(submitData)
    }

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10">
            <div className="bg-background w-full max-w-2xl rounded-lg shadow-lg p-6 my-auto">
                <h2 className="text-xl font-semibold mb-4">
                    {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Supplier Name */}
                        <div className="col-span-2">
                            <Label htmlFor="name">Supplier Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="PT. Example Supplier"
                                required
                            />
                        </div>

                        {/* Address */}
                        <div className="col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder="Address"
                            />
                        </div>

                        {/* City */}
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                placeholder="City name"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="021-xxxxxxx"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="supplier@example.com"
                            />
                        </div>

                        {/* PIC Name */}
                        <div>
                            <Label htmlFor="pic_name">PIC Name</Label>
                            <Input
                                id="pic_name"
                                value={formData.pic_name}
                                onChange={(e) => handleChange('pic_name', e.target.value)}
                                placeholder="Person in Charge"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-semibold mb-3">Bank Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Bank */}
                            <div>
                                <Label htmlFor="kode_bank">Bank</Label>
                                <select
                                    id="kode_bank"
                                    value={formData.kode_bank}
                                    onChange={(e) => handleChange('kode_bank', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Select Bank...</option>
                                    {banks.map((bank) => (
                                        <option key={bank.kode_bank} value={bank.kode_bank}>
                                            {bank.bank_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* No Rekening */}
                            <div>
                                <Label htmlFor="no_rekening">Account Number</Label>
                                <Input
                                    id="no_rekening"
                                    value={formData.no_rekening}
                                    onChange={(e) => handleChange('no_rekening', e.target.value)}
                                    placeholder="xxxx-xxxx-xxxx"
                                />
                            </div>

                            {/* Nama Rekening */}
                            <div className="col-span-2">
                                <Label htmlFor="nama_rekening">Account Name</Label>
                                <Input
                                    id="nama_rekening"
                                    value={formData.nama_rekening}
                                    onChange={(e) => handleChange('nama_rekening', e.target.value)}
                                    placeholder="Name on bank account"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t mt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editingSupplier ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function SupplierPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<MasterSupplierWithBank | null>(null)

    const { user } = useAuthUser()
    const canEdit = useCanEditSuppliers()

    // Use current user's outlet for fetching
    // If user is '111' (Holding), they see '111' data unless we add a selector
    // Per requirements: "Each user can only access to the data of their own outlet"
    // EXCEPTION: Roles 5 (Finance) and 8 (Superuser) can see ALL data
    let userOutlet = user?.kode_outlet || ''

    if (user?.user_role === 5 || user?.user_role === 8) {
        // Empty string means fetch all (subject to RLS)
        // RLS will now allow roles 5/8 to see everything
        userOutlet = ''
    } else if (user?.user_role === 1) {
        // Holding admin also sees everything usually, but let's stick to '111' or explicitly ''
        // If we want Holding to see ALL, we can set it to '' too, but usually they manage 111.
        // For now, let's keep Holding as is unless requested otherwise, but Role 5 & 8 requested explicitly.
        // Actually, Role 1 typically sees all too in this system. Let's start with just 5 & 8 as requested.
    }



    // Queries
    const { data: suppliersResponse, isLoading, error, refetch } = useSuppliers(userOutlet)
    const { data: banksResponse } = useAllBanks()

    const suppliers = suppliersResponse?.data || []
    const banks = banksResponse?.data || []

    // Mutations
    const createMutation = useCreateSupplier()
    const updateMutation = useUpdateSupplier()
    const deleteMutation = useDeleteSupplier()

    // Filter data
    const filteredData = suppliers.filter((supplier) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            supplier.name?.toLowerCase().includes(query) ||
            supplier.pic_name?.toLowerCase().includes(query) ||
            supplier.city?.toLowerCase().includes(query)
        )
    })

    // Handlers
    const handleCreate = () => {
        if (!userOutlet) {
            toast.error('No outlet assigned to your profile.')
            return
        }
        setEditingSupplier(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (supplier: MasterSupplierWithBank) => {
        setEditingSupplier(supplier)
        setIsDialogOpen(true)
    }

    const handleDelete = async (supplier: MasterSupplierWithBank) => {
        if (!confirm(`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`)) {
            return
        }

        const result = await deleteMutation.mutateAsync(supplier.kode_supplier)

        if (result.isSuccess) {
            toast.success('Supplier deleted successfully')
        } else {
            toast.error(result.error || 'Failed to delete supplier')
        }
    }

    const handleSubmit = async (formData: Omit<MasterSupplier, 'kode_supplier' | 'created_at'>) => {
        let result

        if (editingSupplier) {
            result = await updateMutation.mutateAsync({
                kode_supplier: editingSupplier.kode_supplier,
                data: formData
            })
        } else {
            result = await createMutation.mutateAsync(formData)
        }

        if (result.isSuccess) {
            toast.success(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully')
            setIsDialogOpen(false)
        } else {
            toast.error(result.error || 'Failed to save supplier')
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading suppliers...</p>
                </div>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <p className="text-destructive">Failed to load suppliers</p>
                    <Button onClick={() => refetch()}>Retry</Button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Suppliers</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage supplier data for {userOutlet === '111' ? 'Holding' : `Outlet ${userOutlet}`}
                            </p>
                        </div>
                        {canEdit && (
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Supplier
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{suppliers.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, city, or PIC..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Table */}
                    <Card className="border-pastel-blue/20 shadow-sm">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-pastel-blue/30 text-blue-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Outlet</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Bank Info</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">PIC</th>
                                            {canEdit && (
                                                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-pastel-blue/10">
                                        {filteredData.length === 0 ? (
                                            <tr>
                                                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                                                    No suppliers found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((supplier) => (
                                                <tr key={supplier.kode_supplier} className="hover:bg-pastel-blue/10 transition-colors">
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                            {supplier.kode_outlet || '111'}
                                                        </span>
                                                        {supplier.master_outlet?.name_outlet && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {supplier.master_outlet.name_outlet}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="font-medium">{supplier.name}</div>
                                                        <div className="text-xs text-muted-foreground">{supplier.city}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div>{supplier.phone || '-'}</div>
                                                        <div className="text-xs text-muted-foreground">{supplier.email}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="font-medium">{supplier.master_bank?.bank_name || '-'}</div>
                                                        <div className="text-xs text-muted-foreground">{supplier.no_rekening}</div>
                                                        <div className="text-xs text-muted-foreground italic">{supplier.nama_rekening}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {supplier.pic_name || '-'}
                                                    </td>
                                                    {canEdit && (
                                                        <td className="px-4 py-3 text-sm text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-pastel-blue/50 hover:text-blue-700"
                                                                    onClick={() => handleEdit(supplier)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-red-100 hover:text-red-700"
                                                                    onClick={() => handleDelete(supplier)}
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
                </div>

                {/* Form Dialog */}
                <SupplierFormDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSubmit={handleSubmit}
                    editingSupplier={editingSupplier}
                    banks={banks}
                    kodeOutlet={userOutlet}
                    isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
