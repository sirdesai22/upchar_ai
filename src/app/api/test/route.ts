//Simple hello world api route

import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';

export async function GET() {
  try {
    const geminiService = new GeminiService();
    const genaiResponse = await geminiService.chat([{ role: "user", content: "Hello, world!" }]);
    return NextResponse.json({ message: genaiResponse });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, phoneNumber, testType } = await request.json();
    
    const geminiService = new GeminiService();
    
    let result;
    
    switch (testType) {
      case 'bookAppointment':
        result = await geminiService.bookAppointment(message, phoneNumber);
        break;
      case 'chat':
        result = await geminiService.chat([{ role: 'user', content: message }]);
        break;
      case 'extractPatientData':
        result = await geminiService.extractPatientData(message, phoneNumber);
        break;
      case 'processAndStorePatientData':
        result = await geminiService.processAndStorePatientData(message, phoneNumber);
        break;
      default:
        result = await geminiService.chat([{ role: 'user', content: message }]);
    }
    
    return NextResponse.json({ 
      success: true, 
      result,
      testType 
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      testType: 'error'
    }, { status: 500 });
  }
}