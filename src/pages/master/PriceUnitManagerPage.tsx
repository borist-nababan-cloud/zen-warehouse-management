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

/**
 * Format numeric price into Indonesian Rupiah decimal format (#.#,#0 -> e.g. 12.500,00)
 */
const formatDecimalId = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

/**
 * Format live typing string with automatic '.' thousand separators and ',' decimal separator (max 2 decimals)
 */
const sanitizeAndFormatLiveDecimalId = (rawInput: string): { display: string; numeric: number } => {
  if (!rawInput) return { display: '', numeric: 0 }

  // Keep only digits and ',' (thousand '.' are stripped and re-computed automatically)
  const cleaned = rawInput.replace(/[^\d,]/g, '')
  if (!cleaned) return { display: '', numeric: 0 }

  const commaIndex = cleaned.indexOf(',')
  let intRaw = commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned
  // Strip any extra commas in the fractional part and cap at 2 decimal places
  const decRaw = commaIndex >= 0 ? cleaned.slice(commaIndex + 1).replace(/,/g, '').slice(0, 2) : ''

  // Normalize leading zeros on integer part
  intRaw = intRaw.replace(/^0+(?=\d)/, '')
  if (intRaw === '' && commaIndex >= 0) {
    intRaw = '0'
  }

  const intNumber = intRaw ? parseInt(intRaw, 10) : 0
  const formattedInt = intRaw ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(intNumber) : ''

  const display = commaIndex >= 0 ? `${formattedInt},${decRaw}` : formattedInt
  const numericStr = commaIndex >= 0 ? `${intNumber}.${decRaw || '0'}` : `${intNumber}`
  const parsed = parseFloat(numericStr)
  const numeric = isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100

  return { display, numeric }
}

// ============================================
// DECIMAL PRICE INPUT COMPONENT
// ============================================

interface DecimalPriceInputProps {
  value: number
  onChange: (newValue: number) => void
  disabled?: boolean
}

