/**
 * Database Setup Script - New Schema
 *
 * This script creates the new role-based access control tables:
 * - role_user: Role definitions (1-9)
 * - users_profile: User profiles with role and outlet assignment
 * - master_outlet: Outlet master data
 * - group_outlet: Outlet grouping
 *
 * Usage: node scripts/setup-new-schema.js
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  database: 'postgres',
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
});

async function setupNewSchema() {
  try {
    console.log('========================================');
    console.log('  NEW SCHEMA DATABASE SETUP');
    console.log('========================================\n');

    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected!\n');

    // ============================================
    // 1. DROP EXISTING NEW TABLES (if any)
    // ============================================
    console.log('Step 1: Dropping existing new tables (if any)...');
    await client.query('DROP TABLE IF EXISTS public.users_profile CASCADE');
    await client.query('DROP TABLE IF EXISTS public.master_outlet CASCADE');
    await client.query('DROP TABLE IF EXISTS public.group_outlet CASCADE');
    await client.query('DROP TABLE IF EXISTS public.role_user CASCADE');
    console.log('✓ Tables dropped\n');

    // ============================================
    // 2. CREATE ROLE_USER TABLE
    // ============================================
    console.log('Step 2: Creating role_user table...');
    await client.query(`
      CREATE TABLE public.role_user (
        id INTEGER PRIMARY KEY,
        role_name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✓ role_user table created');

    // Insert roles 1-9
    await client.query(`
      INSERT INTO public.role_user (id, role_name) VALUES
        (1, 'admin_holding'),
        (2, 'staff_holding'),
        (3, 'laundry_admin'),
        (4, 'laundry_staff'),
        (5, 'finance'),
        (6, 'outlet_admin'),
        (7, 'warehouse_staff'),
        (8, 'SUPERUSER'),
        (9, 'UNASSIGNED')
    `);
    console.log('✓ 9 roles inserted\n');

    // ============================================
    // 3. CREATE GROUP_OUTLET TABLE
    // ============================================
    console.log('Step 3: Creating group_outlet table...');
    await client.query(`
      CREATE TABLE public.group_outlet (
        group_id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✓ group_outlet table created\n');

    // ============================================
    // 4. CREATE MASTER_OUTLET TABLE
    // ============================================
    console.log('Step 4: Creating master_outlet table...');
    await client.query(`
      CREATE TABLE public.master_outlet (
        kode_outlet TEXT PRIMARY KEY,
        name_outlet TEXT NOT NULL,
        alamat TEXT,
        no_telp TEXT,
        no_wa TEXT,
        location TEXT,
        province TEXT,
        outlet_group_id INTEGER REFERENCES public.group_outlet(group_id) ON DELETE SET NULL
      )
    `);
    console.log('✓ master_outlet table created');

    // Insert sample outlets
    await client.query(`
      INSERT INTO public.master_outlet (kode_outlet, name_outlet, alamat, no_telp, location, province) VALUES
        ('111', 'Holding HQ', 'Jakarta HQ', '021-12345678', 'Jakarta', 'DKI Jakarta'),
        ('OUT001', 'Outlet Kelapa Gading', 'Jl. Kelapa Gading', '021-87654321', 'Jakarta Utara', 'DKI Jakarta'),
        ('OUT002', 'Outlet Bekasi', 'Jl. Ahmad Yani Bekasi', '021-11223344', 'Bekasi', 'Jawa Barat'),
        ('OUT003', 'Outlet Tangerang', 'Jl. BSD City Tangerang', '021-55667788', 'Tangerang', 'Banten')
    `);
    console.log('✓ 4 sample outlets inserted\n');

    // ============================================
    // 5. CREATE USERS_PROFILE TABLE
    // ============================================
    console.log('Step 5: Creating users_profile table...');
    await client.query(`
      CREATE TABLE public.users_profile (
        uid TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        user_role INTEGER NOT NULL DEFAULT 9 REFERENCES public.role_user(id),
        kode_outlet TEXT REFERENCES public.master_outlet(kode_outlet) ON DELETE SET NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✓ users_profile table created\n');

    // ============================================
    // 6. CREATE TRIGGER FOR AUTO-PROFILE CREATION
    // ============================================
    console.log('Step 6: Creating auto-create profile trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user_auto()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users_profile (uid, user_role, email, kode_outlet)
        VALUES (
          NEW.id,
          9,
          NEW.email,
          NULL
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
    `);
    console.log('✓ Trigger function created');

    // Drop trigger if exists
    await client.query(`DROP TRIGGER IF EXISTS on_auth_user_created_auto ON auth.users`);

    // Create trigger
    await client.query(`
      CREATE TRIGGER on_auth_user_created_auto
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_auto()
    `);
    console.log('✓ Trigger created\n');

    // ============================================
    // 7. ENABLE ROW LEVEL SECURITY
    // ============================================
    console.log('Step 7: Enabling RLS...');
    await client.query('ALTER TABLE public.role_user ENABLE ROW LEVEL SECURITY');
    await client.query('ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY');
    await client.query('ALTER TABLE public.master_outlet ENABLE ROW LEVEL SECURITY');
    await client.query('ALTER TABLE public.group_outlet ENABLE ROW LEVEL SECURITY');
    console.log('✓ RLS enabled on all tables\n');

    // ============================================
    // 8. CREATE RLS POLICIES
    // ============================================
    console.log('Step 8: Creating RLS policies...');

    // role_user policies
    await client.query(`
      CREATE POLICY "Allow public read roles"
      ON public.role_user FOR SELECT
      TO public
      USING (true)
    `);
    console.log('  ✓ role_user policies created');

    // users_profile policies
    await client.query(`
      CREATE POLICY "Allow users read own profile"
      ON public.users_profile FOR SELECT
      TO authenticated
      USING (auth.uid()::text = uid)
    `);

    await client.query(`
      CREATE POLICY "Allow service insert profile"
      ON public.users_profile FOR INSERT
      TO service_role
      WITH CHECK (true)
    `);

    await client.query(`
      CREATE POLICY "Allow service update profile"
      ON public.users_profile FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true)
    `);
    console.log('  ✓ users_profile policies created');

    // master_outlet policies
    await client.query(`
      CREATE POLICY "Allow authenticated read outlets"
      ON public.master_outlet FOR SELECT
      TO authenticated
      USING (true)
    `);

    await client.query(`
      CREATE POLICY "Allow service insert outlets"
      ON public.master_outlet FOR INSERT
      TO service_role
      WITH CHECK (true)
    `);

    await client.query(`
      CREATE POLICY "Allow service update outlets"
      ON public.master_outlet FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true)
    `);
    console.log('  ✓ master_outlet policies created');

    // group_outlet policies
    await client.query(`
      CREATE POLICY "Allow authenticated read outlet groups"
      ON public.group_outlet FOR SELECT
      TO authenticated
      USING (true)
    `);

    await client.query(`
      CREATE POLICY "Allow service insert outlet groups"
      ON public.group_outlet FOR INSERT
      TO service_role
      WITH CHECK (true)
    `);
    console.log('  ✓ group_outlet policies created\n');

    // ============================================
    // 9. UPDATE EXISTING USER TO ADMIN ROLE
    // ============================================
    console.log('Step 9: Updating existing user to admin role...');
    const result = await client.query(`
      SELECT id FROM auth.users WHERE email = 'adminholding@zenfamilyspa.id' LIMIT 1
    `);

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      await client.query(`
        INSERT INTO public.users_profile (uid, user_role, email, kode_outlet)
        VALUES ($1, 1, 'adminholding@zenfamilyspa.id', '111')
        ON CONFLICT (uid) DO UPDATE SET
          user_role = EXCLUDED.user_role,
          kode_outlet = EXCLUDED.kode_outlet
      `, [userId]);
      console.log(`✓ User ${userId} updated to admin_holding (role=1, kode_outlet=111)\n`);
    } else {
      console.log('⚠ User not found in auth.users\n');
    }

    // ============================================
    // 10. VERIFY DATA
    // ============================================
    console.log('Step 10: Verifying data...\n');

    const roles = await client.query('SELECT * FROM public.role_user ORDER BY id');
    console.log('--- ROLE_USER (9 roles) ---');
    console.table(roles.rows);

    const outlets = await client.query('SELECT * FROM public.master_outlet ORDER BY kode_outlet');
    console.log('\n--- MASTER_OUTLET ---');
    console.table(outlets.rows);

    const profiles = await client.query('SELECT * FROM public.users_profile');
    console.log('\n--- USERS_PROFILE ---');
    console.table(profiles.rows);

    console.log('\n========================================');
    console.log('  ✅ NEW SCHEMA SETUP COMPLETE!');
    console.log('========================================\n');

    console.log('NEXT STEPS:');
    console.log('1. Create new users in Supabase Studio (Authentication tab)');
    console.log('2. Users will be auto-created with role=9 (UNASSIGNED)');
    console.log('3. Assign roles by updating users_profile in Supabase Studio:');
    console.log('   UPDATE users_profile SET user_role = <1-8>, kode_outlet = <code> WHERE uid = <uuid>;\n');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

setupNewSchema();
