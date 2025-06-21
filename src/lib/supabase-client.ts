import { createClient } from '@supabase/supabase-js';

console.log('🔧 === SUPABASE CLIENT INITIALIZATION ===');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_API_KEY environment variables.');
}

console.log('🔧 Creating Supabase client...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client initialized successfully');