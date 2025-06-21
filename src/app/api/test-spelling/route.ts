import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 === TESTING SPELLING CORRECTION ===');
    
    const { name, disease, language } = await request.json();
    
    console.log('📋 Test data:', { name, disease, language });
    
    const geminiService = new GeminiService();
    
    // Test single field corrections
    const correctedName = await geminiService.correctSingleField(name || 'Jhon', 'name');
    const correctedDisease = await geminiService.correctSingleField(disease || 'hedache', 'disease');
    const correctedLanguage = await geminiService.correctSingleField(language || 'hinde', 'language');
    
    // Test full patient data correction
    const testPatientData = {
      name: name || 'Jhon Doe',
      age: 25,
      gender: 'Male' as const,
      disease: disease || 'hedache',
      phone_number: '+1234567890',
      language: language || 'hinde'
    };
    
    const correctedPatientData = await geminiService.correctSpellingMistakes(testPatientData);
    
    const results = {
      singleFieldCorrections: {
        name: { original: name || 'Jhon', corrected: correctedName },
        disease: { original: disease || 'hedache', corrected: correctedDisease },
        language: { original: language || 'hinde', corrected: correctedLanguage }
      },
      fullDataCorrection: {
        original: testPatientData,
        corrected: correctedPatientData
      }
    };
    
    console.log('✅ Spelling correction test results:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Spelling correction test completed',
      results
    });
    
  } catch (error) {
    console.error('❌ Error in spelling correction test:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing spelling correction',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 