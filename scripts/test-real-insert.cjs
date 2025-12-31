/**
 * Simulate the same insert that the frontend does
 * to reproduce the 409 error
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bensupabase.nababancloud.com'
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjcyNTg2MCwiZXhwIjo0OTIyMzk5NDYwLCJyb2xlIjoiYW5vbiJ9.XtMrw432QPVfEinPTl2bcR6aE_PpZQe0fz77tpUCUJM'

// Sign in as adminsunda@zenfamilyspa.id first
async function testInsert() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('=== 1. SIGNING IN AS adminsunda@zenfamilyspa.id ===')

    // First sign in to get auth context
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'adminsunda@zenfamilyspa.id',
      password: 'Password1!' // You'll need to provide the correct password
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      console.log('Note: You may need to provide the correct password')
      return
    }

    console.log('✅ Signed in successfully')
    console.log('User:', signInData.user?.email)
    console.log('UID:', signInData.user?.id)
    console.log('')

    // 2. Check master_barang first to see current state
    console.log('=== 2. CHECK EXISTING PRODUCTS FOR OUTLET 109 ===')
    const { data: existingProducts, error: queryError } = await supabase
      .from('master_barang')
      .select('*')
      .eq('kode_outlet', '109')

    if (queryError) {
      console.error('❌ Query failed:', queryError)
      console.log('  Code:', queryError.code)
      console.log('  Message:', queryError.message)
      console.log('  Details:', queryError.details)
      console.log('  Hint:', queryError.hint)
    } else {
      console.log('✅ Existing products for outlet 109:', existingProducts?.length || 0)
      existingProducts?.forEach(p => {
        console.log(`  - ID: ${p.id}, SKU: ${p.sku}, Name: ${p.name}`)
      })
    }
    console.log('')

    // 3. Attempt to insert a new product (same as frontend)
    console.log('=== 3. ATTEMPTING TO INSERT NEW PRODUCT ===')
    console.log('Insert data: { kode_outlet: "109", name: "Test Product", id_type: 1 }')

    const { data: insertData, error: insertError } = await supabase
      .from('master_barang')
      .insert({
        kode_outlet: '109',
        name: 'Test Product from Script',
        id_type: 1,
        // sku is excluded - trigger should generate it
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ INSERT FAILED - THIS IS THE 409 ERROR!')
      console.log('  Code:', insertError.code)
      console.log('  Message:', insertError.message)
      console.log('  Details:', insertError.details)
      console.log('  Hint:', insertError.hint)
      console.log('')

      // Analyze the error
      console.log('=== ERROR ANALYSIS ===')
      if (insertError.code === '23505') {
        console.log('Error 23505 = UNIQUE VIOLATION')
        console.log('This means a duplicate key was detected')
      } else if (insertError.code === '409') {
        console.log('Error 409 = CONFLICT (HTTP level)')
      }
    } else {
      console.log('✅ INSERT SUCCESSFUL!')
      console.log('Created product:', insertData)

      // Clean up
      console.log('')
      console.log('=== 4. CLEANING UP TEST DATA ===')
      const { error: deleteError } = await supabase
        .from('master_barang')
        .delete()
        .eq('id', insertData.id)

      if (deleteError) {
        console.error('❌ Cleanup failed:', deleteError.message)
      } else {
        console.log('✅ Test product deleted')
      }
    }

    // Sign out
    await supabase.auth.signOut()

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testInsert()
