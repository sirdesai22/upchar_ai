import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/config/env';
import { checkPhoneExists, insertPatient } from './supabase';

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

Instructions:
- Extract name, age, gender, disease, language
- Convert gender to proper format (Male/Female/Other)
- Return JSON format only
- If data is incomplete or invalid, return null

Valid genders: Male, Female, Other
Age must be a number between 1-120

Return format:
{
  "name": "string",
  "age": number,
  "gender": "Male|Female|Other",
  "disease": "string",
  "language": "string"
}

Or return "null" if invalid.`;

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
      
      const patientData = JSON.parse(cleanText);
      console.log('📋 Parsed patient data:', patientData);
      
      // Validate the extracted data
      if (!patientData.name || !patientData.age || !patientData.gender || !patientData.disease) {
        console.log('❌ Missing required fields in extracted data');
        return null;
      }
      
      // Validate age
      const age = parseInt(patientData.age);
      if (isNaN(age) || age < 1 || age > 120) {
        console.log('❌ Invalid age:', patientData.age);
        return null;
      }
      
      // Validate gender
      const validGenders = ['Male', 'Female', 'Other'];
      if (!validGenders.includes(patientData.gender)) {
        console.log('❌ Invalid gender:', patientData.gender);
        return null;
      }
      
      const finalData = {
        name: patientData.name,
        age: age,
        gender: patientData.gender,
        disease: patientData.disease,
        phone_number: phoneNumber,
        language: patientData.language || 'English'
      };
      
      console.log('✅ Data extraction successful:', finalData);
      return finalData;
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
        console.log('❌ Failed to extract patient data from message');
        return {
          success: false,
          message: "I couldn't understand the information. Please provide: Name, Age, Gender, Disease, Language (e.g., John, 25, Male, Diabetes, English)"
        };
      }
      
      console.log('📋 Extracted patient data:', patientData);
      
      // Check if patient already exists
      const exists = await this.checkPatientExists(phoneNumber);
      if (exists) {
        console.log('⚠️ Patient already exists in database');
        return {
          success: false,
          message: "You're already registered! How may I help you today?"
        };
      }
      
      console.log('💾 Storing patient data in database...');
      
      // Insert patient data into database
      const insertedPatient = await insertPatient(patientData);
      
      console.log('🎉 Patient registration completed successfully!');
      
      return {
        success: true,
        message: `Welcome ${patientData.name}! Your registration is complete. How may I help you today?`,
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
- Only ask for: name, age, gender, disease, language (no address or other fields)

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
} 