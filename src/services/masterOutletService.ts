
import { supabase } from '@/lib/supabase'
import { MasterOutlet } from '@/types/database'

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
  },

  async getOutletDetail(code: string): Promise<MasterOutlet | null> {
    const { data, error } = await supabase
      .from('master_outlet')
      .select('*, group_outlet:group_outlet!master_outlet_outlet_group_id_fkey(*)')
      .eq('kode_outlet', code)
      .maybeSingle()

    if (error) {
      console.error('Error fetching outlet detail:', error)
      throw error
    }
    return data as MasterOutlet | null
  },

  async updateOutletInfo(
    kode_outlet: string,
    payload: {
      alamat?: string | null
      city?: string | null
      province?: string | null
      no_telp?: string | null
      no_wa?: string | null
      email?: string | null
      location?: { lat: number; lng: number } | string | null
    },
    updatedBy: string
  ): Promise<{ data: MasterOutlet | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('master_outlet')
        .update({
          alamat: payload.alamat ?? null,
          city: payload.city ?? null,
          province: payload.province ?? null,
          no_telp: payload.no_telp ?? null,
          no_wa: payload.no_wa ?? null,
          email: payload.email ?? null,
          location: payload.location ?? null,
          update_by: updatedBy,
          update_at: new Date().toISOString()
        })
        .eq('kode_outlet', kode_outlet)
        .select('*, group_outlet:group_outlet!master_outlet_outlet_group_id_fkey(*)')
        .single()

      if (error) {
        console.error('Error updating outlet:', error)
        return { data: null, error: error.message }
      }

      return { data: data as MasterOutlet, error: null }
    } catch (err: any) {
      return { data: null, error: err.message || 'Gagal memperbarui data outlet' }
    }
  }
}
