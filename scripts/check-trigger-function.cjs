/**
 * Check the auto_generate_outlet_details() function
 * to understand what it does and why it might cause 409 errors
 */

const { Client } = require('pg')

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  database: 'postgres',
})

async function checkTriggerFunction() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // 1. Get the function source
    console.log('=== 1. AUTO_GENERATE_OUTLET_DETAILS FUNCTION ===')
    const functionQuery = `
      SELECT prosrc
      FROM pg_proc
      WHERE proname = 'auto_generate_outlet_details';
    `
    const functionResult = await client.query(functionQuery)
    if (functionResult.rows.length > 0) {
      console.log(functionResult.rows[0].prosrc)
    } else {
      console.log('❌ Function not found')
    }
    console.log('')

    // 2. Check inventory_balance table structure
    console.log('=== 2. INVENTORY_BALANCE TABLE STRUCTURE ===')
    const inventoryQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'inventory_balance'
      ORDER BY ordinal_position;
    `
    const inventoryResult = await client.query(inventoryQuery)
    console.log(inventoryResult.rows)
    console.log('')

    // 3. Check barang_prices table structure
    console.log('=== 3. BARANG_PRICES TABLE STRUCTURE ===')
    const pricesQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'barang_prices'
      ORDER BY ordinal_position;
    `
    const pricesResult = await client.query(pricesQuery)
    console.log(pricesResult.rows)
    console.log('')

    // 4. Check barang_units table structure
    console.log('=== 4. BARANG_UNITS TABLE STRUCTURE ===')
    const unitsQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'barang_units'
      ORDER BY ordinal_position;
    `
    const unitsResult = await client.query(unitsQuery)
    console.log(unitsResult.rows)
    console.log('')

    // 5. Check existing barang_prices data
    console.log('=== 5. EXISTING BARANG_PRICES DATA ===')
    const pricesDataQuery = `
      SELECT * FROM public.barang_prices ORDER BY id DESC LIMIT 10;
    `
    const pricesDataResult = await client.query(pricesDataQuery)
    console.log(pricesDataResult.rows)
    console.log('')

    // 6. Check existing barang_units data
    console.log('=== 6. EXISTING BARANG_UNITS DATA ===')
    const unitsDataQuery = `
      SELECT * FROM public.barang_units ORDER BY id DESC LIMIT 10;
    `
    const unitsDataResult = await client.query(unitsDataQuery)
    console.log(unitsDataResult.rows)
    console.log('')

    // 7. Check constraints on barang_prices
    console.log('=== 7. CONSTRAINTS ON BARANG_PRICES ===')
    const pricesConstraintQuery = `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.barang_prices'::regclass
      ORDER BY conname;
    `
    const pricesConstraintResult = await client.query(pricesConstraintQuery)
    console.log(pricesConstraintResult.rows)
    console.log('')

    // 8. Check constraints on barang_units
    console.log('=== 8. CONSTRAINTS ON BARANG_UNITS ===')
    const unitsConstraintQuery = `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.barang_units'::regclass
      ORDER BY conname;
    `
    const unitsConstraintResult = await client.query(unitsConstraintQuery)
    console.log(unitsConstraintResult.rows)
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

checkTriggerFunction()
