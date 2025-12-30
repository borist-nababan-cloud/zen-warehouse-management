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
import { HOLDING_OUTLET_CODE } from '@/types/database'
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
  const isHQManaged = item.kode_outlet === HOLDING_OUTLET_CODE && userOutletCode !== HOLDING_OUTLET_CODE

  const handleInputChange = (field: 'purchase_uom' | 'conversion_rate' | 'buy_price' | 'sell_price', value: string) => {
    if (field === 'purchase_uom') {
      onEditChange(item.id, field, value)
    } else {
      // Parse numeric values
      const numValue = parseFloat(value) || 0
      onEditChange(item.id, field, numValue)
    }
  }

  return (
    <tr className="hover:bg-muted/50 border-b">
      {/* SKU */}
      <td className="px-4 py-3 text-sm font-medium">{item.sku || '-'}</td>

      {/* Product Name */}
      <td className="px-4 py-3 text-sm">{item.name || '-'}</td>

      {/* Owner Outlet */}
      <td className="px-4 py-3 text-sm">
        {item.kode_outlet === HOLDING_OUTLET_CODE ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            HQ
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">{item.kode_outlet}</span>
        )}
      </td>

      {/* Purchase UOM */}
      <td className="px-4 py-3 text-sm">
        <Input
          value={editState.purchase_uom || ''}
          onChange={(e) => handleInputChange('purchase_uom', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-8' : 'h-8 bg-muted cursor-not-allowed'}
          placeholder="PCS"
        />
      </td>

      {/* Conversion Rate */}
      <td className="px-4 py-3 text-sm">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editState.conversion_rate || 1}
          onChange={(e) => handleInputChange('conversion_rate', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-8 w-20' : 'h-8 w-20 bg-muted cursor-not-allowed'}
        />
      </td>

      {/* Buy Price */}
      <td className="px-4 py-3 text-sm">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editState.buy_price || 0}
          onChange={(e) => handleInputChange('buy_price', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-24 w-24' : 'h-24 w-24 bg-muted cursor-not-allowed'}
          placeholder="0"
        />
      </td>

      {/* Sell Price */}
      <td className="px-4 py-3 text-sm">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editState.sell_price || 0}
          onChange={(e) => handleInputChange('sell_price', e.target.value)}
          disabled={!canEditItem || editState.isSaving}
          className={canEditItem ? 'h-24 w-24' : 'h-24 w-24 bg-muted cursor-not-allowed'}
          placeholder="0"
        />
      </td>

      {/* Status/Actions */}
      <td className="px-4 py-3 text-sm">
        {isHQManaged ? (
          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
            <Lock className="h-3 w-3" />
            HQ Managed
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {editState.isDirty && (
              <span className="text-xs text-muted-foreground">Unsaved</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onSave(item.id)}
              disabled={!editState.isDirty || editState.isSaving || !canEditItem}
            >
              {editState.isSaving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Price & Unit Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage product prices and unit conversions
                {user?.kode_outlet && <span> (Outlet: {user.kode_outlet})</span>}
              </p>
            </div>
          </div>

          {/* Info Notice */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Ownership Rules
                  </p>
                  <ul className="text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                    <li><strong>Holding (HQ):</strong> Can edit all products from all outlets</li>
                    <li><strong>Outlets:</strong> Can only edit products they created</li>
                    <li><strong>HQ Products:</strong> Marked as "HQ Managed" and read-only for outlets</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-3xl font-bold mt-1">{totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Current Page</p>
                <p className="text-3xl font-bold mt-1">{page + 1} / {totalPages || 1}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Your Outlet</p>
                <p className="text-3xl font-bold mt-1">
                  {user?.kode_outlet === HOLDING_OUTLET_CODE ? 'HQ' : user?.kode_outlet || '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU or product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Product Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Purchase UOM</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Conv. Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Buy Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Sell Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredItems.length} of {totalCount} products
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page + 1} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
