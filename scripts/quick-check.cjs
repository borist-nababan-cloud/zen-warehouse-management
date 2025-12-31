/**
 * Quick diagnostic - check if there's a mismatch between expected and actual RLS policies
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function quickCheck() {
  try {
    await client.connect()

    console.log('=== CURRENT SELECT POLICIES ON MASTER_BARANG ===')
    const query = `
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'master_barang'
        AND cmd = 'SELECT'
      ORDER BY policyname;
    `
    const result = await client.query(query)
    result.rows.forEach(r => console.log(`  - ${r.policyname}`))
    console.log('')

    console.log('=== CHECK FOR OLD POLICY ===')
    const oldPolicyCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'master_barang'
          AND policyname = 'Outlet users can read own outlet products'
      ) as old_policy_exists;
    `)
    console.log(`Old policy still exists: ${oldPolicyCheck.rows[0].old_policy_exists}`)
    console.log('')

    // Count products by outlet
    console.log('=== PRODUCT COUNT BY OUTLET ===')
    const countQuery = await client.query(`
      SELECT kode_outlet, COUNT(*) as count
      FROM public.master_barang
      WHERE deleted = false
      GROUP BY kode_outlet
      ORDER BY kode_outlet;
    `)
    countQuery.rows.forEach(r => {
      console.log(`  ${r.kode_outlet}: ${r.count} products`)
    })

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

quickCheck()
