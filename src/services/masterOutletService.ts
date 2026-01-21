
import { supabase } from '@/lib/supabase'
import { MasterOutlet, PaginatedResponse } from '@/types/database'

export const masterOutletService = {
  async getAllOutlets(filterCanSto: boolean = false) {
    let query = supabase
      .from('master_outlet')
      .select('*')
      .order('name_outlet', { ascending: true })

    if (filterCanSto) {
       // User requested: "not active= true, but use can_sto = true"
       // We only filter by can_sto = true. We do NOT filter by active.
       query = query.eq('can_sto', true)
    } else {
       // Default behavior: Active only
       query = query.eq('active', true) 
    }

    const { data, error } = await query

    if (error) throw error
    return data as MasterOutlet[]
  },

  async getOutletByCode(code: string) {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('*')
      .eq('kode_outlet', code)
      .single()

    if (error) throw error
    return data as MasterOutlet
  },

  async getAllWhOutlet() {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('*')
      .eq('can_sto', true)
      .order('name_outlet', { ascending: true })

    if (error) throw error
    return data as MasterOutlet[]
  }
}
