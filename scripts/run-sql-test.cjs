/**
 * Run the SQL test to verify the query returns correct results
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function runTest() {
  try {
    await client.connect()
    console.log('=== TESTING SUPABASE QUERY SIMULATION ===\n')

    const testQuery = `
SELECT
  mb.id,
  mb.sku,
  mb.kode_outlet,
  mb.name,
  mb.deleted,
  mb.created_at,
  mt.nama_type,
  mo.name_outlet
FROM public.master_barang mb
LEFT JOIN public.master_type mt ON mt.id = mb.id_type
LEFT JOIN public.master_outlet mo ON mo.kode_outlet = mb.kode_outlet
WHERE mb.deleted = false
  AND EXISTS (
    SELECT 1 FROM public.users_profile up
    WHERE up.uid = '791c7fe0-3958-4ecd-9bf7-fb00258274a5'
      AND up.user_role = 6
      AND (up.kode_outlet = mb.kode_outlet OR mb.kode_outlet = '111')
  )
ORDER BY mb.created_at DESC;
    `

    const result = await client.query(testQuery)
    console.log(`Results: ${result.rows.length} products\n`)

    result.rows.forEach(r => {
      console.log(`[${r.kode_outlet}] ${r.sku} - ${r.name}`)
      console.log(`  Type: ${r.nama_type || 'NULL'}, Outlet: ${r.name_outlet || 'NULL'}`)
    })

    console.log('\n=== SUMMARY ===')
    const outlet109 = result.rows.filter(r => r.kode_outlet === '109')
    const outlet111 = result.rows.filter(r => r.kode_outlet === '111')
    console.log(`Outlet 109: ${outlet109.length} products`)
    console.log(`Outlet 111: ${outlet111.length} products`)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

runTest()
