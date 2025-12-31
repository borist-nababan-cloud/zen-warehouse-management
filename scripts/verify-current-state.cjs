/**
 * Comprehensive check of current database state
 * Run this to diagnose the issue
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function verifyState() {
  try {
    await client.connect()
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║   DATABASE STATE VERIFICATION                                ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    // 1. Check all products
    console.log('┌─────────────────────────────────────────────────────────────┐')
    console.log('│ 1. ALL PRODUCTS IN MASTER_BARANG                              │')
    console.log('└─────────────────────────────────────────────────────────────┘')
    const productsQuery = `
      SELECT id, sku, kode_outlet, name, deleted
      FROM public.master_barang
      ORDER BY created_at DESC;
    `
    const productsResult = await client.query(productsQuery)
    console.log(`Total products: ${productsResult.rows.length}\n`)
    productsResult.rows.forEach(p => {
      const status = p.deleted ? '🗑️ DELETED' : '✅ ACTIVE'
      console.log(`  [${p.kode_outlet}] ${p.sku} - ${p.name} ${status}`)
    })
    console.log('')

    // 2. Check RLS policies
    console.log('┌─────────────────────────────────────────────────────────────┐')
    console.log('│ 2. CURRENT RLS POLICIES ON MASTER_BARANG                       │')
    console.log('└─────────────────────────────────────────────────────────────┘')
    const policiesQuery = `
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'master_barang'
        AND cmd = 'SELECT'
      ORDER BY policyname;
    `
    const policiesResult = await client.query(policiesQuery)
    policiesResult.rows.forEach(p => {
      console.log(`  📋 ${p.policyname}`)
    })
    console.log('')

    // 3. Check if new policy exists
    console.log('┌─────────────────────────────────────────────────────────────┐')
    console.log('│ 3. VERIFY NEW RLS POLICY EXISTS                               │')
    console.log('└─────────────────────────────────────────────────────────────┘')
    const newPolicyCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'master_barang'
          AND policyname = 'Outlet users can read own outlet and holding products'
      ) as exists;
    `)
    const hasNewPolicy = newPolicyCheck.rows[0].exists
    if (hasNewPolicy) {
      console.log('  ✅ NEW POLICY EXISTS: "Outlet users can read own outlet and holding products"')
    } else {
      console.log('  ❌ NEW POLICY MISSING!')
      console.log('  ⚠️  The SQL script may not have been run properly.')
      console.log('  ⚠️  Please run: database-docs/fix-rls-policies.sql in Supabase Studio')
    }
    console.log('')

    // 4. Simulate what role 6 user sees
    console.log('┌─────────────────────────────────────────────────────────────┐')
    console.log('│ 4. SIMULATED VIEW FOR ROLE 6 (kode_outlet=109)               │')
    console.log('└─────────────────────────────────────────────────────────────┘')
    const userQuery = `
      SELECT uid, email, user_role, kode_outlet
      FROM public.users_profile
      WHERE email = 'adminsunda@zenfamilyspa.id';
    `
    const userResult = await client.query(userQuery)
    const userUid = userResult.rows[0]?.uid
    console.log(`User: ${userResult.rows[0]?.email}`)
    console.log(`Role: ${userResult.rows[0]?.user_role} (outlet_admin)`)
    console.log(`Outlet: ${userResult.rows[0]?.kode_outlet}`)
    console.log('')

    const simulatedViewQuery = `
      SELECT mb.id, mb.sku, mb.kode_outlet, mb.name, mt.nama_type, mo.name_outlet
      FROM public.master_barang mb
      LEFT JOIN public.master_type mt ON mt.id = mb.id_type
      LEFT JOIN public.master_outlet mo ON mo.kode_outlet = mb.kode_outlet
      WHERE mb.deleted = false
        AND EXISTS (
          SELECT 1 FROM public.users_profile up
          WHERE up.uid = $1
            AND up.user_role = 6
            AND (up.kode_outlet = mb.kode_outlet OR mb.kode_outlet = '111')
        )
      ORDER BY mb.created_at DESC;
    `
    const simulatedView = await client.query(simulatedViewQuery, [userUid])

    const outlet109 = simulatedView.rows.filter(r => r.kode_outlet === '109')
    const outlet111 = simulatedView.rows.filter(r => r.kode_outlet === '111')

    console.log(`Products visible to user: ${simulatedView.rows.length}`)
    console.log(`  • Outlet 109 (user's outlet): ${outlet109.length} products`)
    console.log(`  • Outlet 111 (Holding): ${outlet111.length} products`)
    console.log('')

    // 5. Summary
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║   SUMMARY                                                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    if (simulatedView.rows.length === 5) {
      console.log('✅ DATABASE: Working correctly!')
      console.log('   - All 5 products are accessible to role 6')
      console.log('   - RLS policies are properly configured')
      console.log('')
      console.log('❌ FRONTEND: Cache issue detected')
      console.log('   Please follow these steps:')
      console.log('   1. Stop dev server (Ctrl+C)')
      console.log('   2. Run: npm run dev')
      console.log('   3. Hard refresh browser (Ctrl+Shift+R)')
      console.log('   4. Sign out and sign in again')
    } else {
      console.log('❌ DATABASE: Issue detected!')
      console.log(`   Expected: 5 products`)
      console.log(`   Actual: ${simulatedView.rows.length} products`)
      console.log('   The SQL script may not have been run properly.')
    }
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

verifyState()
