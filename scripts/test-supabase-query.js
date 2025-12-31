/**
 * Test the actual Supabase query as the frontend makes it
 * This will help us understand if the issue is in the Supabase client or database
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bensupabase.nababancloud.com'
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjcyNTg2MCwiZXhwIjo0OTIyMzk5NDYwLCJyb2xlIjoiYW5vbiJ9.XtMrw432QPVfEinPTl2bcR6aE_PpZQe0fz77tpUCUJM'

async function testQuery() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('=== SIGNING IN AS adminsunda@zenfamilyspa.id ===')

    // Sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'adminsunda@zenfamilyspa.id',
      password: 'Password1!' // User provided password in test
    })

    if (signInError) {
      console.error('Sign in failed:', signInError.message)
      console.log('Note: You may need to provide the correct password in the script')
      return
    }

    console.log('✅ Signed in')
    console.log('User:', signInData.user?.email)
    console.log('UID:', signInData.user?.id)
    console.log('')

    // Now test the actual query that the frontend makes
    console.log('=== TESTING ACTUAL FRONTEND QUERY ===')
    console.log('Query: supabase.from("master_barang").select("*, master_type(*), master_outlet(*)").eq("deleted", false)')

    const { data, error, count } = await supabase
      .from('master_barang')
      .select(`
        *,
        master_type:master_type(*),
        master_outlet:master_outlet(*)
      `, { count: 'exact' })
      .eq('deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Query error:', error)
      console.log('  Code:', error.code)
      console.log('  Message:', error.message)
      console.log('  Details:', error.details)
      console.log('  Hint:', error.hint)
      return
    }

    console.log(`✅ Query successful! Returned ${data?.length || 0} products (count: ${count})`)
    console.log('')

    console.log('=== PRODUCTS RETURNED ===')
    data?.forEach(p => {
      console.log(`[${p.kode_outlet}] SKU: ${p.sku}, Name: ${p.name}`)
      console.log(`  master_outlet: ${p.master_outlet?.name_outlet || 'NULL'}`)
      console.log(`  master_type: ${p.master_type?.nama_type || 'NULL'}`)
      console.log('')
    })

    console.log('=== ANALYSIS ===')
    const outlet109 = data?.filter(p => p.kode_outlet === '109') || []
    const outlet111 = data?.filter(p => p.kode_outlet === '111') || []

    console.log(`Outlet 109 products: ${outlet109.length}`)
    outlet109.forEach(p => {
      console.log(`  - ${p.sku}: ${p.name}`)
    })

    console.log(`Outlet 111 products: ${outlet111.length}`)
    outlet111.forEach(p => {
      console.log(`  - ${p.sku}: ${p.name}`)
    })

    // Sign out
    await supabase.auth.signOut()

  } catch (error) {
    console.error('Unexpected error:', error.message)
  }
}

testQuery()
