/**
 * Price & Unit Manager Page - Master Data > Price / Satuan
 *
 * Manage product prices and unit conversions per outlet.
 *
 * Business Rules:
 * - Holding (kode_outlet='111') can edit all items
 * - Outlets can only edit items they own (master_barang.kode_outlet = their kode_outlet)
 * - Items owned by Holding show as "HQ Managed" (read-only) for outlet users
 * - Data is UPDATED, not INSERTED (triggers create rows on product creation)
 *
 * Access: Roles 1, 5, 6, 8 (admin_holding, finance, outlet_admin, superuser)
 */

import { useState } from 'react'
import { usePriceUnitsPaginated, useUpdatePriceUnit, useCanEditProduct } from '@/hooks/useBarangPriceUnit'
import { useAuthUser } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Save, Lock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { BarangPriceUnit, PriceUnitUpdateData } from '@/types/database'

// ============================================
// ROW EDIT STATE TYPE
// ============================================

interface RowEditState {
  barang_id: number
  purchase_uom: string
  conversion_rate: number
  buy_price: number
  sell_price: number
  isDirty: boolean
  isSaving: boolean
}

// ============================================
// EDITABLE ROW COMPONENT
// ============================================

interface EditableRowProps {
  item: BarangPriceUnit
  userOutletCode: string
  canEditItem: boolean
  editState: RowEditState
  onEditChange: (barangId: number, field: keyof RowEditState, value: string | number) => void
  onSave: (barangId: number) => Promise<void>
}

