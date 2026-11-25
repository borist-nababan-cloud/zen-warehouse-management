import { supabase } from '@/lib/supabase'
import { ApiResponse, ViewReportProductionYield } from '@/types/database'
import { RecipeItem } from './recipeService'

export interface CreateProductionRunParams {
    outlet_id: string
    date: string
    fg_barang_id: number
    qty_produced: number
    ingredients: {
        barang_id: number
        qty: number
        cost: number
    }[]
    sto_order_id?: string | null
    sto_number?: string | null
}

export interface DraftStoOrderItemInfo {
    id: string
    barang_id: number
    qty_ordered: number
    sku: string
    item_name: string
}

export interface DraftStoOrderOption {
    id: string
    document_number: string
    from_outlet: string
    to_outlet: string
    to_outlet_name: string
    created_at: string
    items: DraftStoOrderItemInfo[]
}

export async function getDraftStoOrdersForProduction(
    outletCode: string
): Promise<ApiResponse<DraftStoOrderOption[]>> {
    try {
        if (!outletCode) {
            return { data: [], error: null, isSuccess: true }
        }

        const { data: orders, error: ordersError } = await supabase
            .from('sto_orders')
            .select(`
                id,
                document_number,
                from_outlet,
                to_outlet,
                created_at,
                to_master_outlet:master_outlet!sto_orders_to_outlet_fkey ( kode_outlet, name_outlet ),
                sto_items:sto_items (
                    id,
                    barang_id,
                    qty_requested,
                    master_barang ( sku, name )
                )
            `)
            .eq('from_outlet', outletCode)
            .eq('sender_status', 'DRAFT')
            .order('created_at', { ascending: false })

        if (ordersError) throw ordersError

        const mapped: DraftStoOrderOption[] = (orders || []).map((o: any) => {
            const toMo = Array.isArray(o.to_master_outlet) ? o.to_master_outlet[0] : o.to_master_outlet
            return {
                id: o.id,
                document_number: o.document_number,
                from_outlet: o.from_outlet,
                to_outlet: o.to_outlet,
                to_outlet_name: toMo?.name_outlet || o.to_outlet,
                created_at: o.created_at,
                items: (o.sto_items || []).map((it: any) => {
                    const mb = Array.isArray(it.master_barang) ? it.master_barang[0] : it.master_barang
                    return {
                        id: it.id,
                        barang_id: Number(it.barang_id),
                        qty_ordered: Number(it.qty_requested || 0),
                        sku: mb?.sku || '-',
                        item_name: mb?.name || `Barang #${it.barang_id}`,
                    }
                }),
            }
        })

        return {
            data: mapped,
            error: null,
            isSuccess: true,
        }
    } catch (error: any) {
        console.error('Error fetching draft STO orders for production:', error)
        return {
            data: [],
            error: error.message || 'Gagal memuat daftar STO DRAFT',
            isSuccess: false,
        }
    }
}

export async function createProductionRun(params: CreateProductionRunParams): Promise<ApiResponse<boolean>> {
    try {
        const { error } = await supabase.rpc('process_production_run', {
            p_outlet_id: params.outlet_id,
            p_date: params.date,
            p_fg_barang_id: params.fg_barang_id,
            p_qty_produced: params.qty_produced,
            p_ingredients: params.ingredients,
            p_sto_order_id: params.sto_order_id || null,
            p_sto_number: params.sto_number || null,
        })

        if (error) throw error

        return {
            data: true,
            error: null,
            isSuccess: true
        }
    } catch (error: any) {
        console.error('Error creating production run:', error)
        return {
            data: false,
            error: error.message || 'Failed to process production run',
            isSuccess: false
        }
    }
}

export async function getRecipeByProduct(outletCode: string, barangId: number): Promise<ApiResponse<any>> {
    try {
        const { data, error } = await supabase
            .from('master_recipes')
            .select(`
                *,
                master_recipe_items (
                    *,
                    master_barang ( name, sku )
                )
            `)
            .eq('kode_outlet', outletCode)
            .eq('barang_id', barangId)
            .single()

        if (error) {
            // It's okay if no recipe found, just return null
            if (error.code === 'PGRST116') {
                return { data: null, error: null, isSuccess: true }
            }
            throw error
        }

        return {
            data: data,
            error: null,
            isSuccess: true
        }
    } catch (error: any) {
        console.error('Error fetching recipe:', error)
        return {
            data: null,
            error: error.message,
            isSuccess: false
        }
    }
}

export async function getIngredientsWithCost(outletCode: string, ingredients: RecipeItem[]): Promise<ApiResponse<any[]>> {
    try {
        if (!ingredients || ingredients.length === 0) {
            return { data: [], error: null, isSuccess: true }
        }

        // We need to fetch current buy price for each ingredient from barang_prices
        // We can do this with a single query using 'in' filter on barang_ids
        const barangIds = ingredients.map(i => i.material_barang_id)
        
        const { data: prices, error } = await supabase
            .from('barang_prices')
            .select('barang_id, buy_price, master_barang(name, sku)')
            .eq('kode_outlet', outletCode)
            .in('barang_id', barangIds)

        if (error) throw error

        // Map ingredients to include cost
        const ingredientsWithCost = ingredients.map(item => {
            const priceInfo = prices?.find(p => p.barang_id === item.material_barang_id)
            
            // Handle array or object from join
            const mb: any = priceInfo?.master_barang
            const materialName = Array.isArray(mb) ? mb[0]?.name : mb?.name
            const materialSku = Array.isArray(mb) ? mb[0]?.sku : mb?.sku

            return {
                ...item,
                cost: priceInfo?.buy_price || 0,
                material_name: materialName || item.material_name || 'Unknown',
                material_sku: materialSku || item.material_sku || ''
            }
        })

        return {
            data: ingredientsWithCost,
            error: null,
            isSuccess: true
        }

    } catch (error: any) {
        console.error('Error fetching ingredient costs:', error)
        return {
            data: null,
            error: error.message,
            isSuccess: false
        }
    }
}

export async function getProductionYieldReport(
    kodeOutlet: string,
    startDate?: string,
    endDate?: string
): Promise<ApiResponse<ViewReportProductionYield[]>> {
    try {
        let query = supabase
            .from('view_report_production_yield')
            .select('*')
            .order('transaction_date', { ascending: false })

        if (kodeOutlet && kodeOutlet !== 'ALL') {
            query = query.eq('kode_outlet', kodeOutlet)
        }

        if (startDate) {
            query = query.gte('transaction_date', startDate)
        }

        if (endDate) {
            query = query.lte('transaction_date', endDate)
        }

        const { data, error } = await query

        if (error) throw error

        return {
            data: data as ViewReportProductionYield[],
            error: null,
            isSuccess: true
        }
    } catch (error: any) {
        console.error('Error fetching production yield report:', error)
        return {
            data: null,
            error: error.message,
            isSuccess: false
        }
    }
}
