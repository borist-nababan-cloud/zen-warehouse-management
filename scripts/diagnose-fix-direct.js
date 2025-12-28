/**
 * Direct PostgreSQL Diagnostic & Fix Script
 * Connects directly to PostgreSQL to diagnose and fix login issues
 * Bypasses Supabase API to get accurate database state
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

async function diagnoseAndFix() {
  try {
    console.log('========================================');
    console.log('  DIRECT POSTGRESQL DIAGNOSTIC');
    console.log('========================================\n');

    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected!\n');

    // ============================================
    // 1. CHECK TABLES
    // ============================================
    console.log('Step 1: Checking tables...');
    const tables = await client.query(`
      SELECT
        tablename,
        tableowner,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('role_user', 'users_profile', 'master_outlet', 'group_outlet')
      ORDER BY tablename
    `);
    console.log('Tables found:', tables.rows.length);
    console.table(tables.rows);

    // ============================================
    // 2. CHECK AUTH USERS
    // ============================================
    console.log('\nStep 2: Checking auth.users...');
    const authUsers = await client.query(`
      SELECT id, email, created_at, confirmed_at
      FROM auth.users
      ORDER BY created_at DESC
    `);
    console.log('Auth users:', authUsers.rows.length);
    console.table(authUsers.rows);

    // ============================================
    // 3. CHECK USERS PROFILES
    // ============================================
    console.log('\nStep 3: Checking users_profile...');
    const profiles = await client.query(`
      SELECT up.*, ru.role_name
      FROM public.users_profile up
      LEFT JOIN public.role_user ru ON up.user_role = ru.id
      ORDER BY up.created_at DESC
    `);
    console.log('User profiles:', profiles.rows.length);
    console.table(profiles.rows);

    // ============================================
    // 4. FIND USERS WITHOUT PROFILES
    // ============================================
    console.log('\nStep 4: Finding users without profiles...');
    const usersWithoutProfiles = await client.query(`
      SELECT
        au.id,
        au.email,
        au.created_at
      FROM auth.users au
      LEFT JOIN public.users_profile up ON au.id = up.uid
      WHERE up.uid IS NULL
    `);
    console.log('Users without profiles:', usersWithoutProfiles.rows.length);
    console.table(usersWithoutProfiles.rows);

    // ============================================
    // 5. CREATE PROFILES FOR MISSING USERS
    // ============================================
    console.log('\nStep 5: Creating profiles for missing users...');
    for (const user of usersWithoutProfiles.rows) {
      console.log(`Creating profile for: ${user.email}`);

      await client.query(`
        INSERT INTO public.users_profile (uid, user_role, email, kode_outlet)
        VALUES ($1, 9, $2, NULL)
        ON CONFLICT (uid) DO NOTHING
      `, [user.id, user.email]);

      console.log(`  ✓ Created profile with role=9 (UNASSIGNED)`);
    }

    // ============================================
    // 6. VERIFY PROFILES CREATED
    // ============================================
    console.log('\nStep 6: Verifying all users now have profiles...');
    const verifyResult = await client.query(`
      SELECT
        au.email,
        up.user_role,
        ru.role_name,
        up.kode_outlet,
        CASE
          WHEN up.uid IS NULL THEN 'NO PROFILE'
          WHEN up.user_role = 9 THEN 'UNASSIGNED'
          ELSE 'ASSIGNED'
        END as status
      FROM auth.users au
      LEFT JOIN public.users_profile up ON au.id = up.uid
      LEFT JOIN public.role_user ru ON up.user_role = ru.id
      ORDER BY au.created_at DESC
    `);
    console.table(verifyResult.rows);

    // ============================================
    // 7. CHECK RPC FUNCTION
    // ============================================
    console.log('\nStep 7: Checking RPC function...');
    const rpcCheck = await client.query(`
      SELECT
        routine_name,
        routine_type,
        security_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = 'create_user_profile'
    `);

    if (rpcCheck.rows.length === 0) {
      console.log('⚠ RPC function NOT FOUND - creating it now...');

      await client.query(`
        CREATE OR REPLACE FUNCTION public.create_user_profile(
          p_uid UUID,
          p_user_role INTEGER DEFAULT 9,
          p_email TEXT DEFAULT '',
          p_kode_outlet TEXT DEFAULT NULL
        )
        RETURNS SETOF users_profile
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
          INSERT INTO public.users_profile (uid, user_role, email, kode_outlet)
          VALUES (p_uid, p_user_role, p_email, p_kode_outlet)
          ON CONFLICT (uid) DO UPDATE SET
            user_role = EXCLUDED.user_role,
            kode_outlet = EXCLUDED.kode_outlet,
            email = EXCLUDED.email;

          RETURN QUERY
            SELECT * FROM public.users_profile WHERE uid = p_uid;
        END;
        $$;
      `);

      await client.query(`GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, INTEGER, TEXT, TEXT) TO authenticated;`);
      await client.query(`GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, INTEGER, TEXT, TEXT) TO anon;`);

      console.log('✓ RPC function created');
    } else {
      console.log('✓ RPC function exists');
      console.table(rpcCheck.rows);
    }

    // ============================================
    // 8. FINAL SUMMARY
    // ============================================
    console.log('\n========================================');
    console.log('  DIAGNOSIS COMPLETE');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`- Total auth users: ${authUsers.rows.length}`);
    console.log(`- Users with profiles: ${profiles.rows.length}`);
    console.log(`- Users without profiles (now fixed): ${usersWithoutProfiles.rows.length}`);
    console.log('\n✅ All users now have profiles. Unassigned users (role=9) will be blocked by the app.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

diagnoseAndFix();
