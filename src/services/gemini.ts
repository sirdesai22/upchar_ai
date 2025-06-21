import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/config/env';
import { checkPhoneExists, insertPatient } from './supabase';
import { getPatientSession, updatePatientSession, clearPatientSession, isSessionComplete, getMissingFields } from '@/lib/patient-sessions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
}

export interface PatientData {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  disease: string;
  phone_number: string;
  language?: string;
  priority?: 'High' | 'Medium' | 'Low';
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Check if a patient exists by phone number
   * @param phoneNumber - The phone number to check
   * @returns Promise<boolean> - true if patient exists, false otherwise
   */
  async checkPatientExists(phoneNumber: string): Promise<boolean> {
    try {
      console.log('🔍 === CHECKING PATIENT EXISTS ===');
      console.log('📱 Phone number to check:', phoneNumber);
      
      const result = await checkPhoneExists(phoneNumber);
      console.log('✅ Patient exists check result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error checking patient existence:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Extract patient data from a message
   * @param message - The message containing patient information
   * @param phoneNumber - The patient's phone number
   * @returns Promise<PatientData | null> - Extracted patient data or null if invalid
   */
  async extractPatientData(message: string, phoneNumber: string): Promise<PatientData | null> {
    console.log('🔍 Starting data extraction for message:', message);
    
    const prompt = `Extract patient information from this message: "${message}"

The message can be in different formats:
1. Comma-separated: "Name, Age, Gender, Disease, Language"
   Example: "Priyankar Haldar,21,male,heart_problem,hindi"
2. Natural language: "NAME I HAVE DISEASE AGE GENDER TALK IN LANGUAGE"
   Example: "PRATHAMESH I HAVE HEADACHE 22YRS OLD MALE TALK IN HINDI"
3. Partial information: "John 25" or "I have diabetes" or "Male"

Instructions:
- Extract any available information: name, age, gender, disease, language
- If a field is not mentioned, set it to null
- Language is optional and defaults to English if not specified
- Convert gender to proper format (Male/Female/Other)
- Return JSON format only
- If no useful information found, return null

Valid genders: Male, Female, Other
Age must be a number between 1-120

Return format:
{
  "name": "string or null",
  "age": "number or null",
  "gender": "Male|Female|Other or null",
  "disease": "string or null",
  "language": "string or null"
}

Or return "null" if no useful information found.`;

    try {
      console.log('🤖 Sending prompt to Gemini for extraction...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      console.log('🤖 Raw Gemini response:', text);
      
      // Try to parse JSON response
      if (text.toLowerCase() === 'null' || text === '') {
        console.log('❌ Gemini returned null or empty response');
        return null;
      }
      
      console.log('🔍 Attempting to parse JSON response...');
      
      // Clean the response - remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        console.log('🧹 Removed markdown code blocks, cleaned text:', cleanText);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        console.log('🧹 Removed markdown code blocks, cleaned text:', cleanText);
      }
      
      const extractedData = JSON.parse(cleanText);
      console.log('📋 Parsed extracted data:', extractedData);
      
      // Get current session
      const session = getPatientSession(phoneNumber);
      console.log('📝 Current session:', session);
      
      // Update session with new data (only non-null values)
      const updates: any = {};
      if (extractedData.name) updates.name = extractedData.name;
      if (extractedData.age) {
        const age = parseInt(extractedData.age);
        if (!isNaN(age) && age >= 1 && age <= 120) {
          updates.age = age;
        }
      }
      if (extractedData.gender && ['Male', 'Female', 'Other'].includes(extractedData.gender)) {
        updates.gender = extractedData.gender;
      }
      if (extractedData.disease) updates.disease = extractedData.disease;
      if (extractedData.language) updates.language = extractedData.language;
      
      // Correct spelling in the updates if any text fields are present
      if (updates.name || updates.disease || updates.language) {
        console.log('🔍 Correcting spelling in session updates...');
        
        // Correct individual fields for better efficiency
        if (updates.name) {
          updates.name = await this.correctSingleField(updates.name, 'name');
        }
        if (updates.disease) {
          updates.disease = await this.correctSingleField(updates.disease, 'disease');
        }
        if (updates.language) {
          updates.language = await this.correctSingleField(updates.language, 'language');
        }
        
        console.log('✅ Session updates corrected:', updates);
      }
      
      if (Object.keys(updates).length > 0) {
        updatePatientSession(phoneNumber, updates);
        console.log('📝 Updated session with:', updates);
      }
      
      // Check if session is now complete
      const updatedSession = getPatientSession(phoneNumber);
      console.log('📝 Updated session:', updatedSession);
      
      if (isSessionComplete(updatedSession)) {
        console.log('✅ Session is complete, creating final patient data');
        const finalData = {
          name: updatedSession.name!,
          age: updatedSession.age!,
          gender: updatedSession.gender!,
          disease: updatedSession.disease!,
          phone_number: phoneNumber,
          language: updatedSession.language || 'English' // Default to English if not provided
        };
        
        console.log('✅ Final patient data:', finalData);
        return finalData;
      } else {
        console.log('⚠️ Session incomplete, missing fields:', getMissingFields(updatedSession));
        return null;
      }
    } catch (error) {
      console.error('❌ Error extracting patient data:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Process and store patient data
   * @param message - The message containing patient information
   * @param phoneNumber - The patient's phone number
   * @returns Promise<{success: boolean, message: string, patientData?: PatientData}>
   */
  async processAndStorePatientData(message: string, phoneNumber: string): Promise<{success: boolean, message: string, patientData?: PatientData}> {
    try {
      console.log('🔄 Processing patient data from message:', message);
      console.log('📱 Phone number:', phoneNumber);
      
      // Extract patient data from message
      const patientData = await this.extractPatientData(message, phoneNumber);
      
      if (!patientData) {
        // Check if we have a partial session
        const session = getPatientSession(phoneNumber);
        const missingFields = getMissingFields(session);
        
        if (missingFields.length > 0) {
          console.log('📝 Incomplete session, missing fields:', missingFields);
          
          // Generate response asking for missing fields
          const missingFieldsResponse = await this.generateMissingFieldsResponse(session, missingFields);
          
          return {
            success: false,
            message: missingFieldsResponse
          };
        } else {
          console.log('❌ No useful data extracted and no existing session');
          return {
            success: false,
            message: "I couldn't understand the information. Please provide: Name, Age, Gender, Disease, Language (e.g., John, 25, Male, Diabetes, English)"
          };
        }
      }
      
      console.log('📋 Complete patient data extracted:', patientData);
      
      // Check if patient already exists
      const exists = await this.checkPatientExists(phoneNumber);
      if (exists) {
        console.log('⚠️ Patient already exists in database');
        clearPatientSession(phoneNumber); // Clear session
        return {
          success: false,
          message: "You're already registered! How may I help you today?"
        };
      }
      
      console.log('🔍 Correcting spelling mistakes...');
      
      // Correct spelling mistakes in patient data
      const correctedPatientData = await this.correctSpellingMistakes(patientData);
      console.log('✅ Spelling correction completed');
      
      console.log('🎯 Assigning priority using AI...');
      
      // Use AI to assign priority based on corrected patient information
      const priority = await this.assignPriorityWithAI(correctedPatientData);
      console.log('🎯 AI-assigned priority:', priority);
      
      // Add priority to corrected patient data
      const patientDataWithPriority = {
        ...correctedPatientData,
        priority
      };
      
      console.log('💾 Storing corrected patient data in database...');
      
      // Insert corrected patient data into database
      const insertedPatient = await insertPatient(patientDataWithPriority);
      
      // Clear session after successful registration
      clearPatientSession(phoneNumber);
      
      console.log('🎉 Patient registration completed successfully!');
      
      // Check if any corrections were made
      const hasCorrections = 
        patientData.name !== correctedPatientData.name ||
        patientData.disease !== correctedPatientData.disease ||
        patientData.language !== correctedPatientData.language;
      
      const correctionMessage = hasCorrections ? 
        " (I've corrected some spelling in your information)" : "";
      
      return {
        success: true,
        message: `Welcome ${correctedPatientData.name}! Your registration is complete${correctionMessage}. How may I help you today?`,
        patientData: insertedPatient
      };
    } catch (error) {
      console.error('❌ Error processing patient data:', error);
      return {
        success: false,
        message: "Sorry, there was an error processing your information. Please try again."
      };
    }
  }

  /**
   * Generate response asking for missing fields
   * @param session - Current patient session
   * @param missingFields - Array of missing field names
   * @returns Promise<string> - Response asking for missing fields
   */
  async generateMissingFieldsResponse(session: any, missingFields: string[]): Promise<string> {
    console.log('🤖 Generating missing fields response for:', missingFields);
    
    const prompt = `You are a healthcare assistant for Upchar AI.

Current patient information:
${session.name ? `- Name: ${session.name}` : ''}
${session.age ? `- Age: ${session.age}` : ''}
${session.gender ? `- Gender: ${session.gender}` : ''}
${session.disease ? `- Disease: ${session.disease}` : ''}
${session.language ? `- Language: ${session.language}` : ''}

Missing information: ${missingFields.join(', ')}

Instructions:
- Acknowledge the information already provided
- Ask only for the missing fields
- Be friendly and encouraging
- Keep response under 2 sentences
- Make it feel easy and quick

Example: "Thanks! I have your name and age. Could you please tell me your gender and what condition you're experiencing?"`;

    try {
      console.log('🤖 Sending prompt to Gemini for missing fields response...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Raw Gemini response for missing fields:', text);
      return text;
    } catch (error) {
      console.error('❌ Error generating missing fields response:', error);
      
      // Fallback response
      const fieldNames = missingFields.map(field => {
        switch (field) {
          case 'name': return 'full name';
          case 'age': return 'age';
          case 'gender': return 'gender (Male/Female/Other)';
          case 'disease': return 'condition or symptoms';
          default: return field;
        }
      });
      
      return `Thanks! I still need your ${fieldNames.join(', ')}. Please provide the missing information.`;
    }
  }

  /**
   * Generate response for existing patient
   * @param patientData - Patient information
   * @returns Promise<string> - AI response for existing patient
   */
  async generateExistingPatientResponse(patientData: PatientData): Promise<string> {
    console.log('🤖 === GENERATING EXISTING PATIENT RESPONSE ===');
    console.log('📋 Patient data for response:', patientData);
    
    const prompt = `You are a healthcare assistant for Upchar AI. 

Patient: ${patientData.name} (${patientData.age} years, ${patientData.gender})
Condition: ${patientData.disease}

Instructions:
- Greet warmly using their name
- Ask "How may I help you today?"
- Keep response under 2 sentences
- Be caring but concise
- Respond in ${patientData.language || 'English'}

Remember: Provide support, not medical advice.`;

    try {
      console.log('🤖 Sending prompt to Gemini for existing patient response...');
      console.log('📝 Prompt:', prompt);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Raw Gemini response for existing patient:', text);
      console.log('✅ Existing patient response generated successfully');
      
      return text;
    } catch (error) {
      console.error('❌ Error generating existing patient response:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      const fallbackResponse = `Hello ${patientData.name}! How may I help you today?`;
      console.log('🔄 Using fallback response:', fallbackResponse);
      
      return fallbackResponse;
    }
  }

  /**
   * Generate response for new patient registration
   * @param phoneNumber - Patient's phone number
   * @returns Promise<string> - AI response for new patient registration
   */
  async generateNewPatientResponse(phoneNumber: string): Promise<string> {
    console.log('🤖 === GENERATING NEW PATIENT RESPONSE ===');
    console.log('📱 Phone number for new patient:', phoneNumber);
    
    const prompt = `You are a healthcare assistant for Upchar AI. 

New patient with phone ${phoneNumber} wants to register.

Instructions:
- Welcome them warmly
- Ask for their full name first
- Keep response under 2 sentences
- Be friendly and encouraging
- Make it feel easy and quick
- Only ask for: name, age, gender, disease (language is optional, defaults to English)

Example: "Welcome to Upchar AI! To provide personalized care, I need your full name."`;

    try {
      console.log('🤖 Sending prompt to Gemini for new patient response...');
      console.log('📝 Prompt:', prompt);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Raw Gemini response for new patient:', text);
      console.log('✅ New patient response generated successfully');
      
      return text;
    } catch (error) {
      console.error('❌ Error generating new patient response:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      const fallbackResponse = `Welcome to Upchar AI! To provide personalized care, I need your full name.`;
      console.log('🔄 Using fallback response:', fallbackResponse);
      
      return fallbackResponse;
    }
  }

  /**
   * Generate conversation prompt for patient interaction
   * @param isExistingPatient - Whether the patient exists in database
   * @param patientData - Patient information (if existing)
   * @param phoneNumber - Patient's phone number
   * @returns Promise<string> - Appropriate conversation prompt
   */
  async generateConversationPrompt(
    isExistingPatient: boolean, 
    patientData?: PatientData, 
    phoneNumber?: string
  ): Promise<string> {
    if (isExistingPatient && patientData) {
      return await this.generateExistingPatientResponse(patientData);
    } else if (phoneNumber) {
      return await this.generateNewPatientResponse(phoneNumber);
    } else {
      return "Welcome to Upchar AI! I'm here to help you with your healthcare needs. How may I assist you today?";
    }
  }

  async chat(messages: ChatMessage[], calendarEvents?: CalendarEvent[]): Promise<string> {
    try {
      console.log('🤖 === GEMINI CHAT START ===');
      console.log('💬 Messages to process:', messages);
      console.log('📅 Calendar events:', calendarEvents);
      
      let prompt = this.buildPrompt(messages, calendarEvents);
      console.log('📝 Built prompt:', prompt);
      
      console.log('🤖 Sending prompt to Gemini...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Raw Gemini chat response:', text);
      console.log('✅ === GEMINI CHAT SUCCESS ===');
      
      return text;
    } catch (error) {
      console.error('❌ === GEMINI CHAT ERROR ===');
      console.error('❌ Error in Gemini chat:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to get response from Gemini');
    }
  }

  private buildPrompt(messages: ChatMessage[], calendarEvents?: CalendarEvent[]): string {
    console.log('🔨 === BUILDING PROMPT ===');
    console.log('💬 Messages:', messages);
    console.log('📅 Calendar events:', calendarEvents);
    
    let prompt = `You are an AI assistant that can help with calendar management and general tasks. 
    
You have access to Google Calendar events and can help users:
- View upcoming events
- Schedule new events
- Modify existing events
- Provide calendar insights
- Answer general questions

Current conversation context:
`;

    // Add conversation history
    messages.forEach((message, index) => {
      prompt += `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}\n`;
      console.log(`📝 Added message ${index + 1}:`, message.role, message.content);
    });

    // Add calendar context if available
    if (calendarEvents && calendarEvents.length > 0) {
      prompt += `\nCurrent calendar events:\n`;
      calendarEvents.forEach((event, index) => {
        prompt += `- ${event.summary} (${event.start.dateTime} to ${event.end.dateTime})\n`;
        console.log(`📅 Added calendar event ${index + 1}:`, event.summary);
      });
    }

    prompt += `\nPlease respond as the AI assistant. If the user asks about calendar operations, provide helpful information and suggest appropriate actions.`;

    console.log('✅ Final prompt built successfully');
    return prompt;
  }

  async generateCalendarInsights(events: CalendarEvent[]): Promise<string> {
    const prompt = `Analyze these calendar events and provide insights:
    
Events:
${events.map(event => `- ${event.summary} (${event.start.dateTime} to ${event.end.dateTime})`).join('\n')}

Please provide:
1. A summary of your schedule
2. Any potential conflicts or overlaps
3. Suggestions for better time management
4. Upcoming important events to prepare for`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating calendar insights:', error);
      return 'Unable to generate calendar insights at this time.';
    }
  }

  /**
   * Assign priority using AI based on patient information
   * @param patientData - Patient information
   * @returns Promise<'High' | 'Medium' | 'Low'> - AI-assigned priority
   */
  async assignPriorityWithAI(patientData: PatientData): Promise<'High' | 'Medium' | 'Low'> {
    console.log('🤖 === ASSIGNING PRIORITY WITH AI ===');
    console.log('📋 Patient data for priority assignment:', patientData);
    
    const prompt = `You are a healthcare AI assistant. Analyze this patient's information and assign a priority level.

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Disease/Condition: ${patientData.disease}
- Language: ${patientData.language || 'English'}

Priority Levels:
- HIGH: Critical conditions, severe symptoms, life-threatening situations, very young children (under 5), elderly (over 70) with serious conditions
- MEDIUM: Moderate symptoms, chronic conditions, children (5-18), seniors (60-70), pregnancy-related issues
- LOW: Minor symptoms, routine checkups, healthy adults with mild conditions

Consider:
- Age and vulnerability
- Severity of the condition
- Urgency of symptoms
- Risk factors

Instructions:
- Think carefully about the medical context
- Consider age-related risks
- Evaluate symptom severity
- Return only: "High", "Medium", or "Low"
- No explanations, just the priority level

Return format: "High" or "Medium" or "Low"`;

    try {
      console.log('🤖 Sending prompt to Gemini for priority assignment...');
      console.log('📝 Prompt:', prompt);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      console.log('🤖 Raw Gemini priority response:', text);
      
      // Clean and validate the response
      const cleanPriority = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
      console.log('🧹 Cleaned priority:', cleanPriority);
      
      if (cleanPriority === 'high') {
        console.log('✅ AI assigned HIGH priority');
        return 'High';
      } else if (cleanPriority === 'medium') {
        console.log('✅ AI assigned MEDIUM priority');
        return 'Medium';
      } else if (cleanPriority === 'low') {
        console.log('✅ AI assigned LOW priority');
        return 'Low';
      } else {
        console.log('⚠️ Invalid priority response, defaulting to Medium:', cleanPriority);
        return 'Medium';
      }
    } catch (error) {
      console.error('❌ Error assigning priority with AI:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      console.log('🔄 Using fallback priority: Medium');
      return 'Medium';
    }
  }

  /**
   * Correct spelling mistakes in patient data using AI
   * @param patientData - Patient data that may contain spelling mistakes
   * @returns Promise<PatientData> - Corrected patient data
   */
  async correctSpellingMistakes(patientData: PatientData): Promise<PatientData> {
    console.log('🔍 === CORRECTING SPELLING MISTAKES ===');
    console.log('📋 Original patient data:', patientData);
    
    const prompt = `You are a healthcare AI assistant. Correct any spelling mistakes in this patient information while preserving the original meaning.

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Disease/Condition: ${patientData.disease}
- Language: ${patientData.language || 'English'}

Instructions:
- Correct spelling mistakes in names, diseases, and other text fields
- Preserve the original meaning and intent
- Keep proper nouns (names) as close to original as possible
- Correct medical terms and common words
- Return JSON format with corrected data
- If no corrections needed, return the original data

Examples:
- "hedache" → "headache"
- "diabetis" → "diabetes"
- "fevr" → "fever"
- "Jhon" → "John" (if it's clearly a name mistake)

Return format:
{
  "name": "corrected name",
  "age": ${patientData.age},
  "gender": "${patientData.gender}",
  "disease": "corrected disease",
  "language": "${patientData.language || 'English'}"
}`;

    try {
      console.log('🤖 Sending prompt to Gemini for spelling correction...');
      console.log('📝 Prompt:', prompt);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      console.log('🤖 Raw Gemini spelling correction response:', text);
      
      // Clean the response - remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        console.log('🧹 Removed markdown code blocks, cleaned text:', cleanText);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        console.log('🧹 Removed markdown code blocks, cleaned text:', cleanText);
      }
      
      const correctedData = JSON.parse(cleanText);
      console.log('📋 Parsed corrected data:', correctedData);
      
      // Create corrected patient data
      const correctedPatientData: PatientData = {
        name: correctedData.name,
        age: correctedData.age,
        gender: correctedData.gender,
        disease: correctedData.disease,
        phone_number: patientData.phone_number,
        language: correctedData.language
      };
      
      console.log('✅ Corrected patient data:', correctedPatientData);
      return correctedPatientData;
    } catch (error) {
      console.error('❌ Error correcting spelling mistakes:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      console.log('🔄 Using original data due to correction error');
      return patientData;
    }
  }

  /**
   * Correct spelling in a single text field
   * @param text - Text to correct
   * @param fieldType - Type of field (name, disease, language)
   * @returns Promise<string> - Corrected text
   */
  async correctSingleField(text: string, fieldType: 'name' | 'disease' | 'language'): Promise<string> {
    console.log(`🔍 Correcting spelling in ${fieldType}:`, text);
    
    const prompt = `You are a healthcare AI assistant. Correct any spelling mistakes in this ${fieldType} while preserving the original meaning.

${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}: "${text}"

Instructions:
- Correct spelling mistakes
- Preserve the original meaning and intent
- For names: keep as close to original as possible, only fix obvious mistakes
- For diseases: correct medical terms and common words
- For languages: correct language names
- Return only the corrected text, no JSON or explanations

Examples:
- Name: "Jhon" → "John"
- Disease: "hedache" → "headache"
- Language: "hinde" → "hindi"

Return only the corrected text.`;

    try {
      console.log('🤖 Sending prompt to Gemini for single field correction...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const correctedText = response.text().trim();
      
      console.log(`✅ Corrected ${fieldType}:`, correctedText);
      return correctedText;
    } catch (error) {
      console.error(`❌ Error correcting ${fieldType}:`, error);
      console.log('🔄 Using original text due to correction error');
      return text;
    }
  }
} 