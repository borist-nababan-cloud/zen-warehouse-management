
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

async function debugPriceUnit() {
  console.log('--- DEBUG PRICE UNIT SERVICE ---');
  
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

  // 2. Exact Query from Service
  console.log('\n2. Executing master_barang query...');
  const { data: barangData, error: barangError, count } = await supabase
      .from('master_barang')
      .select('*', { count: 'exact' })
      .eq('deleted', false)
      .eq('kode_outlet', kode_outlet)
      .range(0, 99);

  if (barangError) {
      console.error('❌ master_barang Query FAILED:', barangError.message);
  } else {
      console.log(`✅ master_barang count: ${barangData.length} (Total: ${count})`);
      if (barangData.length > 0) {
          console.log('Sample Product:', {id: barangData[0].id, name: barangData[0].name, kode_outlet: barangData[0].kode_outlet});
      } else {
          console.log('⚠️ No items found for this outlet!');
          
          // Debug: Check if ANY items exist for this outlet (maybe they are deleted?)
          const { count: total, error: checkError } = await supabase
             .from('master_barang')
             .select('*', { count: 'exact', head: true })
             .eq('kode_outlet', kode_outlet);
          console.log(`   Total items for ${kode_outlet} (ignoring deleted=false): ${total}`);
      }
  }

  // 3. Debug Prices/Units if products exist
  if (barangData && barangData.length > 0) {
      const ids = barangData.map(b => b.id);
      
      const { data: prices } = await supabase.from('barang_prices').select('*').eq('kode_outlet', kode_outlet).in('barang_id', ids);
      console.log(`✅ Prices found: ${prices ? prices.length : 0}`);
      
      const { data: units } = await supabase.from('barang_units').select('*').eq('kode_outlet', kode_outlet).in('barang_id', ids);
      console.log(`✅ Units found: ${units ? units.length : 0}`);
  }

  console.log('--- END ---');
}

debugPriceUnit();
