import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/types/database'

export interface RecipeItem {
    id?: string
    recipe_id?: string
    material_barang_id: number
    qty_required: number
    uom_usage: string
    material_name?: string // Joined
    material_sku?: string // Joined
}

export interface Recipe {
    id: string
    barang_id: number
    kode_outlet: string
    description?: string
    standard_qty_output: number
    created_at?: string
    product_name?: string // Joined from master_barang
    items?: RecipeItem[]
}

export async function getRecipes(outletCode: string): Promise<ApiResponse<Recipe[]>> {
    try {
        const { data, error } = await supabase
            .from('master_recipes')
            .select(`
                *,
                master_barang ( name )
            `)
            .eq('kode_outlet', outletCode)
            .order('created_at', { ascending: false })

        if (error) throw error

        const mapped = data.map((r: any) => ({
            ...r,
            product_name: r.master_barang?.name
        }))

        return {
            data: mapped,
            error: null,
            isSuccess: true
        }
    } catch (error: any) {
        console.error('Error fetching recipes:', error)
        return {
            data: null,
            error: error.message,
            isSuccess: false
        }
    }
}

export async function getRecipeById(id: string): Promise<ApiResponse<Recipe>> {
    try {
        const { data, error } = await supabase
            .from('master_recipes')
            .select(`
                *,
                master_barang ( name ),
                master_recipe_items (
                    *,
                    master_barang ( name, sku )
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        const recipe: Recipe = {
            ...data,
            product_name: data.master_barang?.name,
            items: data.master_recipe_items.map((i: any) => ({
                ...i,
                material_name: i.master_barang?.name,
                material_sku: i.master_barang?.sku
            }))
        }

        return {
            data: recipe,
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

export interface CreateRecipeParams {
    barang_id: number
    kode_outlet: string
    description?: string
    standard_qty_output: number
    items: {
        material_barang_id: number
        qty_required: number
        uom_usage: string
    }[]
}

export async function createRecipe(params: CreateRecipeParams): Promise<ApiResponse<string>> {
    try {
        // 1. Insert Header
        const { data: header, error: headerError } = await supabase
            .from('master_recipes')
            .insert({
                barang_id: params.barang_id,
                kode_outlet: params.kode_outlet,
                description: params.description,
                standard_qty_output: params.standard_qty_output
            })
            .select()
            .single()

        if (headerError) throw headerError
        if (!header) throw new Error("Failed to create recipe header")

        // 2. Insert Items
        const itemsToInsert = params.items.map(item => ({
            recipe_id: header.id,
            material_barang_id: item.material_barang_id,
            qty_required: item.qty_required,
            uom_usage: item.uom_usage
        }))

        const { error: itemsError } = await supabase
            .from('master_recipe_items')
            .insert(itemsToInsert)

        if (itemsError) {
            // Rollback header if items fail (Best effort manual cleanup since no transaction support in client lib without RPC)
            await supabase.from('master_recipes').delete().eq('id', header.id)
            throw itemsError
        }

        return {
            data: header.id,
            error: null,
            isSuccess: true
        }

    } catch (error: any) {
        console.error('Error creating recipe:', error)
        return {
            data: null,
            error: error.message || 'Failed to create recipe',
            isSuccess: false
        }
    }
}
export interface UpdateRecipeParams extends CreateRecipeParams {
    id: string
}

export async function updateRecipe(params: UpdateRecipeParams): Promise<ApiResponse<boolean>> {
    try {
        // 1. Update Header
        const { error: headerError } = await supabase
            .from('master_recipes')
            .update({
                barang_id: params.barang_id,
                kode_outlet: params.kode_outlet,
                description: params.description,
                standard_qty_output: params.standard_qty_output
            })
            .eq('id', params.id)

        if (headerError) throw headerError

        // 2. Delete Existing Items
        const { error: deleteError } = await supabase
            .from('master_recipe_items')
            .delete()
            .eq('recipe_id', params.id)

        if (deleteError) throw deleteError

        // 3. Insert New Items
        const itemsToInsert = params.items.map(item => ({
            recipe_id: params.id,
            material_barang_id: item.material_barang_id,
            qty_required: item.qty_required,
            uom_usage: item.uom_usage
        }))

        const { error: insertError } = await supabase
            .from('master_recipe_items')
            .insert(itemsToInsert)

        if (insertError) throw insertError

        return {
            data: true,
            error: null,
            isSuccess: true
        }

    } catch (error: any) {
        console.error('Error updating recipe:', error)
        return {
            data: false,
            error: error.message || 'Failed to update recipe',
            isSuccess: false
        }
    }
}
