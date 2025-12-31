
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
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyHolding() {
  console.log('\n--- VERIFY HOLDING VISIBILITY ---');
  
  // 1. Login as HOLDING ADMIN
  console.log('1. Logging in as Holding Admin...');
  const { data: holdingAuth, error: holdingError } = await supabase.auth.signInWithPassword({
    email: 'adminholding@zenfamilyspa.id',
    password: 'test123'
  });

  if (holdingError) {
      console.error('❌ Holding Login FAILED:', holdingError.message);
      return;
  }
  console.log('✅ Holding Login SUCCEEDED');

  // 2. Insert HQ Product
  console.log('2. Inserting HQ Product...');
  const hqProduct = {
      kode_outlet: '111', 
      name: `HQ Test Product ${Date.now()}`,
      id_type: 1, 
      deleted: false
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('master_barang')
    .insert(hqProduct)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert HQ Product FAILED:', insertError.message);
    // Continue anyway to see if we can read existing?
    return;
  }
  console.log('✅ Insert HQ Product SUCCEEDED:', insertData.name);


  // 3. Login as OUTLET ADMIN
  console.log('\n3. Logging in as Outlet Admin (109)...');
  await supabase.auth.signOut();
  const { data: outletAuth, error: outletError } = await supabase.auth.signInWithPassword({
    email: 'adminsunda@zenfamilyspa.id',
    password: 'test123'
  });

  if (outletError) {
      console.error('❌ Outlet Login FAILED:', outletError.message);
      // Clean up HQ product anyway? tricky if not logged in.
      return; 
  }
  console.log('✅ Outlet Login SUCCEEDED');

  // 4. Try to Fetch Everything (should see HQ product)
  console.log('4. Fetching Products as Outlet Admin...');
  const { data: products, error: productError } = await supabase
    .from('master_barang')
    .select('id, name, kode_outlet')
    .eq('id', insertData.id); // Check specifically for this one

  if (productError) {
    console.error('❌ Fetch FAILED:', productError.message);
  } else {
    if (products && products.length > 0) {
        console.log('✅ Found HQ Product:', products[0]);
    } else {
        console.error('❌ Did NOT find HQ Product. RLS Policy issue?');
        console.log('Product we looked for:', insertData.id);
    }
  }

  // 5. Cleanup (Login as Holding again to delete)
  console.log('\n5. Cleanup...');
  await supabase.auth.signOut();
  await supabase.auth.signInWithPassword({
    email: 'adminholding@zenfamilyspa.id',
    password: 'test123'
  });
  await supabase.from('master_barang').delete().eq('id', insertData.id);
  console.log('✅ Cleanup Complete');
  
  console.log('--- END ---');
}

verifyHolding();
