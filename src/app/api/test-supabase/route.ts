import { testSupabaseConnection, supabase } from '@/lib/supabase-client';

export async function GET() {
  try {
    console.log('🧪 Testing Supabase connection via API...');
    
    // Test connection
    const connectionTest = await testSupabaseConnection();
    
    if (!connectionTest) {
      return Response.json({ 
        success: false, 
        message: 'Supabase connection failed',
        config: {
          url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
          apiKey: process.env.SUPABASE_API_KEY ? 'Set' : 'Missing'
        }
      });
    }
    
    // Test table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);
    
    if (tableError) {
      return Response.json({ 
        success: false, 
        message: 'Table access failed',
        error: tableError.message
      });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Supabase connection and table access successful',
      tableData: tableInfo,
      config: {
        url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
        apiKey: process.env.SUPABASE_API_KEY ? 'Set' : 'Missing'
      }
    });
    
  } catch (error) {
    console.error('❌ Test API error:', error);
    return Response.json({ 
      success: false, 
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 