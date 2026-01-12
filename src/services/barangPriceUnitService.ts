/**
 * Barang Price & Unit Service
 *
 * Service layer for product price and unit conversion management.
 * Handles fetching combined data (master_barang + barang_prices + barang_units)
 * and updating prices/units per outlet.
 *
 * Business Rules:
 * - Holding (kode_outlet='111') can edit all items
 * - Outlets can only edit items they own (master_barang.kode_outlet = outlet's kode_outlet)
 * - Items owned by Holding are read-only for outlets (HQ Managed)
 */

import { supabase } from '@/lib/supabase'
import type {
  BarangPrice,
  BarangUnit,
  BarangPriceUnit,
  ApiResponse,
  PaginatedResponse,
  PriceUnitUpdateData,
} from '@/types/database'

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Fetch products with their prices and units for a specific outlet
 * Joins master_barang, barang_prices, and barang_units
 *
 * @param kode_outlet - Outlet code to filter by
 * @param page - Page number (0-indexed)
 * @param pageSize - Items per page
 * @returns Paginated response of products with prices and units
 */
export async function getPriceUnitsPaginated(
  kode_outlet: string,
  page: number = 0,
  pageSize: number = 100
): Promise<PaginatedResponse<BarangPriceUnit>> {
  try {
    // Calculate range for pagination
    const from = page * pageSize
    const to = from + pageSize - 1

    // Fetch master_barang with pagination
    // For Price & Unit page: Only fetch products that have prices/units for this outlet
    // This is different from Product page where users see '111' + own outlet
    const { data: barangData, error: barangError, count } = await supabase
      .from('master_barang')
      .select('*, master_outlet:master_outlet!master_barang_kode_outlet_fkey(*)', { count: 'exact' })
      .eq('deleted', false)
      .eq('kode_outlet', kode_outlet)  // Only fetch products for this outlet
      .order('created_at', { ascending: false })
      .range(from, to)

    if (barangError) {
      return {
        data: null,
        error: barangError.message,
        isSuccess: false,
        count: null,
        page,
        pageSize,
      }
    }

    if (!barangData || barangData.length === 0) {
      return {
        data: [],
        error: null,
        isSuccess: true,
        count: 0,
        page,
        pageSize,
      }
    }

    // Get all barang_ids from this page
    const barangIds = barangData.map((b) => b.id)

    // Fetch barang_prices for this outlet and these products
    const { data: pricesData, error: pricesError } = await supabase
      .from('barang_prices')
      .select('*')
      .eq('kode_outlet', kode_outlet)
      .in('barang_id', barangIds)

    if (pricesError) {
      console.error('Error fetching prices:', pricesError)
    }

    // Fetch barang_units for this outlet and these products
    const { data: unitsData, error: unitsError } = await supabase
      .from('barang_units')
      .select('*')
      .eq('kode_outlet', kode_outlet)
      .in('barang_id', barangIds)

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
    }

    // Create maps for quick lookup
    const priceMap = new Map<number, BarangPrice>()
    pricesData?.forEach((price) => priceMap.set(price.barang_id, price))

    const unitMap = new Map<number, BarangUnit>()
    unitsData?.forEach((unit) => unitMap.set(unit.barang_id, unit))

    // Combine data
    const combinedData: BarangPriceUnit[] = barangData.map((barang) => ({
      ...barang,
      barang_price: priceMap.get(barang.id) || null,
      barang_unit: unitMap.get(barang.id) || null,
    }))

    return {
      data: combinedData,
      error: null,
      isSuccess: true,
      count: count || 0,
      page,
      pageSize,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      isSuccess: false,
      count: null,
      page,
      pageSize,
    }
  }
}

/**
 * Search products with prices and units
 *
 * @param kode_outlet - Outlet code
 * @param searchQuery - Search term (searches in sku, name)
 * @returns Response of matching products
 */
export async function searchPriceUnits(
  kode_outlet: string,
  searchQuery: string
): Promise<ApiResponse<BarangPriceUnit[]>> {
  try {
    // Search in master_barang for this outlet only
    // For Price & Unit page: Only search products that have prices/units for this outlet
    const { data: barangData, error: barangError } = await supabase
      .from('master_barang')
      .select('*, master_outlet:master_outlet!master_barang_kode_outlet_fkey(*)')
      .eq('kode_outlet', kode_outlet)  // Only search products for this outlet
      .or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)

    if (barangError) {
      return {
        data: null,
        error: barangError.message,
        isSuccess: false,
      }
    }

    if (!barangData || barangData.length === 0) {
      return {
        data: [],
        error: null,
        isSuccess: true,
      }
    }

    const barangIds = barangData.map((b) => b.id)

    // Fetch prices and units
    const { data: pricesData } = await supabase
      .from('barang_prices')
      .select('*')
      .eq('kode_outlet', kode_outlet)
      .in('barang_id', barangIds)

    const { data: unitsData } = await supabase
      .from('barang_units')
      .select('*')
      .eq('kode_outlet', kode_outlet)
      .in('barang_id', barangIds)

    // Combine data
    const priceMap = new Map<number, BarangPrice>()
    pricesData?.forEach((price) => priceMap.set(price.barang_id, price))

    const unitMap = new Map<number, BarangUnit>()
    unitsData?.forEach((unit) => {
      // Ensure specific typing if needed or just let inference work
      unitMap.set(unit.barang_id, unit)
    })

    const combinedData: BarangPriceUnit[] = barangData.map((barang) => ({
      ...barang,
      barang_price: priceMap.get(barang.id) || null,
      barang_unit: unitMap.get(barang.id) || null,
    }))

    return {
      data: combinedData,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      isSuccess: false,
    }
  }
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

