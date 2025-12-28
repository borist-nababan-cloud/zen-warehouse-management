import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  database: 'postgres',
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
});

async function setupDatabase() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected!\n');

    // ============================================
    // 1. DROP EXISTING TABLES
    // ============================================
    console.log('Step 1: Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS public.profiles CASCADE');
    await client.query('DROP TABLE IF EXISTS public.locations CASCADE');
    console.log('✓ Tables dropped\n');

    // ============================================
    // 2. CREATE LOCATIONS TABLE
    // ============================================
    console.log('Step 2: Creating locations table...');
    await client.query(`
      CREATE TABLE public.locations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location_code TEXT NOT NULL UNIQUE,
        location_type TEXT NOT NULL CHECK (location_type IN ('holding', 'outlet', 'laundry', 'warehouse')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✓ Locations table created');

    await client.query(`
      INSERT INTO public.locations (name, location_code, location_type)
      VALUES ('HQ Jakarta', 'HQ01', 'holding')
    `);
    console.log('✓ Sample location inserted\n');

    // ============================================
    // 3. CREATE PROFILES TABLE
    // ============================================
    console.log('Step 3: Creating profiles table...');
    await client.query(`
      CREATE TABLE public.profiles (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT,
        phone TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin_holding', 'staff_holding', 'laundry_staff', 'laundry_admin', 'finance', 'outlet_admin', 'warehouse_staff')),
        location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✓ Profiles table created\n');

    // ============================================
    // 4. CREATE TRIGGER FUNCTION
    // ============================================
    console.log('Step 4: Creating auto-create profile trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'role', 'staff_holding')
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
    `);
    console.log('✓ Trigger function created');

    // Drop trigger if exists
    await client.query(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`);

    // Create trigger
    await client.query(`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
    `);
    console.log('✓ Trigger created\n');

    // ============================================
    // 5. ENABLE ROW LEVEL SECURITY
    // ============================================
    console.log('Step 5: Enabling RLS...');
    await client.query('ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY');
    await client.query('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY');
    console.log('✓ RLS enabled\n');

    // ============================================
    // 6. CREATE RLS POLICIES FOR LOCATIONS
    // ============================================
    console.log('Step 6: Creating RLS policies for locations...');
    await client.query(`
      CREATE POLICY "Allow public read locations"
      ON public.locations FOR SELECT
      TO public
      USING (true)
    `);

    await client.query(`
      CREATE POLICY "Allow authenticated insert locations"
      ON public.locations FOR INSERT
      TO authenticated
      WITH CHECK (true)
    `);

    await client.query(`
      CREATE POLICY "Allow authenticated update locations"
      ON public.locations FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)
    `);
    console.log('✓ Location policies created\n');

    // ============================================
    // 7. CREATE RLS POLICIES FOR PROFILES
    // ============================================
    console.log('Step 7: Creating RLS policies for profiles...');
    await client.query(`
      CREATE POLICY "Allow public read profiles"
      ON public.profiles FOR SELECT
      TO public
      USING (true)
    `);

    await client.query(`
      CREATE POLICY "Allow service role insert profiles"
      ON public.profiles FOR INSERT
      TO service_role
      WITH CHECK (true)
    `);

    await client.query(`
      CREATE POLICY "Allow users update own profile"
      ON public.profiles FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = id)
      WITH CHECK (auth.uid()::text = id)
    `);

    await client.query(`
      CREATE POLICY "Allow service role update profiles"
      ON public.profiles FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true)
    `);
    console.log('✓ Profile policies created\n');

    // ============================================
    // 8. UPDATE EXISTING USER PROFILE
    // ============================================
    console.log('Step 8: Updating user profile...');
    const result = await client.query(`
      SELECT id FROM auth.users WHERE email = 'adminholding@zenfamilyspa.id' LIMIT 1
    `);

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      await client.query(`
        INSERT INTO public.profiles (id, email, full_name, role, location_id)
        VALUES ($1, 'adminholding@zenfamilyspa.id', 'Admin Holding', 'admin_holding', 1)
        ON CONFLICT (id) DO UPDATE SET
          location_id = EXCLUDED.location_id,
          role = EXCLUDED.role,
          full_name = EXCLUDED.full_name
      `, [userId]);
      console.log(`✓ Profile created for user: ${userId}\n`);
    } else {
      console.log('⚠ User not found in auth.users\n');
    }

    // ============================================
    // 9. VERIFY DATA
    // ============================================
    console.log('Step 9: Verifying data...');

    const locations = await client.query('SELECT * FROM public.locations');
    console.log('\n--- LOCATIONS ---');
    console.log(locations.rows);

    const profiles = await client.query('SELECT * FROM public.profiles');
    console.log('\n--- PROFILES ---');
    console.log(profiles.rows);

    console.log('\n✅ DATABASE SETUP COMPLETE!\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

setupDatabase();
