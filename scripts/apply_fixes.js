import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  database: 'postgres',
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
});

async function runFixes() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    // 1. Enable RLS
    console.log('\n--- 1. Enabling RLS ---');
    await client.query('ALTER TABLE IF EXISTS public.barang_prices ENABLE ROW LEVEL SECURITY');
    await client.query('ALTER TABLE IF EXISTS public.barang_units ENABLE ROW LEVEL SECURITY');
    console.log('✓ RLS enabled for barang_prices and barang_units');

    // 2. Drop existing Policies to avoid conflicts
    console.log('\n--- 2. Dropping existing policies ---');
    const policiesToDrop = [
      'Authenticated can read barang_prices',
      'Admin and Superuser can read all prices',
      'Outlet users can read own outlet prices',
      'Admin can insert prices',
      'Outlet users can insert prices',
      'Admin can update prices',
      'Outlet users can update prices',
      'Outlet users can read own outlet products', // Old policy name
      'Authenticated can read barang_units',
      'Admin and Superuser can read all units',
      'Outlet users can read own outlet units',
      'Admin can insert units',
      'Outlet users can insert units',
      'Admin can update units',
      'Outlet users can update units'

    ];

    for (const policy of policiesToDrop) {
      // Try/Catch for individual drops as they might not exist
      try {
        await client.query(`DROP POLICY IF EXISTS "${policy}" ON public.barang_prices`);
        await client.query(`DROP POLICY IF EXISTS "${policy}" ON public.barang_units`);
        await client.query(`DROP POLICY IF EXISTS "${policy}" ON public.master_barang`); // For the old policy
      } catch (e) { /* ignore */ }
    }
     // Also drop the new policy name on master_barang to ensure clean slate
     try {
        await client.query(`DROP POLICY IF EXISTS "Outlet users can read own outlet and holding products" ON public.master_barang`);
      } catch (e) { /* ignore */ }
    console.log('✓ Cleanup complete');

    // 3. Create Policies for barang_prices
    console.log('\n--- 3. Creating Policies for barang_prices ---');
    
    // SELECT: Authenticated users can read
    await client.query(`
      CREATE POLICY "Authenticated can read barang_prices"
      ON public.barang_prices FOR SELECT
      TO authenticated
      USING (true)
    `);

    // INSERT: Users can insert for their own outlet or Holding
    // Using simple check since triggers run as SECURITY DEFINER usually, but direct inserts need this
    await client.query(`
      CREATE POLICY "Authenticated can insert prices"
      ON public.barang_prices FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND (users_profile.kode_outlet = barang_prices.kode_outlet OR users_profile.user_role IN (1, 8)) 
        )
      )
    `);

    // UPDATE: Users can update their own outlet
    await client.query(`
      CREATE POLICY "Authenticated can update prices"
      ON public.barang_prices FOR UPDATE
      TO authenticated
      USING (
         EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND (users_profile.kode_outlet = barang_prices.kode_outlet OR users_profile.user_role IN (1, 8))
        )
      )
      WITH CHECK (
         EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND (users_profile.kode_outlet = barang_prices.kode_outlet OR users_profile.user_role IN (1, 8))
        )
      )
    `);
    console.log('✓ barang_prices policies created');

    // 4. Create Policies for barang_units (Same logic)
    console.log('\n--- 4. Creating Policies for barang_units ---');
    await client.query(`
      CREATE POLICY "Authenticated can read barang_units"
      ON public.barang_units FOR SELECT
      TO authenticated
      USING (true)
    `);
    
    await client.query(`
       CREATE POLICY "Authenticated can insert units"
      ON public.barang_units FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND (users_profile.kode_outlet = barang_units.kode_outlet OR users_profile.user_role IN (1, 8))
        )
      )
    `);

    await client.query(`
      CREATE POLICY "Authenticated can update units"
      ON public.barang_units FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND (users_profile.kode_outlet = barang_units.kode_outlet OR users_profile.user_role IN (1, 8))
        )
      )
       WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND (users_profile.kode_outlet = barang_units.kode_outlet OR users_profile.user_role IN (1, 8))
        )
      )
    `);
    console.log('✓ barang_units policies created');


    // 5. Update master_barang Policy
    console.log('\n--- 5. Updating master_barang Policy ---');
    // Allow users to see their own outlet items OR Holding items
    await client.query(`
      CREATE POLICY "Outlet users can read own outlet and holding products"
      ON public.master_barang FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users_profile
          WHERE users_profile.uid = auth.uid()
          AND (
            users_profile.kode_outlet = master_barang.kode_outlet
            OR master_barang.kode_outlet = '111'
            OR users_profile.user_role IN (1, 8) -- Admin/Superuser see all
          )
        )
      )
    `);
    console.log('✓ master_barang policy updated (Holding visibility enabled)');

    // 6. Fix Constraints (Drop global uniquness if exists)
    console.log('\n--- 6. Fixing Constraints ---');
    try {
        await client.query('ALTER TABLE public.master_barang DROP CONSTRAINT IF EXISTS unique_sku_global');
        // Ensure per-outlet or standard logic. Assuming 'master_barang_sku_key' is the standard unique constraint we want? 
        // If master_barang_sku_key enforces uniqueness globally, and we want it per outlet, we might need to change it.
        // For now, removing the explicitly named global one if it persists from previous attempts.
    } catch (e) {
        console.log('No unique_sku_global constraint found or error dropping it: ' + e.message);
    }
    console.log('✓ Constraint check complete');


    console.log('\n✅ ALL FIXES APPLIED SUCCESSFULLY');

  } catch (err) {
    console.error('❌ Error executing fixes:', err);
  } finally {
    await client.end();
  }
}

runFixes();
