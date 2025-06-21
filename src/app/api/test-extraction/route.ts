import { GeminiService } from '@/services/gemini';

export async function POST(request: Request) {
  try {
    const { message, phoneNumber } = await request.json();
    
    console.log('🧪 Testing data extraction...');
    console.log('📨 Message:', message);
    console.log('📱 Phone:', phoneNumber);
    
    const geminiService = new GeminiService();
    
    // Test data extraction
    const extractedData = await geminiService.extractPatientData(message, phoneNumber);
    
    console.log('📊 Extraction result:', extractedData);
    
    if (extractedData) {
      // Test database insertion
      const { insertPatient } = await import('@/services/supabase');
      const insertedData = await insertPatient(extractedData as any);
      
      return Response.json({
        success: true,
        message: 'Data extracted and stored successfully',
        extractedData,
        insertedData
      });
    } else {
      return Response.json({
        success: false,
        message: 'Failed to extract data',
        extractedData: null
      });
    }
    
  } catch (error) {
    console.error('❌ Test extraction error:', error);
    return Response.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 