function EditableRow({ item, userOutletCode, canEditItem, editState, onEditChange, onSave }: EditableRowProps) {
  // If Item Outlet != User Outlet, it's "Managed by Owner" (Read Only)
  const isManagedByOwner = item.kode_outlet !== userOutletCode

  const handleInputChange = (field: keyof RowEditState, value: string) => {
    if (field === 'purchase_uom') {
      onEditChange(item.id, field, value)
    } else {
      // For numeric fields
      onEditChange(item.id, field, parseFloat(value) || 0)
    }
  }

  return (
    <tr className="hover:bg-muted/50 border-b">
      {/* SKU */}
      <td className="px-4 py-2 text-sm font-medium whitespace-nowrap">{item.sku || '-'}</td>

      {/* Product Name */}
      <td className="px-4 py-2 text-sm">{item.name || '-'}</td>

      {/* Owner Outlet */}
      <td className="px-4 py-2 text-sm whitespace-nowrap">
        {item.kode_outlet === '111' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {item.master_outlet?.name_outlet || 'HOLDING'}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">{item.master_outlet?.name_outlet || item.kode_outlet}</span>
        )}
      </td>

      {/* Purchase UOM */}
      <td className="px-4 py-2 text-sm">
        <Input
          value={editState.purchase_uom || ''}
          onChange={(e) => handleInputChange('purchase_uom', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-9 text-xs' : 'h-9 bg-muted cursor-not-allowed text-xs'}
          placeholder="PCS"
        />
      </td>

      {/* Conversion Rate */}
      <td className="px-4 py-2 text-sm">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editState.conversion_rate || 0}
          onChange={(e) => handleInputChange('conversion_rate', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-9 w-20 text-xs' : 'h-9 w-20 bg-muted cursor-not-allowed text-xs'}
        />
      </td>

      {/* Buy Price */}
      <td className="px-4 py-2 text-sm">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editState.buy_price || 0}
          onChange={(e) => handleInputChange('buy_price', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-9 w-32 text-right font-mono text-xs' : 'h-9 w-32 text-right font-mono bg-muted cursor-not-allowed text-xs'}
          placeholder="0"
        />
      </td>

      {/* Sell Price */}
      <td className="px-4 py-2 text-sm">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editState.sell_price || 0}
          onChange={(e) => handleInputChange('sell_price', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-9 w-32 text-right font-mono text-xs' : 'h-9 w-32 text-right font-mono bg-muted cursor-not-allowed text-xs'}
          placeholder="0"
        />
      </td>

      {/* Status/Actions */}
      <td className="px-4 py-2 text-sm whitespace-nowrap">
        {isManagedByOwner ? (
          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
            <Lock className="h-3 w-3" />
            Owner
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {editState.isDirty && (
              <span className="text-xs text-muted-foreground mr-1">Unsaved</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onSave(item.id)}
              disabled={!editState.isDirty || editState.isSaving || !canEditItem}
            >
              {editState.isSaving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function PriceUnitManagerPage() {
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [rowEditStates, setRowEditStates] = useState<Record<number, RowEditState>>({})

  const { user } = useAuthUser()
  const { canEdit } = useCanEditProduct(user?.kode_outlet || null)
  const updateMutation = useUpdatePriceUnit()

  // Query data
  const { data, isLoading, error, refetch } = usePriceUnitsPaginated(
    user?.kode_outlet || '',
    page,
    50
  )

  const items = data?.data || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / 50)

  // Initialize edit states when data loads
  const initializeEditState = (item: BarangPriceUnit): RowEditState => {
    return {
      barang_id: item.id,
      purchase_uom: item.barang_unit?.purchase_uom || 'PCS',
      conversion_rate: item.barang_unit?.conversion_rate || 1,
      buy_price: item.barang_price?.buy_price || 0,
      sell_price: item.barang_price?.sell_price || 0,
      isDirty: false,
      isSaving: false,
    }
  }

  // Get or create edit state for a row
  const getEditState = (item: BarangPriceUnit): RowEditState => {
    if (!rowEditStates[item.id]) {
      const initialState = initializeEditState(item)
      setRowEditStates((prev) => ({ ...prev, [item.id]: initialState }))
      return initialState
    }
    return rowEditStates[item.id]
  }

  // Handle edit change
  const handleEditChange = (barangId: number, field: keyof RowEditState, value: string | number) => {
    setRowEditStates((prev) => {
      const current = prev[barangId]
      if (!current) return prev

      return {
        ...prev,
        [barangId]: {
          ...current,
          [field]: value as never,
          isDirty: true,
        },
      }
    })
  }

  // Handle save for a row
  const handleSave = async (barangId: number) => {
    const editState = rowEditStates[barangId]
    if (!editState || !editState.isDirty || !user?.kode_outlet || !user?.email) return

    // Set saving state
    setRowEditStates((prev) => ({
      ...prev,
      [barangId]: { ...prev[barangId]!, isSaving: true },
    }))

    const updateData: PriceUnitUpdateData = {
      barang_id: barangId,
      kode_outlet: user.kode_outlet,
      purchase_uom: editState.purchase_uom,
      conversion_rate: editState.conversion_rate,
      buy_price: editState.buy_price,
      sell_price: editState.sell_price,
    }

    const result = await updateMutation.mutateAsync({
      updateData,
      updatedBy: user.email,
    })

    // Reset saving state
    setRowEditStates((prev) => ({
      ...prev,
      [barangId]: {
        ...prev[barangId]!,
        isSaving: false,
        isDirty: false,
      },
    }))

    if (result.isSuccess) {
      toast.success('Price and unit updated successfully')
      refetch()
    } else {
      toast.error(result.error || 'Failed to update price and unit')
    }
  }

  const handlePrevPage = () => {
    if (page > 0) setPage(page - 1)
  }

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage(page + 1)
  }

  // Filter items based on search
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.sku?.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <p>Loading prices and units...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load prices and units</p>
          </div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <ProtectedRoute allowedRoles={[1, 5, 6, 8]}>
      <DashboardLayout>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Price & Unit Management</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage product prices and unit conversions
                {user?.kode_outlet && <span> (Outlet: {user.kode_outlet})</span>}
              </p>
            </div>
          </div>

          {/* Info Notice + Stats in Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">


            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Outlet</p>
                <p className="text-2xl font-bold">
                  {user?.kode_outlet || '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex h-9 w-full max-w-sm items-center space-x-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Data Table */}
          <Card className="border overflow-hidden">
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto relative">
                <table className="w-full relative">
                  <thead className="bg-muted sticky top-0 z-20 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted">Product Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted">Owner</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-24">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-24">Conv</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-36">Buy Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-36">Sell Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          {searchQuery ? 'No products match your search' : 'No products found'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const canEditItem = canEdit(item.kode_outlet)
                        const editState = getEditState(item)

                        return (
                          <EditableRow
                            key={item.id}
                            item={item}
                            userOutletCode={user?.kode_outlet || ''}
                            canEditItem={canEditItem}
                            editState={editState}
                            onEditChange={handleEditChange}
                            onSave={handleSave}
                          />
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevPage}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
