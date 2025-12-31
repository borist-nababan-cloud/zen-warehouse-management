
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

async function checkRelations() {
  console.log('--- CHECKING RELATIONS ---');
  
  // Login as Outlet Admin
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'adminsunda@zenfamilyspa.id',
    password: 'test123' 
  });

  if (authError) {
      console.error('❌ Login Failed:', authError.message);
      return;
  }
  console.log('✅ Logged in as:', user.email);

  // 1. Check master_type
  console.log('\n1. Checking master_type...');
  const { data: types, error: typeError } = await supabase
    .from('master_type')
    .select('*')
    .limit(5);

  if (typeError) {
      console.error('❌ master_type Error:', typeError.message);
  } else {
      console.log(`✅ master_type count: ${types.length}`);
      if(types.length === 0) console.log('   (Table is empty or hidden by RLS)');
      else console.table(types);
  }

  // 2. Check master_outlet
  console.log('\n2. Checking master_outlet...');
  const { data: outlets, error: outletError } = await supabase
    .from('master_outlet')
    .select('*')
    .limit(5);

  if (outletError) {
       console.error('❌ master_outlet Error:', outletError.message);
  } else {
      console.log(`✅ master_outlet count: ${outlets.length}`);
      if(outlets.length === 0) console.log('   (Table is empty or hidden by RLS)');
      else console.table(outlets);
  }

  // 3. Test Join Query (reproducing frontend behavior)
  console.log('\n3. Testing Join Query...');
  const { data: joinData, error: joinError } = await supabase
      .from('master_barang')
      .select(`
        *,
        master_type:master_type(*),
        master_outlet:master_outlet!master_barang_kode_outlet_fkey(*)
      `)
      .limit(5);

  if (joinError) {
      console.error('❌ Join Query FAILED:', joinError.message);
      console.error('   Details:', joinError.details);
      console.error('   Hint:', joinError.hint);
  } else {
      console.log(`✅ Join Query SUCCEEDED. Rows: ${joinData.length}`);
      if (joinData.length > 0) {
          console.log('Sample Row:', JSON.stringify(joinData[0], null, 2));
      }
  }

  console.log('--- END ---');
}

checkRelations();
