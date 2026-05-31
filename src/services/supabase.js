import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Supabase credentials missing. App will run in local mock mode.");
}

// --- MOCK DATA FOR LOCAL TESTING ---
export const INITIAL_RESTAURANTS = [
  {
    id: 'rest-001',
    name: 'CyberBite Bistro',
    cover: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    vendor_id: 'vendor-001'
  }
];

export const INITIAL_DISHES = [
  {
    id: 'dish-001',
    rest_id: 'rest-001',
    name: 'Truffle Glazed Burger',
    price: 18.99,
    description: 'A futuristic take on the classic burger with truffle infusion.',
    tags: ['High Protein', 'Bestseller'],
    model_url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', 
    macros: { protein: '35g', carbs: '45g', fat: '22g', calories: 540 },
    micros: { iron: '15%', calcium: '10%', vitC: '5%', vitA: '20%' },
    ingredients: ['Wagyu Beef Patty', 'Truffle Aioli', 'Brioche Bun']
  }
];

export { supabase };
