/**
 * Check RLS policies that might affect the trigger
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
    console.log('✅ Connected to database\n')

    // 1. Check RLS status on users_profile
    console.log('=== 1. RLS STATUS ON USERS_PROFILE ===')
    const rlsStatusQuery = `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'users_profile';
    `
    const rlsStatusResult = await client.query(rlsStatusQuery)
    console.log('RLS enabled:', rlsStatusResult.rows[0].relrowsecurity)
    console.log('')

    // 2. Check RLS policies on users_profile
    console.log('=== 2. RLS POLICIES ON USERS_PROFILE ===')
    const policiesQuery = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'users_profile'
      ORDER BY policyname;
    `
    const policiesResult = await client.query(policiesQuery)
    console.log(policiesResult.rows)
    console.log('')

    // 3. Check if auto_generate_outlet_details has SECURITY DEFINER
    console.log('=== 3. FUNCTION SECURITY PROPERTIES ===')
    const functionSecurityQuery = `
      SELECT
        p.proname,
        p.prosecdef,
        p.proleakproof
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'auto_generate_outlet_details';
    `
    const functionSecurityResult = await client.query(functionSecurityQuery)
    console.log('prosecdef (SECURITY DEFINER):', functionSecurityResult.rows[0]?.prosecdef)
    console.log('proleakproof:', functionSecurityResult.rows[0]?.proleakproof)
    console.log('')

    // 4. Check function owner
    console.log('=== 4. FUNCTION OWNER ===')
    const functionOwnerQuery = `
      SELECT
        p.proname,
        pg_get_userbyid(p.proowner) AS owner
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'auto_generate_outlet_details';
    `
    const functionOwnerResult = await client.query(functionOwnerQuery)
    console.log(functionOwnerResult.rows)
    console.log('')

    // 5. Check RLS on barang_prices, barang_units, inventory_balance
    console.log('=== 5. RLS STATUS ON RELATED TABLES ===')
    const tablesRlsQuery = `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname IN ('barang_prices', 'barang_units', 'inventory_balance')
      ORDER BY relname;
    `
    const tablesRlsResult = await client.query(tablesRlsQuery)
    console.log(tablesRlsResult.rows)
    console.log('')

    // 6. Check RLS policies on these tables
    console.log('=== 6. RLS POLICIES ON RELATED TABLES ===')
    const relatedPoliciesQuery = `
      SELECT
        tablename,
        policyname,
        cmd
      FROM pg_policies
      WHERE tablename IN ('barang_prices', 'barang_units', 'inventory_balance')
      ORDER BY tablename, policyname;
    `
    const relatedPoliciesResult = await client.query(relatedPoliciesQuery)
    console.log(relatedPoliciesResult.rows)
    console.log('')

    // 7. Check for duplicate constraints more carefully
    console.log('=== 7. ALL CONSTRAINTS ON MASTER_BARANG ===')
    const allConstraintsQuery = `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        CASE contype
          WHEN 'c' THEN 'CHECK'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'x' THEN 'EXCLUSION'
        END AS constraint_type_name,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.master_barang'::regclass
      ORDER BY contype, conname;
    `
    const allConstraintsResult = await client.query(allConstraintsQuery)
    allConstraintsResult.rows.forEach(con => {
      console.log(`${con.constraint_name} (${con.constraint_type_name}): ${con.definition}`)
    })
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

checkRLS()
