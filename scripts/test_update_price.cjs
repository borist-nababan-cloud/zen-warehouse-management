
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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  console.log('--- TEST PRICE UPDATE ---');
  
  // 1. Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'adminsunda@zenfamilyspa.id',
    password: 'test123'
  });

  if (authError) {
      console.error('❌ Login Failed:', authError.message);
      return;
  }
  const user = authData.user;
  console.log('✅ Logged in as:', user.email);
  
  // Get profile to be sure of outlet code
  const { data: profile } = await supabase.from('users_profile').select('*').eq('uid', user.id).single();
  const kode_outlet = profile ? profile.kode_outlet : 'Unknown';
  console.log('User Outlet:', kode_outlet);

  // 2. Find a product for this outlet
  const { data: barangData, error: barangError } = await supabase
      .from('master_barang')
      .select('*')
      .eq('kode_outlet', kode_outlet)
      .limit(1);

  if (!barangData || barangData.length === 0) {
      console.log('❌ No products found to update.');
      return;
  }

  const product = barangData[0];
  console.log('Target Product:', { id: product.id, name: product.name });

  // 3. Update Price
  console.log('Attempting UPDATE on barang_prices...');
  const { data: updateData, error: updateError } = await supabase
      .from('barang_prices')
      .update({
          buy_price: 1500,
          sell_price: 3000,
          update_by: user.email,
          updated_at: new Date().toISOString()
      })
      .eq('barang_id', product.id)
      .eq('kode_outlet', kode_outlet)
      .select();

  if (updateError) {
      console.error('❌ Update FAILED:', updateError);
      console.error('   Hint: Check RLS policies for UPDATE on barang_prices.');
  } else {
      console.log('✅ Update SUCCESS:', updateData);
  }
  
  // 4. Update Unit (Check this too)
   console.log('Attempting UPDATE on barang_units...');
  const { data: unitData, error: unitError } = await supabase
      .from('barang_units')
      .update({
          conversion_rate: 1,
          update_by: user.email,
          updated_at: new Date().toISOString()
      })
      .eq('barang_id', product.id)
      .eq('kode_outlet', kode_outlet)
      .select();
      
  if (unitError) {
       console.error('❌ Unit Update FAILED:', unitError);
  } else {
       console.log('✅ Unit Update SUCCESS:', unitData);
  }

  console.log('--- END ---');
}

testUpdate();
