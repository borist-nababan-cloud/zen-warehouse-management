/**
 * Run RLS Policies Script (with SET ROLE)
 *
 * This script executes the RLS policies for master_barang and master_type tables
 * by connecting directly to PostgreSQL and using SET ROLE to switch to supabase_admin
 */

const { Client } = require('pg')

// Database credentials
const credentials = {
  host: '217.21.78.155',
  port: 57777,
  database: 'postgres',
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
}

async function runRLSPolicies() {
  const client = new Client(credentials)

  try {
    console.log('Connecting to PostgreSQL...')
    await client.connect()
    console.log('✅ Connected successfully')

    // First, check table ownership
    console.log('\nChecking table ownership...')
    const ownershipCheck = await client.query(`
      SELECT
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('master_type', 'master_barang')
      ORDER BY tablename
    `)

    console.log('Current table owners:')
    ownershipCheck.rows.forEach(row => {
      console.log(`   - ${row.tablename}: ${row.tableowner}`)
    })

    // Try to SET ROLE to supabase_admin to create policies
    console.log('\nSwitching to supabase_admin role to create policies...')

    try {
      // Check if postgres can set role to supabase_admin
      await client.query(`SET ROLE supabase_admin;`)
      console.log('   ✅ Role switched to supabase_admin')

      // Now execute RLS policies
      console.log('\nExecuting RLS policies...')

      // Enable RLS and create policies for master_type
      console.log('\n📋 Setting up master_type policies...')

      // Enable RLS
      await client.query(`ALTER TABLE public.master_type ENABLE ROW LEVEL SECURITY;`)
      console.log('   ✅ RLS enabled for master_type')

      // Drop existing policies
      await client.query(`DROP POLICY IF EXISTS "Authenticated can read product types" ON public.master_type;`)
      await client.query(`DROP POLICY IF EXISTS "Admin can insert product types" ON public.master_type;`)
      await client.query(`DROP POLICY IF EXISTS "Admin can update product types" ON public.master_type;`)
      await client.query(`DROP POLICY IF EXISTS "Admin can delete product types" ON public.master_type;`)
      console.log('   ✅ Old policies dropped')

      // Create new policies
      await client.query(`
        CREATE POLICY "Authenticated can read product types"
        ON public.master_type FOR SELECT
        TO authenticated
        USING (true);
      `)
      console.log('   ✅ Read policy created')

      await client.query(`
        CREATE POLICY "Admin can insert product types"
        ON public.master_type FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
          )
        );
      `)
      console.log('   ✅ Insert policy created')

      await client.query(`
        CREATE POLICY "Admin can update product types"
        ON public.master_type FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
          )
        );
      `)
      console.log('   ✅ Update policy created')

      await client.query(`
        CREATE POLICY "Admin can delete product types"
        ON public.master_type FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
          )
        );
      `)
      console.log('   ✅ Delete policy created')

      // Enable RLS and create policies for master_barang
      console.log('\n📋 Setting up master_barang policies...')

      // Enable RLS
      await client.query(`ALTER TABLE public.master_barang ENABLE ROW LEVEL SECURITY;`)
      console.log('   ✅ RLS enabled for master_barang')

      // Drop existing policies
      const policiesToDrop = [
        "Admin and Superuser can read all products",
        "Outlet users can read own outlet products",
        "Admin can insert products",
        "Outlet users can insert products",
        "Admin can update products",
        "Outlet users can update products",
        "Admin can delete products",
        "Outlet users can delete products"
      ]

      for (const policyName of policiesToDrop) {
        await client.query(`DROP POLICY IF EXISTS "${policyName}" ON public.master_barang;`)
      }
      console.log('   ✅ Old policies dropped')

      // SELECT policies
      await client.query(`
        CREATE POLICY "Admin and Superuser can read all products"
        ON public.master_barang FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role IN (1, 8)
          )
        );
      `)
      console.log('   ✅ Read policy (admin/superuser) created')

      await client.query(`
        CREATE POLICY "Outlet users can read own outlet products"
        ON public.master_barang FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role IN (5, 6)
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Read policy (outlet users) created')

      // INSERT policies
      await client.query(`
        CREATE POLICY "Admin can insert products"
        ON public.master_barang FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Insert policy (admin) created')

      await client.query(`
        CREATE POLICY "Outlet users can insert products"
        ON public.master_barang FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role IN (5, 6)
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Insert policy (outlet users) created')

      // UPDATE policies
      await client.query(`
        CREATE POLICY "Admin can update products"
        ON public.master_barang FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Update policy (admin) created')

      await client.query(`
        CREATE POLICY "Outlet users can update products"
        ON public.master_barang FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role IN (5, 6)
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role IN (5, 6)
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Update policy (outlet users) created')

      // DELETE policies
      await client.query(`
        CREATE POLICY "Admin can delete products"
        ON public.master_barang FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role = 1
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Delete policy (admin) created')

      await client.query(`
        CREATE POLICY "Outlet users can delete products"
        ON public.master_barang FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users_profile
            WHERE users_profile.uid = auth.uid()
            AND users_profile.user_role IN (5, 6)
            AND users_profile.kode_outlet = master_barang.kode_outlet
          )
        );
      `)
      console.log('   ✅ Delete policy (outlet users) created')

      // Reset role
      await client.query(`RESET ROLE;`)
      console.log('\n   ✅ Role reset to postgres')

      // Verify all policies were created
      console.log('\nVerifying policies...')

      const masterTypePolicies = await client.query(`
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'master_type'
        ORDER BY policyname
      `)

      const masterBarangPolicies = await client.query(`
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'master_barang'
        ORDER BY policyname
      `)

      console.log(`\n📋 master_type policies (${masterTypePolicies.rows.length}):`)
      masterTypePolicies.rows.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
      })

      console.log(`\n📋 master_barang policies (${masterBarangPolicies.rows.length}):`)
      masterBarangPolicies.rows.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
      })

      console.log('\n✅ All RLS policies set up successfully!')

    } catch (e) {
      console.error('❌ Error with SET ROLE:', e.message)
      console.log('\n⚠️  Alternative: Please run the SQL manually in Supabase Studio SQL Editor.')
      console.log('   The SQL file is at: database-docs/rls-policies-master-barang.sql')
      throw e
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\nConnection closed')
  }
}

runRLSPolicies()
