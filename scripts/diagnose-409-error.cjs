/**
 * Diagnostic Script for 409 Error Investigation
 *
 * This script investigates the master_barang table to identify:
 * 1. Existing SKUs and their patterns
 * 2. Table structure and constraints
 * 3. SKU generation trigger/function
 * 4. Potential causes of 409 Conflict errors
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function diagnose() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // 1. Check master_barang table structure
    console.log('=== 1. MASTER_BARANG TABLE STRUCTURE ===')
    const structureQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'master_barang'
      ORDER BY ordinal_position;
    `
    const structureResult = await client.query(structureQuery)
    console.log(structureResult.rows)
    console.log('')

    // 2. Check constraints
    console.log('=== 2. CONSTRAINTS ON MASTER_BARANG ===')
    const constraintQuery = `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.master_barang'::regclass
      ORDER BY conname;
    `
    const constraintResult = await client.query(constraintQuery)
    console.log(constraintResult.rows)
    console.log('')

    // 3. Check existing SKUs
    console.log('=== 3. EXISTING MASTER_BARANG DATA ===')
    const dataQuery = `
      SELECT id, sku, kode_outlet, name, id_type, deleted, created_at
      FROM public.master_barang
      ORDER BY created_at DESC
      LIMIT 20;
    `
    const dataResult = await client.query(dataQuery)
    console.log(dataResult.rows)
    console.log('')

    // 4. Check for SKU uniqueness issues
    console.log('=== 4. SKU DUPLICATE CHECK ===')
    const duplicateQuery = `
      SELECT sku, COUNT(*)
      FROM public.master_barang
      GROUP BY sku
      HAVING COUNT(*) > 1;
    `
    const duplicateResult = await client.query(duplicateQuery)
    if (duplicateResult.rows.length > 0) {
      console.log('❌ Found duplicate SKUs:', duplicateResult.rows)
    } else {
      console.log('✅ No duplicate SKUs found')
    }
    console.log('')

    // 5. Check SKU generation function
    console.log('=== 5. SKU GENERATION FUNCTION ===')
    const functionQuery = `
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname LIKE '%sku%'
      OR proname LIKE '%roman%'
      ORDER BY proname;
    `
    const functionResult = await client.query(functionQuery)
    functionResult.rows.forEach(fn => {
      console.log(`--- Function: ${fn.proname} ---`)
      console.log(fn.prosrc)
      console.log('')
    })

    // 6. Check triggers
    console.log('=== 6. TRIGGERS ON MASTER_BARANG ===')
    const triggerQuery = `
      SELECT
        tgname AS trigger_name,
        pg_get_triggerdef(oid) AS trigger_definition
      FROM pg_trigger
      WHERE tgrelid = 'public.master_barang'::regclass
      AND tgisinternal = false;
    `
    const triggerResult = await client.query(triggerQuery)
    console.log(triggerResult.rows)
    console.log('')

    // 7. Check master_outlet for kode_outlet='109'
    console.log('=== 7. MASTER_OUTLET DATA (checking for 109) ===')
    const outletQuery = `
      SELECT kode_outlet, name_outlet
      FROM public.master_outlet
      WHERE kode_outlet = '109'
      OR kode_outlet = '111';
    `
    const outletResult = await client.query(outletQuery)
    console.log(outletResult.rows)
    console.log('')

    // 8. Check users_profile for adminsunda@zenfamilyspa.id
    console.log('=== 8. USER PROFILE CHECK ===')
    const userQuery = `
      SELECT uid, email, user_role, kode_outlet
      FROM public.users_profile
      WHERE email = 'adminsunda@zenfamilyspa.id';
    `
    const userResult = await client.query(userQuery)
    console.log(userResult.rows)
    console.log('')

    // 9. Test what happens when we try to insert with kode_outlet='109'
    console.log('=== 9. TEST INSERT WITH KODE_OUTLET=109 ===')
    console.log('Attempting to insert a test product...')

    // First, get a valid id_type
    const typeQuery = `SELECT id FROM public.master_type LIMIT 1;`
    const typeResult = await client.query(typeQuery)
    const validTypeId = typeResult.rows[0]?.id

    if (validTypeId) {
      const testInsertQuery = `
        INSERT INTO public.master_barang (sku, kode_outlet, name, id_type, deleted)
        VALUES (NULL, '109', 'Test Product for Diagnosis', $1, false)
        RETURNING id, sku, kode_outlet, name;
      `
      try {
        const insertResult = await client.query(testInsertQuery, [validTypeId])
        console.log('✅ Insert successful!', insertResult.rows[0])

        // Clean up the test record
        await client.query('DELETE FROM public.master_barang WHERE id = $1', [insertResult.rows[0].id])
        console.log('✅ Test record cleaned up')
      } catch (insertError) {
        console.log('❌ Insert failed with error:')
        console.log('   Code:', insertError.code)
        console.log('   Message:', insertError.message)
        console.log('   Detail:', insertError.detail)
        console.log('   Schema:', insertError.schema)
        console.log('   Table:', insertError.table)
        console.log('   Constraint:', insertError.constraint)
      }
    } else {
      console.log('⚠️  No master_type records found - cannot test insert')
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error.message)
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

diagnose()
