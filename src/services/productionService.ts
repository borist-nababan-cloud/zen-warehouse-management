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
}

export async function createProductionRun(params: CreateProductionRunParams): Promise<ApiResponse<boolean>> {
    try {
        const { error } = await supabase.rpc('process_production_run', {
            p_outlet_id: params.outlet_id,
            p_date: params.date,
            p_fg_barang_id: params.fg_barang_id,
            p_qty_produced: params.qty_produced,
            p_ingredients: params.ingredients
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
            .eq('kode_outlet', kodeOutlet)
            .order('transaction_date', { ascending: false })

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
