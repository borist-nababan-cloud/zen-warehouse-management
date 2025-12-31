/**
 * Investigation Script - Why products not displaying for role=6, kode_outlet='109'
 *
 * This script will:
 * 1. Check current RLS policies on master_barang
 * 2. Check all products in the database
 * 3. Check what the RLS query actually returns for the user
 * 4. Test the query that the frontend makes
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function investigate() {
  try {
    await client.connect()
    console.log('=== CONNECTED TO DATABASE ===\n')

    // 1. Check ALL products in master_barang
    console.log('=== 1. ALL PRODUCTS IN MASTER_BARANG ===')
    const allProductsQuery = `
      SELECT id, sku, kode_outlet, name, id_type, deleted, created_at
      FROM public.master_barang
      ORDER BY created_at DESC;
    `
    const allProductsResult = await client.query(allProductsQuery)
    console.log(`Total products: ${allProductsResult.rows.length}`)
    allProductsResult.rows.forEach(p => {
      console.log(`  [${p.kode_outlet}] SKU: ${p.sku}, Name: ${p.name}, ID: ${p.id}, deleted: ${p.deleted}`)
    })
    console.log('')

    // 2. Check current RLS policies on master_barang
    console.log('=== 2. CURRENT RLS POLICIES ON MASTER_BARANG ===')
    const policiesQuery = `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'master_barang'
      ORDER BY policyname;
    `
    const policiesResult = await client.query(policiesQuery)
    policiesResult.rows.forEach(p => {
      console.log(`--- ${p.policyname} (${p.cmd}) ---`)
      console.log(`USING: ${p.qual}`)
      console.log(`WITH CHECK: ${p.with_check}`)
    })
    console.log('')

    // 3. Get user's auth UID
    console.log('=== 3. USER PROFILE FOR adminsunda@zenfamilyspa.id ===')
    const userQuery = `
      SELECT uid, email, user_role, kode_outlet
      FROM public.users_profile
      WHERE email = 'adminsunda@zenfamilyspa.id';
    `
    const userResult = await client.query(userQuery)
    console.log(userResult.rows)
    const userUid = userResult.rows[0]?.uid
    console.log('')

    // 4. Simulate the RLS check for role 6 (what the user should see)
    console.log('=== 4. SIMULATING RLS FILTER FOR ROLE 6 ===')
    console.log('User: role=6, kode_outlet=109')

    // This simulates what the RLS policy checks
    const rlsTestQuery = `
      SELECT
        mb.id,
        mb.sku,
        mb.kode_outlet,
        mb.name,
        up.user_role,
        up.kode_outlet as user_outlet
      FROM public.master_barang mb
      CROSS JOIN public.users_profile up
      WHERE up.uid = $1
        AND up.user_role = 6
        AND (
          up.kode_outlet = mb.kode_outlet
          OR mb.kode_outlet = '111'
        )
        AND mb.deleted = false
      ORDER BY mb.created_at DESC;
    `
    const rlsTestResult = await client.query(rlsTestQuery, [userUid])
    console.log(`Products visible to role=6, kode_outlet=109: ${rlsTestResult.rows.length}`)
    rlsTestResult.rows.forEach(p => {
      console.log(`  [${p.kode_outlet}] SKU: ${p.sku}, Name: ${p.name}`)
    })
    console.log('')

    // 5. Check if there are any products with kode_outlet='109'
    console.log('=== 5. PRODUCTS WITH KODE_OUTLET=109 ===')
    const outlet109Query = `
      SELECT id, sku, kode_outlet, name, id_type, deleted, created_at
      FROM public.master_barang
      WHERE kode_outlet = '109'
      ORDER BY created_at DESC;
    `
    const outlet109Result = await client.query(outlet109Query)
    console.log(`Products for outlet 109: ${outlet109Result.rows.length}`)
    outlet109Result.rows.forEach(p => {
      console.log(`  SKU: ${p.sku}, Name: ${p.name}, ID: ${p.id}, deleted: ${p.deleted}`)
    })
    console.log('')

    // 6. Check the service layer query (what frontend actually executes)
    console.log('=== 6. FRONTEND QUERY SIMULATION ===')
    console.log('The frontend uses Supabase which applies RLS automatically')
    console.log('Query: SELECT * FROM master_barang WHERE deleted = false ORDER BY created_at DESC')
    console.log('With RLS, this becomes filtered by the policy')
    console.log('')

    // 7. Check the exact policy that should allow role 6 to see both
    console.log('=== 7. VERIFYING RLS POLICY LOGIC ===')
    console.log('Expected policy logic for role 6:')
    console.log('  user_role IN (5, 6)')
    console.log('  AND (user.kode_outlet = product.kode_outlet OR product.kode_outlet = "111")')
    console.log('')
    console.log('For user with kode_outlet=109, this should match:')
    console.log('  - Products where kode_outlet = "109" (own outlet)')
    console.log('  - Products where kode_outlet = "111" (Holding)')
    console.log('')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
    console.log('=== DATABASE CONNECTION CLOSED ===')
  }
}

investigate()