/**
 * Update price for a product at a specific outlet
 *
 * @param barang_id - Product ID
 * @param kode_outlet - Outlet code
 * @param buy_price - New buy price
 * @param sell_price - New sell price
 * @param updated_by - User email who made the change
 */
export async function updatePrice(
  barang_id: number,
  kode_outlet: string,
  buy_price: number,
  sell_price: number,
  updated_by: string
): Promise<ApiResponse<BarangPrice>> {
  try {
    console.log('[Service] Upserting Price', { barang_id, kode_outlet })
    const { data, error } = await supabase
      .from('barang_prices')
      .upsert({
        barang_id,
        kode_outlet,
        buy_price,
        sell_price,
        updated_at: new Date().toISOString(),
        update_by: updated_by,
      }, { onConflict: 'barang_id,kode_outlet' })
      .select()

    if (error) {
      console.error('[Service] Upsert Price Error', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false,
      }
    }

    if (!data || data.length === 0) {
      return {
        data: null,
        error: 'Failed to upsert price record',
        isSuccess: false,
      }
    }

    return {
      data: data[0],
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      isSuccess: false,
    }
  }
}

/**
 * Update unit for a product at a specific outlet
 *
 * @param barang_id - Product ID
 * @param kode_outlet - Outlet code
 * @param purchase_uom - Purchase unit of measure
 * @param conversion_rate - Conversion rate
 * @param updated_by - User email who made the change
 */
export async function updateUnit(
  barang_id: number,
  kode_outlet: string,
  purchase_uom: string,
  conversion_rate: number,
  updated_by: string
): Promise<ApiResponse<BarangUnit>> {
  try {
    console.log('[Service] Upserting Unit', { barang_id, kode_outlet })
    const { data, error } = await supabase
      .from('barang_units')
      .upsert({
        barang_id,
        kode_outlet,
        purchase_uom,
        conversion_rate,
        updated_at: new Date().toISOString(),
        update_by: updated_by,
      }, { onConflict: 'barang_id,kode_outlet' })
      .select()

    if (error) {
      console.error('[Service] Upsert Unit Error', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false,
      }
    }

    if (!data || data.length === 0) {
      return {
        data: null,
        error: 'Failed to upsert unit record',
        isSuccess: false,
      }
    }

    return {
      data: data[0],
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      isSuccess: false,
    }
  }
}

/**
 * Update both price and unit for a product at a specific outlet
 *
 * @param updateData - Combined update data
 * @param updated_by - User email who made the change
 */
export async function updatePriceUnit(
  updateData: PriceUnitUpdateData,
  updated_by: string
): Promise<ApiResponse<{ price: BarangPrice | null; unit: BarangUnit | null }>> {
  try {
    const { barang_id, kode_outlet, buy_price, sell_price, purchase_uom, conversion_rate } = updateData

    // Update price if provided
    let priceResult: BarangPrice | null = null
    if (buy_price !== undefined || sell_price !== undefined) {
      const priceResponse = await updatePrice(
        barang_id,
        kode_outlet,
        buy_price ?? 0,
        sell_price ?? 0,
        updated_by
      )
      if (!priceResponse.isSuccess) {
        return {
          data: null,
          error: `Failed to update price: ${priceResponse.error}`,
          isSuccess: false,
        }
      }
      priceResult = priceResponse.data
    }

    // Update unit if provided
    let unitResult: BarangUnit | null = null
    if (purchase_uom !== undefined || conversion_rate !== undefined) {
      const unitResponse = await updateUnit(
        barang_id,
        kode_outlet,
        purchase_uom ?? 'PCS',
        conversion_rate ?? 1,
        updated_by
      )
      if (!unitResponse.isSuccess) {
        return {
          data: null,
          error: `Failed to update unit: ${unitResponse.error}`,
          isSuccess: false,
        }
      }
      unitResult = unitResponse.data
    }

    return {
      data: { price: priceResult, unit: unitResult },
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      isSuccess: false,
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user can edit a product based on ownership
 *
 * @param userOutletCode - User's outlet code
 * @param productOutletCode - Product's owner outlet code (from master_barang.kode_outlet)
 * @returns True if user can edit
 */
export function canEditProduct(userOutletCode: string, productOutletCode: string): boolean {
  // Holding ('111') can edit everything
  if (userOutletCode === '111') return true

  // Users can edit their own outlet's products
  return userOutletCode === productOutletCode
}

/**
 * Get outlet label for display
 */
export function getOutletLabel(kode_outlet: string): string {
  return kode_outlet === '111' ? 'Holding (HQ)' : kode_outlet
}
