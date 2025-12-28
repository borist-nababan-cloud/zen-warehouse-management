/**
 * Run RLS Policies Script
 *
 * This script executes the RLS policies for master_barang and master_type tables
 * by connecting directly to PostgreSQL
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

// SQL commands to execute
const sqlCommands = `
-- ================================================================
-- RLS POLICIES FOR WMS MASTER DATA TABLES
-- ================================================================

-- --------------------------------------------------------
-- 1. MASTER_TYPE TABLE POLICIES
-- --------------------------------------------------------

-- Enable RLS
ALTER TABLE public.master_type ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated can read product types" ON public.master_type;
DROP POLICY IF EXISTS "Admin can insert product types" ON public.master_type;
DROP POLICY IF EXISTS "Admin can update product types" ON public.master_type;
DROP POLICY IF EXISTS "Admin can delete product types" ON public.master_type;

-- Policy: Authenticated users can read all product types (for dropdown)
CREATE POLICY "Authenticated can read product types"
ON public.master_type FOR SELECT
TO authenticated
USING (true);

-- Policy: Only role 1 (admin_holding) can insert product types
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

-- Policy: Only role 1 (admin_holding) can update product types
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

-- Policy: Only role 1 (admin_holding) can delete product types
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

-- --------------------------------------------------------
-- 2. MASTER_BARANG TABLE POLICIES
-- --------------------------------------------------------

-- Enable RLS
ALTER TABLE public.master_barang ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin and Superuser can read all products" ON public.master_barang;
DROP POLICY IF EXISTS "Outlet users can read own outlet products" ON public.master_barang;
DROP POLICY IF EXISTS "Admin can insert products" ON public.master_barang;
DROP POLICY IF EXISTS "Outlet users can insert products" ON public.master_barang;
DROP POLICY IF EXISTS "Admin can update products" ON public.master_barang;
DROP POLICY IF EXISTS "Outlet users can update products" ON public.master_barang;
DROP POLICY IF EXISTS "Admin can delete products" ON public.master_barang;
DROP POLICY IF EXISTS "Outlet users can delete products" ON public.master_barang;

-- --------------------------------------------------------
-- SELECT POLICIES (READ)
-- --------------------------------------------------------

-- Policy: Roles 1,8 (admin_holding, SUPERUSER) can read ALL data
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

-- Policy: Roles 5,6 (finance, outlet_admin) can read OWN outlet only
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

-- --------------------------------------------------------
-- INSERT POLICIES (CREATE)
-- --------------------------------------------------------

-- Policy: Role 1 (admin_holding) can insert for their outlet
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

-- Policy: Roles 5,6 (finance, outlet_admin) can insert for their outlet
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

-- Note: Role 8 (SUPERUSER) has NO INSERT policy = cannot insert

-- --------------------------------------------------------
-- UPDATE POLICIES (EDIT)
-- --------------------------------------------------------

-- Policy: Role 1 (admin_holding) can update their outlet's products
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

-- Policy: Roles 5,6 (finance, outlet_admin) can update their outlet's products
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

-- Note: Role 8 (SUPERUSER) has NO UPDATE policy = cannot update

-- --------------------------------------------------------
-- DELETE POLICIES
-- --------------------------------------------------------

-- Policy: Role 1 (admin_holding) can delete their outlet's products
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

-- Policy: Roles 5,6 (finance, outlet_admin) can delete their outlet's products
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

-- Note: Role 8 (SUPERUSER) has NO DELETE policy = cannot delete
`

async function runRLSPolicies() {
  const client = new Client(credentials)

  try {
    console.log('Connecting to PostgreSQL...')
    await client.connect()
    console.log('✅ Connected successfully')

    console.log('\nExecuting RLS policies...')
    await client.query(sqlCommands)
    console.log('✅ RLS policies executed successfully')

    // Verify policies were created
    console.log('\nVerifying policies...')

    const masterTypePolicies = await client.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        cmd
      FROM pg_policies
      WHERE tablename = 'master_type'
      ORDER BY policyname
    `)

    const masterBarangPolicies = await client.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        cmd
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

  } catch (error) {
    console.error('❌ Error executing RLS policies:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\nConnection closed')
  }
}

runRLSPolicies()
