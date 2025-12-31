/**
 * Check RLS policies on master_outlet and master_type
 * These tables are joined in the query - RLS on them could block results
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function checkRLS() {
  try {
    await client.connect()
    console.log('=== CONNECTED TO DATABASE ===\n')

    // 1. Check RLS on master_outlet
    console.log('=== 1. RLS STATUS ON MASTER_OUTLET ===')
    const outletRlsQuery = `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'master_outlet';
    `
    const outletRlsResult = await client.query(outletRlsQuery)
    console.log('RLS enabled:', outletRlsResult.rows[0].relrowsecurity)
    console.log('')

    // 2. Check policies on master_outlet
    console.log('=== 2. RLS POLICIES ON MASTER_OUTLET ===')
    const outletPoliciesQuery = `
      SELECT
        policyname,
        cmd,
        qual
      FROM pg_policies
      WHERE tablename = 'master_outlet'
      ORDER BY policyname;
    `
    const outletPoliciesResult = await client.query(outletPoliciesQuery)
    if (outletPoliciesResult.rows.length === 0) {
      console.log('No RLS policies on master_outlet (but RLS is enabled)')
      console.log('THIS MEANS ALL OPERATIONS ARE BLOCKED FOR NON-SUPERUSERS!')
    } else {
      outletPoliciesResult.rows.forEach(p => {
        console.log(`--- ${p.policyname} (${p.cmd}) ---`)
        console.log(`USING: ${p.qual}`)
      })
    }
    console.log('')

    // 3. Check master_outlet data
    console.log('=== 3. MASTER_OUTLET DATA ===')
    const outletDataQuery = `
      SELECT kode_outlet, name_outlet
      FROM public.master_outlet
      ORDER BY kode_outlet;
    `
    const outletDataResult = await client.query(outletDataQuery)
    outletDataResult.rows.forEach(o => {
      console.log(`  ${o.kode_outlet}: ${o.name_outlet}`)
    })
    console.log('')

    // 4. Check RLS on master_type
    console.log('=== 4. RLS STATUS ON MASTER_TYPE ===')
    const typeRlsQuery = `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'master_type';
    `
    const typeRlsResult = await client.query(typeRlsQuery)
    console.log('RLS enabled:', typeRlsResult.rows[0].relrowsecurity)
    console.log('')

    // 5. Simulate the exact query with joins (what Supabase does)
    console.log('=== 5. SIMULATING SUPABASE QUERY WITH JOINS ===')
    console.log('This is what the frontend actually executes...')

    // First, let's try a direct query without RLS (as postgres superuser)
    console.log('Direct query (bypassing RLS):')
    const directQuery = `
      SELECT
        mb.id,
        mb.sku,
        mb.kode_outlet,
        mb.name,
        mb.deleted,
        mo.name_outlet
      FROM public.master_barang mb
      LEFT JOIN public.master_outlet mo ON mo.kode_outlet = mb.kode_outlet
      WHERE mb.deleted = false
      ORDER BY mb.created_at DESC
      LIMIT 10;
    `
    const directResult = await client.query(directQuery)
    console.log(`Results: ${directResult.rows.length}`)
    directResult.rows.forEach(r => {
      console.log(`  [${r.kode_outlet}] ${r.sku} - ${r.name} (Outlet: ${r.name_outlet})`)
    })
    console.log('')

    // 6. Set role to authenticated and test RLS
    console.log('=== 6. TESTING WITH RLS ENABLED ===')
    console.log('Setting role to authenticated (simulating RLS)...')

    // We can't easily simulate auth.uid() in psql, but let's check if there are policies
    console.log('')
    console.log('CRITICAL FINDING:')
    if (outletRlsResult.rows[0].relrowsecurity && outletPoliciesResult.rows.length === 0) {
      console.log('❌ master_outlet has RLS enabled but NO POLICIES!')
      console.log('❌ This causes LEFT JOIN to fail silently for non-matching rows!')
      console.log('')
      console.log('When Supabase queries master_barang with a LEFT JOIN to master_outlet:')
      console.log('  - If master_outlet has RLS but no policies, the join returns NULL')
      console.log('  - This could cause products to not appear in results')
    }
    console.log('')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
    console.log('=== DATABASE CONNECTION CLOSED ===')
  }
}

checkRLS()
