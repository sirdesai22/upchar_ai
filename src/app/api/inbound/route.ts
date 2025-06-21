import twilio from 'twilio';
import { GeminiService } from '@/services/gemini';
import { getPatientByPhone, PatientData } from '@/services/supabase';
import { testSupabaseConnection } from '@/lib/supabase-client';

let incomingMessage = "";
let fromNumber = "";

export async function POST(request: Request) {
  try {
    console.log('🚀 === INBOUND API START ===');
    
    // Parse the incoming form data from Twilio
    const formData = await request.formData();
    incomingMessage = formData.get('Body') as string;
    fromNumber = formData.get('From') as string;
    
    console.log('📨 Raw incoming message:', incomingMessage);
    console.log('📱 Phone number:', fromNumber);
    console.log('📊 Message length:', incomingMessage?.length || 0);

    const geminiService = new GeminiService();
    console.log('🤖 Gemini service initialized');
    
    let response: string;

    // Check if this is a new conversation (first message)
    const hasCommas = (incomingMessage.match(/,/g) || []).length >= 3;
    
    // Check for natural language patient information patterns
    const hasPatientInfo = hasCommas || 
      /\d+\s*(?:yrs?|years?|age)/i.test(incomingMessage) || // age pattern
      /\b(?:male|female|m|f)\b/i.test(incomingMessage) || // gender pattern
      /\b(?:headache|fever|pain|diabetes|heart|asthma|cancer|stroke|hypertension|diabetes|asthma|pneumonia|fever|chest pain|breathing difficulty|severe pain|bleeding|unconscious|seizure|allergic reaction|heart_problem|heart disease|cardiac|headache|cold|cough|fever|stomach ache|back pain|joint pain|skin rash|eye problem|ear pain|dental issue)\b/i.test(incomingMessage); // disease patterns
    
    const isGreeting = !hasPatientInfo && (
      incomingMessage.toLowerCase().includes('hello') || 
      incomingMessage.toLowerCase().includes('hi') || 
      incomingMessage.toLowerCase().includes('start') ||
      incomingMessage.toLowerCase().includes('help')
    );
    
    console.log('🔍 Message analysis:', { 
      hasCommas, 
      commaCount: (incomingMessage.match(/,/g) || []).length,
      hasPatientInfo,
      isGreeting,
      message: incomingMessage 
    });
    console.log('🔍 Patient info detection:', {
      hasAge: /\d+\s*(?:yrs?|years?|age)/i.test(incomingMessage),
      hasGender: /\b(?:male|female|m|f)\b/i.test(incomingMessage),
      hasDisease: /\b(?:headache|fever|pain|diabetes|heart|asthma|cancer|stroke|hypertension|diabetes|asthma|pneumonia|fever|chest pain|breathing difficulty|severe pain|bleeding|unconscious|seizure|allergic reaction|heart_problem|heart disease|cardiac|headache|cold|cough|fever|stomach ache|back pain|joint pain|skin rash|eye problem|ear pain|dental issue)\b/i.test(incomingMessage)
    });
    console.log('🔍 Greeting keywords found:', {
      hello: incomingMessage.toLowerCase().includes('hello'),
      hi: incomingMessage.toLowerCase().includes('hi'),
      start: incomingMessage.toLowerCase().includes('start'),
      help: incomingMessage.toLowerCase().includes('help')
    });
    
    if (isGreeting) {
      console.log('👋 Processing greeting message...');
      
      // Check if patient exists in database
      console.log('🔍 Checking if patient exists in database...');
      const patientExists = await geminiService.checkPatientExists(fromNumber);
      console.log('👤 Patient exists check result:', patientExists);
      
      if (patientExists) {
        console.log('✅ Patient found in database, getting patient data...');
        // Get patient data from database
        const patientData = await getPatientByPhone(fromNumber);
        console.log('📋 Retrieved patient data:', patientData);
        
        if (patientData) {
          console.log('✅ Patient data retrieved successfully, generating response...');
          // Generate response for existing patient
          response = await geminiService.generateExistingPatientResponse({
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            disease: patientData.disease,
            phone_number: patientData.phone_number,
            language: patientData.language
          });
          console.log('💬 Generated existing patient response:', response);
        } else {
          console.log('⚠️ Patient exists but data retrieval failed, using fallback...');
          // Fallback if patient data not found
          response = "Hello! How may I help you today?";
          console.log('💬 Fallback response:', response);
        }
      } else {
        console.log('🆕 New patient detected, generating registration response...');
        // Generate response for new patient registration
        response = await geminiService.generateNewPatientResponse(fromNumber);
        console.log('💬 Generated new patient response:', response);
      }
    } else {
      console.log('💬 Processing non-greeting message...');
      
      // Check if this message contains complete patient data (comma-separated format)
      const commaCount = (incomingMessage.match(/,/g) || []).length;
      console.log('🔍 Comma analysis:', { commaCount, hasCommas, message: incomingMessage });
      
      console.log('🔍 Checking if patient exists in database...');
      const patientExists = await geminiService.checkPatientExists(fromNumber);
      console.log('👤 Patient exists check result:', patientExists);
      
      if (!patientExists && hasPatientInfo) {
        console.log('📝 Detected potential patient registration data');
        console.log('📨 Message:', incomingMessage);
        console.log('📱 From:', fromNumber);
        console.log('🔍 Comma count:', commaCount);
        console.log('👤 Patient exists check:', patientExists);
        
        // Test Supabase connection first
        console.log('🔗 Testing Supabase connection...');
        const connectionTest = await testSupabaseConnection();
        console.log('🔗 Connection test result:', connectionTest);
        
        if (!connectionTest) {
          console.log('❌ Supabase connection failed, cannot process registration');
          response = "Sorry, there's a technical issue. Please try again later.";
          console.log('💬 Error response:', response);
        } else {
          console.log('✅ Connection test passed, proceeding with data processing...');
          
          // Try to process and store patient data
          console.log('🔄 Calling processAndStorePatientData...');
          const result = await geminiService.processAndStorePatientData(incomingMessage, fromNumber);
          
          console.log('📊 Processing result:', {
            success: result.success,
            message: result.message,
            hasPatientData: !!result.patientData
          });
          
          if (result.success) {
            console.log('✅ Patient registration successful via API');
          } else {
            console.log('❌ Patient registration failed via API:', result.message);
          }
          
          response = result.message;
          console.log('💬 Final response:', response);
        }
      } else if (patientExists) {
        console.log('👤 Existing patient conversation detected...');
        // Handle ongoing conversation for existing patients
        console.log('🔍 Getting patient data for context...');
        const patientData = await getPatientByPhone(fromNumber);
        console.log('📋 Retrieved patient data for context:', patientData);
        
        if (patientData) {
          console.log('✅ Patient data retrieved, creating context-aware prompt...');
          // Create context-aware prompt
          const contextPrompt = `Patient: ${patientData.name} (${patientData.age} years, ${patientData.gender})
Condition: ${patientData.disease}

User: ${incomingMessage}

Instructions:
- Respond as a caring healthcare assistant
- Use patient's name when appropriate
- Keep response under 3 sentences
- Be helpful and concise
- Respond in ${patientData.language || 'English'}

Remember: Provide support, not medical advice.`;

          console.log('🤖 Sending context-aware prompt to Gemini...');
          response = await geminiService.chat([{ role: "user", content: contextPrompt }]);
          console.log('💬 Context-aware response:', response);
        } else {
          console.log('⚠️ Patient data not found, using fallback chat...');
          // Fallback to regular chat
          response = await geminiService.chat([{ role: "user", content: incomingMessage }]);
          console.log('💬 Fallback chat response:', response);
        }
      } else {
        console.log('🆕 New patient, continuing registration flow...');
        // For new patients, continue with registration flow
        const registrationPrompt = `New patient registration. Message: "${incomingMessage}"

Instructions:
- Help complete registration
- Ask for missing info: name, age, gender, disease, language
- Do NOT ask for address or other fields not in database
- Keep response under 2 sentences
- Be encouraging and clear

Current message: ${incomingMessage}`;

        console.log('🤖 Sending registration prompt to Gemini...');
        response = await geminiService.chat([{ role: "user", content: registrationPrompt }]);
        console.log('💬 Registration flow response:', response);
      }
    }

    console.log('📤 Creating TwiML response...');
    // Create TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(response);

    console.log('✅ === INBOUND API SUCCESS ===');
    console.log('📤 Final TwiML response:', twiml.toString());

    // Return XML response
    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('❌ === INBOUND API ERROR ===');
    console.error('❌ Error handling inbound message:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return error response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, something went wrong. Please try again later.');
    
    console.log('📤 Error TwiML response:', twiml.toString());
    
    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

export async function GET() {
  // Handle GET requests (for testing)
  const twiml = new twilio.twiml.MessagingResponse();
  const message = "Hello there!" + incomingMessage + " - " + fromNumber;
  twiml.message(message);

  console.log('Incoming message:', incomingMessage, 'from:', fromNumber);
  console.log('Received message:', incomingMessage);
  
  return new Response(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 