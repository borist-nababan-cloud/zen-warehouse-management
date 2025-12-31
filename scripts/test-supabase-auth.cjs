/**
 * Test Supabase query with actual authentication
 * This simulates exactly what the frontend does
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bensupabase.nababancloud.com'
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjcyNTg2MCwiZXhwIjo0OTIyMzk5NDYwLCJyb2xlIjoiYW5vbiJ9.XtMrw432QPVfEinPTl2bcR6aE_PpZQe0fz77tpUCUJM'

async function testSupabaseQuery() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║   SUPABASE CLIENT TEST WITH AUTH                          ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    // Step 1: Sign in
    console.log('📝 Step 1: Signing in as adminsunda@zenfamilyspa.id...\n')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'adminsunda@zenfamilyspa.id',
      password: 'Password1!'
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      console.log('\n⚠️  Common causes:')
      console.log('   1. Wrong password')
      console.log('   2. User account disabled')
      console.log('   3. Email not confirmed')
      return
    }

    console.log('✅ Sign in successful!')
    console.log('   User:', signInData.user.email)
    console.log('   UID:', signInData.user.id)
    console.log('   Access Token:', signInData.session.access_token ? 'Present' : 'Missing')
    console.log('')

    // Step 2: Get user profile
    console.log('📝 Step 2: Fetching user profile...\n')
    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('*')
      .eq('uid', signInData.user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError)
    } else {
      console.log('✅ User profile:')
      console.log('   Role:', profile.user_role, '(6 = outlet_admin)')
      console.log('   Kode Outlet:', profile.kode_outlet)
    }
    console.log('')

    // Step 3: Query master_barang (exactly like frontend does)
    console.log('📝 Step 3: Querying master_barang (exact frontend query)...\n')
    console.log('Query:')
    console.log('  .from("master_barang")')
    console.log('  .select("*, master_type(*), master_outlet(*)")')
    console.log('  .eq("deleted", false)')
    console.log('  .order("created_at", { ascending: false })')
    console.log('')

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
      console.error('❌ Query failed!')
      console.log('   Error code:', error.code)
      console.log('   Message:', error.message)
      console.log('   Details:', error.details)
      console.log('   Hint:', error.hint)
      console.log('')
      console.log('⚠️  This is the error the frontend is encountering!')
      return
    }

    console.log('✅ Query successful!')
    console.log(`   Count: ${count}`)
    console.log(`   Data length: ${data?.length || 0}`)
    console.log('')

    // Step 4: Display results
    console.log('📝 Step 4: Products returned:\n')

    if (!data || data.length === 0) {
      console.log('❌ NO PRODUCTS RETURNED!')
      console.log('')
      console.log('⚠️  This means RLS is blocking ALL products.')
      console.log('⚠️  Possible causes:')
      console.log('   1. RLS policies are not correctly applied')
      console.log('   2. auth.uid() is not matching users_profile.uid')
      console.log('   3. User role is not matching the policy condition')
      return
    }

    data.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.kode_outlet}] ${p.sku} - ${p.name}`)
      console.log(`     Type: ${p.master_type?.nama_type || 'NULL'}`)
      console.log(`     Outlet: ${p.master_outlet?.name_outlet || 'NULL'}`)
    })
    console.log('')

    // Step 5: Analysis
    console.log('📝 Step 5: Analysis\n')
    const outlet109 = data.filter(p => p.kode_outlet === '109')
    const outlet111 = data.filter(p => p.kode_outlet === '111')

    console.log(`Outlet 109 (user's outlet): ${outlet109.length} products`)
    outlet109.forEach(p => console.log(`   - ${p.sku}: ${p.name}`))

    console.log(``)
    console.log(`Outlet 111 (Holding): ${outlet111.length} products`)
    outlet111.forEach(p => console.log(`   - ${p.sku}: ${p.name}`))

    console.log('')
    console.log('╔════════════════════════════════════════════════════════════╗')
    if (data.length === 5) {
      console.log('║   ✅ SUPABASE API: Working correctly!                       ║')
      console.log('║                                                              ║')
      console.log('║   If frontend still shows empty, the issue is:              ║')
      console.log('║   1. Frontend code not reloaded properly                    ║')
      console.log('║   2. Browser cache not cleared                             ║')
      console.log('║   3. React state not updating                              ║')
      console.log('║                                                              ║');
      console.log('║   Try:                                                       ║');
      console.log('║   1. Open browser in incognito/private mode               ║');
      console.log('║   2. Or check browser console (F12) for errors            ║');
    } else {
      console.log('║   ❌ SUPABASE API: Not returning all products               ║');
      console.log('║                                                              ║');
      console.log(`║   Expected: 5 products, Got: ${data.length} products              ║`);
    }
    console.log('╚════════════════════════════════════════════════════════════╝')

    // Sign out
    await supabase.auth.signOut()

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error.stack)
  }
}

testSupabaseQuery()
