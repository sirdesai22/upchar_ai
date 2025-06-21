import { createClient } from '@supabase/supabase-js';

console.log('🔧 === SUPABASE CLIENT INITIALIZATION ===');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_API_KEY;

console.log('🔧 Supabase Configuration:');
console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('API Key:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_API_KEY environment variables.');
}

console.log('🔧 Creating Supabase client...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client initialized successfully');

/**
 * Test Supabase connection and table access
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('🧪 === TESTING SUPABASE CONNECTION ===');
    
    // Test basic connection
    console.log('🔍 Testing basic connection to patients table...');
    const { data, error } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    
    console.log('📊 Connection test result:', { data, error });
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
} 