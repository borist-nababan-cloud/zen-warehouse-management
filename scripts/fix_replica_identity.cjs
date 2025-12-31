
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '217.21.78.155',
  database: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
  port: 57777,
});

async function runFix() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected.');

    console.log('Applying REPLICA IDENTITY FULL to barang_prices...');
    await client.query('ALTER TABLE public.barang_prices REPLICA IDENTITY FULL;');
    
    console.log('Applying REPLICA IDENTITY FULL to barang_units...');
    await client.query('ALTER TABLE public.barang_units REPLICA IDENTITY FULL;');
    
    console.log('✅ Fix applied successfully.');
  } catch (err) {
    console.error('❌ Error applying fix:', err);
  } finally {
    await client.end();
  }
}

runFix();
