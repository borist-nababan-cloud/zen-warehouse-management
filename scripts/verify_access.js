
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
try {
  const envConfig = dotenv.parse(fs.readFileSync('.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (e) {
  console.log('Could not load .env file, using defaults if available');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bensupabase.nababancloud.com';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjcyNTg2MCwiZXhwIjo0OTIyMzk5NDYwLCJyb2xlIjoiYW5vbiJ9.XtMrw432QPVfEinPTl2bcR6aE_PpZQe0fz77tpUCUJM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAccess() {
  console.log('--- START VERIFICATION ---');
  
  // 1. Login
  console.log('1. Attempting Login with adminsunda@zenfamilyspa.id...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'adminsunda@zenfamilyspa.id',
    password: 'password123' // Trying the one that seemed to work in browser. If fail, will try test123
  });

  if (authError) {
     console.log('Login failed with password123, trying test123...');
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'adminsunda@zenfamilyspa.id',
        password: 'test123'
      });
      
      if (authError2) {
          console.error('❌ Login FAILED:', authError2.message);
          return;
      }
      console.log('✅ Login SUCCEEDED with test123');
  } else {
      console.log('✅ Login SUCCEEDED with password123');
  }

  // 2. Check Profile
  const user = (await supabase.auth.getUser()).data.user;
  console.log(`User ID: ${user.id}`);

  console.log('\n2. Fetching User Profile...');
  const { data: profile, error: profileError } = await supabase
    .from('users_profile')
    .select('*')
    .eq('uid', user.id)
    .single();

  if (profileError) {
    console.error('❌ Fetch Profile FAILED:', profileError.message);
  } else {
    console.log('✅ Profile Found:', profile);
  }

  // 3. Check Products (SELECT)
  console.log('\n3. Fetching Products (Expecting Own + Holding)...');
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
      kode_outlet: profile?.kode_outlet || '109', // Fallback if profile missing
      name: `Test Script Product ${Date.now()}`,
      master_type_id: 1, // Assuming type 1 exists? If not this might fail FK
      // We might need to fetch a valid type first
      id_type: 1, // field name in master_barang matches schema?
      deleted: false
  };

  // Check valid type schema first or just try insert
  // Note: Schema might use 'master_type_id' or 'id_type'. Let's check error if column missing
  // Based on code reading: ProductPage uses 'id_type'
  
  const { data: insertData, error: insertError } = await supabase
    .from('master_barang')
    .insert(newProduct)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert Product FAILED:', insertError.message, insertError.details);
  } else {
    console.log('✅ Insert Product SUCCEEDED:', insertData);
    
    // Cleanup
    console.log('   Cleaning up (Deletinig created product)...');
    await supabase.from('master_barang').delete().eq('id', insertData.id);
  }

  console.log('--- END VERIFICATION ---');
}

verifyAccess();
