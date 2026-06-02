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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpPolicies() {
  console.log('Fetching policies directly via REST might not be possible for anon, but lets try RPC or raw sql if available.');
  
  // We can't easily fetch pg_policies from client JS without postgres function.
  // Instead, let's create a test user (or just attempt an insert using the service role key if we had it, but we don't).
  
  // Let's attempt an insert to `restaurants` using a mock user if we can sign up one
  const testEmail = `test_${Date.now()}@test.com`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: 'password123'
  });
  
  if (authErr) {
    console.log('Could not sign up test user:', authErr.message);
    return;
  }
  
  console.log('Successfully created test user:', authData.user.id);
  
  // Now try to insert a restaurant as this user
  const { data: rData, error: rErr } = await supabase.from('restaurants').insert([{
    vendor_id: authData.user.id,
    name: 'Test Setup Restaurant'
  }]).select();
  
  console.log('Insert restaurant result:', rData, 'Error:', rErr);
  
  if (rData && rData[0]) {
    // Try to insert a dish
    const { data: dData, error: dErr } = await supabase.from('dishes').insert([{
      name: 'Test Setup Dish',
      rest_id: rData[0].id
    }]).select();
    
    console.log('Insert dish result:', dData, 'Error:', dErr);
  }
}

dumpPolicies();