function DecimalPriceInput({ value, onChange, disabled }: DecimalPriceInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [localDisplay, setLocalDisplay] = useState<string>(() => formatDecimalId(value))

  // When not focused, always reflect the canonical 2-decimal formatted prop value (#.#,#0)
  const displayedValue = isFocused ? localDisplay : formatDecimalId(value)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    // On focus, show thousand-formatted number; if it has non-zero decimals show them, otherwise allow clean typing
    const hasDecimals = Math.round((value % 1) * 100) !== 0
    if (value === 0) {
      setLocalDisplay('')
    } else if (hasDecimals) {
      setLocalDisplay(formatDecimalId(value))
    } else {
      setLocalDisplay(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value))
    }
    requestAnimationFrame(() => {
      e.target.select()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow user to press "." on main keyboard or NumpadDecimal to insert Indonesian decimal comma ","
    if (e.key === '.' || e.code === 'NumpadDecimal') {
      e.preventDefault()
      const input = e.currentTarget
      const start = input.selectionStart ?? localDisplay.length
      const end = input.selectionEnd ?? localDisplay.length
      const currentWithoutSelection = localDisplay.slice(0, start) + localDisplay.slice(end)

      // Only insert comma if one doesn't already exist
      if (!currentWithoutSelection.includes(',')) {
        const nextRaw = localDisplay.slice(0, start) + ',' + localDisplay.slice(end)
        const { display, numeric } = sanitizeAndFormatLiveDecimalId(nextRaw)
        setLocalDisplay(display)
        onChange(numeric)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value

    // Fallback for mobile virtual keyboards where Numpad "." comes through onChange instead of onKeyDown:
    // If the user typed a "." and no "," exists yet, check if "." is not an existing thousand separator
    const prevDotCount = (localDisplay.match(/\./g) || []).length
    const currDotCount = (raw.match(/\./g) || []).length
    if (currDotCount > prevDotCount && !raw.includes(',')) {
      const lastDotIdx = raw.lastIndexOf('.')
      raw = raw.slice(0, lastDotIdx) + ',' + raw.slice(lastDotIdx + 1)
    }

    const { display, numeric } = sanitizeAndFormatLiveDecimalId(raw)
    setLocalDisplay(display)
    onChange(numeric)
  }

  const handleBlur = () => {
    setIsFocused(false)
    const rounded = Math.round((value || 0) * 100) / 100
    setLocalDisplay(formatDecimalId(rounded))
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayedValue}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={
        !disabled
          ? 'h-9 w-36 text-right font-mono text-xs'
          : 'h-9 w-36 text-right font-mono bg-muted cursor-not-allowed text-xs'
      }
      placeholder="0,00"
    />
  )
}

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
        <DecimalPriceInput
          value={editState.buy_price}
          onChange={(val) => onEditChange(item.id, 'buy_price', val)}
          disabled={!canEditItem || editState.isSaving}
        />
      </td>

      {/* Sell Price */}
      <td className="px-4 py-2 text-sm">
        <DecimalPriceInput
          value={editState.sell_price}
          onChange={(val) => onEditChange(item.id, 'sell_price', val)}
          disabled={!canEditItem || editState.isSaving}
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
              <span className="text-xs text-amber-600 font-medium mr-1">Belum Disimpan</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
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
    const existing = rowEditStates[item.id]
    // If no edit state or row is clean, dynamically use fresh data from item (refetched)
    if (!existing || (!existing.isDirty && !existing.isSaving)) {
      return initializeEditState(item)
    }
    return existing
  }

  // Handle edit change
  const handleEditChange = (barangId: number, field: keyof RowEditState, value: string | number) => {
    setRowEditStates((prev) => {
      const current = prev[barangId] || initializeEditState(items.find((i) => i.id === barangId)!)
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
    const item = items.find((i) => i.id === barangId)
    const editState = rowEditStates[barangId] || (item ? initializeEditState(item) : null)
    const userUuid = user?.id || null
    if (!editState || !editState.isDirty || !userUuid) return

    const targetOutlet = item?.kode_outlet || user?.kode_outlet || '111'

    // Set saving state
    setRowEditStates((prev) => ({
      ...prev,
      [barangId]: { ...editState, isSaving: true },
    }))

    const normalizedUom = (editState.purchase_uom || 'PCS').trim().toUpperCase()
    const roundedBuyPrice = Math.round((Number(editState.buy_price) || 0) * 100) / 100
    const roundedSellPrice = Math.round((Number(editState.sell_price) || 0) * 100) / 100
    const updateData: PriceUnitUpdateData = {
      barang_id: barangId,
      kode_outlet: targetOutlet,
      purchase_uom: normalizedUom,
      base_uom: normalizedUom,
      conversion_rate: editState.conversion_rate,
      buy_price: roundedBuyPrice,
      sell_price: roundedSellPrice,
    }

    try {
      const result = await updateMutation.mutateAsync({
        updateData,
        updatedBy: userUuid,
      })

      if (result.isSuccess) {
        // Clear rowEditStates entry for this product so next render loads fresh item data
        setRowEditStates((prev) => {
          const next = { ...prev }
          delete next[barangId]
          return next
        })
        toast.success('Harga dan satuan berhasil diperbarui')
        await refetch()
      } else {
        setRowEditStates((prev) => ({
          ...prev,
          [barangId]: {
            ...editState,
            isSaving: false,
          },
        }))
        toast.error(result.error || 'Gagal memperbarui harga dan satuan')
      }
    } catch (err: any) {
      setRowEditStates((prev) => ({
        ...prev,
        [barangId]: {
          ...editState,
          isSaving: false,
        },
      }))
      toast.error(err?.message || 'Gagal memperbarui harga dan satuan')
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
            <p>Memuat harga dan satuan...</p>
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
            <p>Gagal memuat harga dan satuan</p>
          </div>
          <Button onClick={() => refetch()}>Coba Lagi</Button>
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
              <h1 className="text-2xl font-bold">Manajemen Harga & Satuan</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Kelola harga beli, harga jual, dan konversi satuan produk
                {user?.kode_outlet && <span> (Gerai: {user.kode_outlet})</span>}
              </p>
            </div>
          </div>

          {/* Info Notice + Stats in Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Total Produk</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Gerai Pengguna</p>
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
                placeholder="Cari SKU atau nama produk..."
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted">Nama Produk</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted">Pemilik</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-24">Satuan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-24">Konversi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-36">Harga Beli</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-36">Harga Jual</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-muted w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          {searchQuery ? 'Tidak ada produk yang cocok dengan pencarian' : 'Produk tidak ditemukan'}
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
                Halaman {page + 1} dari {totalPages}
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
