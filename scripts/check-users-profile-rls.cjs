/**
 * Check RLS policies on users_profile
 * The master_barang RLS policy queries users_profile - if there are issues here,
 * it could block the RLS from working correctly
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function checkUsersProfileRLS() {
  try {
    await client.connect()
    console.log('=== CONNECTED TO DATABASE ===\n')

    // 1. Check RLS on users_profile
    console.log('=== 1. RLS STATUS ON USERS_PROFILE ===')
    const rlsStatusQuery = `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'users_profile';
    `
    const rlsStatusResult = await client.query(rlsStatusQuery)
    console.log('RLS enabled:', rlsStatusResult.rows[0].relrowsecurity)
    console.log('')

    // 2. Check policies on users_profile
    console.log('=== 2. RLS POLICIES ON USERS_PROFILE ===')
    const policiesQuery = `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'users_profile'
      ORDER BY policyname;
    `
    const policiesResult = await client.query(policiesQuery)
    policiesResult.rows.forEach(p => {
      console.log(`--- ${p.policyname} (${p.cmd}) ---`)
      if (p.qual) console.log(`USING: ${p.qual}`)
      if (p.with_check) console.log(`WITH CHECK: ${p.with_check}`)
    })
    console.log('')

    // 3. Check users_profile data
    console.log('=== 3. USERS_PROFILE DATA ===')
    const usersDataQuery = `
      SELECT uid, email, user_role, kode_outlet
      FROM public.users_profile
      WHERE email = 'adminsunda@zenfamilyspa.id';
    `
    const usersDataResult = await client.query(usersDataQuery)
    console.log(usersDataResult.rows)
    console.log('')

    // 4. Test the RLS subquery directly
    console.log('=== 4. TEST RLS SUBQUERY (what the policy does) ===')
    const userUid = usersDataResult.rows[0].uid

    // This is what the master_barang RLS policy's EXISTS subquery does
    const rlsSubqueryTest = `
      SELECT
        mb.id,
        mb.sku,
        mb.kode_outlet,
        mb.name
      FROM public.master_barang mb
      WHERE EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.uid = $1
          AND up.user_role = 6
          AND (up.kode_outlet = mb.kode_outlet OR mb.kode_outlet = '111')
      )
        AND mb.deleted = false
      ORDER BY mb.created_at DESC;
    `
    const subqueryResult = await client.query(rlsSubqueryTest, [userUid])
    console.log(`Products matching RLS policy: ${subqueryResult.rows.length}`)
    subqueryResult.rows.forEach(p => {
      console.log(`  [${p.kode_outlet}] SKU: ${p.sku}, Name: ${p.name}`)
    })
    console.log('')

    // 5. IMPORTANT: Check if the policy is actually being used
    console.log('=== 5. VERIFY POLICY IS BEING USED ===')
    const policyCheckQuery = `
      SELECT
        policyname,
        permissive,
        roles,
        cmd
      FROM pg_policies
      WHERE tablename = 'master_barang'
        AND cmd = 'SELECT'
      ORDER BY policyname;
    `
    const policyCheckResult = await client.query(policyCheckQuery)
    policyCheckResult.rows.forEach(p => {
      console.log(`${p.policyname}:`)
      console.log(`  Permissive: ${p.permissive}`)
      console.log(`  Roles: ${p.roles}`)
      console.log(`  Command: ${p.cmd}`)
    })
    console.log('')
    console.log('NOTE: Multiple SELECT policies combine with OR logic.')
    console.log('If both policies apply, the user gets access if EITHER policy allows it.')
    console.log('')

    // 6. Check for any policy conflicts
    console.log('=== 6. CHECK FOR POLICY CONFLICTS ===')
    console.log('All SELECT policies on master_barang:')

    const allPoliciesQuery = `
      SELECT
        policyname,
        qual
      FROM pg_policies
      WHERE tablename = 'master_barang'
        AND cmd = 'SELECT'
      ORDER BY policyname;
    `
    const allPoliciesResult = await client.query(allPoliciesQuery)
    allPoliciesResult.rows.forEach(p => {
      console.log(``)
      console.log(`${p.policyname}:`)
      console.log(`  ${p.qual}`)
    })
    console.log('')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
    console.log('=== DATABASE CONNECTION CLOSED ===')
  }
}

checkUsersProfileRLS()
