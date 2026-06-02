import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkRestSchema() {
  // Try fetching with specific column names to see which exist
  const tests = ['id', 'vendor_id', 'name', 'cover', 'tax_rate', 'accept_cash', 'created_at'];
  
  for (const col of tests) {
    const { data, error } = await supabase.from('restaurants').select(col).limit(0);
    console.log(`Column "${col}":`, error ? `MISSING (${error.message})` : 'EXISTS');
  }

  // Also check orders columns
  console.log('\n=== ORDERS COLUMNS ===');
  const orderCols = ['id', 'rest_id', 'user_id', 'items', 'total', 'status', 'timestamp', 'table_num', 'restId', 'created_at'];
  for (const col of orderCols) {
    const { data, error } = await supabase.from('orders').select(col).limit(0);
    console.log(`Column "${col}":`, error ? `MISSING (${error.message})` : 'EXISTS');
  }
}

checkRestSchema();
