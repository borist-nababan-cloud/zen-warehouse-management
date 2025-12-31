
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values) {
          process.env[key.trim()] = values.join('=').trim();
        }
      });
  }
} catch (e) {
  console.log('Could not load .env file:', e.message);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bensupabase.nababancloud.com';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjcyNTg2MCwiZXhwIjo0OTIyMzk5NDYwLCJyb2xlIjoiYW5vbiJ9.XtMrw432QPVfEinPTl2bcR6aE_PpZQe0fz77tpUCUJM';

console.log('Setup:', { url: supabaseUrl, keyLength: supabaseKey ? supabaseKey.length : 0 });

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAccess() {
  console.log('\n--- START VERIFICATION (CJS) ---');
  
  // 1. Login
  console.log('1. Attempting Login with adminsunda@zenfamilyspa.id...');
  
  // Try password123 first (frontend seemed to use it)
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'adminsunda@zenfamilyspa.id',
    password: 'password123'
  });

  if (authError) {
      console.log('Login failed with password123, trying test123...');
      const res = await supabase.auth.signInWithPassword({
        email: 'adminsunda@zenfamilyspa.id',
        password: 'test123'
      });
      authData = res.data;
      authError = res.error;
  }

  if (authError) {
      console.error('❌ Login FAILED:', authError.message);
      return;
  }
  
  console.log('✅ Login SUCCEEDED');
  const user = authData.user;
  console.log(`User ID: ${user.id}`);

  // 2. Check Profile
  console.log('\n2. Fetching User Profile...');
  const { data: profile, error: profileError } = await supabase
    .from('users_profile')
    .select('*')
    .eq('uid', user.id)
    .single();

  if (profileError) {
    console.error('❌ Fetch Profile FAILED:', profileError.message);
  } else {
    console.log('✅ Profile Found:', { 
        id: profile.id, 
        role: profile.user_role, 
        outlet: profile.kode_outlet 
    });
  }

  // 3. Check Products (SELECT)
  console.log('\n3. Fetching Products...');
  if (profile) {
      console.log(`   Expected Filters: kode_outlet = ${profile.kode_outlet} OR 111`);
  }
  
  const { data: products, error: productError } = await supabase
    .from('master_barang')
    .select('id, name, kode_outlet, sku')
    .limit(10);

  if (productError) {
    console.error('❌ Fetch Products FAILED:', productError.message);
  } else {
    console.log(`✅ Fetched ${products.length} products`);
    if (products.length > 0) {
        console.table(products);
    } else {
        console.log('   (List is empty)');
    }
  }

  // 4. Try Insert (INSERT)
  console.log('\n4. Attempting Product Insert...');
  const newProduct = {
      kode_outlet: profile?.kode_outlet || '109', 
      name: `Test Script Product ${Date.now()}`,
      id_type: 1, 
      deleted: false
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('master_barang')
    .insert(newProduct)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert Product FAILED:', JSON.stringify(insertError, null, 2));
  } else {
    console.log('✅ Insert Product SUCCEEDED:', insertData);
    console.log('   Cleaning up...');
    await supabase.from('master_barang').delete().eq('id', insertData.id);
  }

  console.log('--- END VERIFICATION ---');
}

verifyAccess();
