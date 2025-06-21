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
   * Check if a patient exists in the database
   * @param phoneNumber - The patient's phone number
   * @returns Promise<boolean> - true if patient exists, false otherwise
   */
  async checkPatientExists(phoneNumber: string): Promise<boolean> {
    try {
      const result = await checkPhoneExists(phoneNumber);
      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract patient data from a message
   * @param message - The message containing patient information
   * @param phoneNumber - The patient's phone number
   * @returns Promise<PatientData | null> - Extracted patient data or null if invalid
   */
  async extractPatientData(message: string, phoneNumber: string): Promise<PatientData | null> {
    const prompt = `Extract patient information from this message: "${message}"

The message can be in different formats:
1. Comma-separated: "Name, Age, Gender, Disease, Language"
   Example: "Priyankar Haldar,21,male,heart_problem,hindi"
2. Natural language: "NAME I HAVE DISEASE AGE GENDER TALK IN LANGUAGE"
   Example: "PRATHAMESH I HAVE HEADACHE 22YRS OLD MALE TALK IN HINDI"
3. Partial information: "John 25" or "I have diabetes" or "Male"
4. Natural disease descriptions: "Pain in my left eye" or "I have a little fever"

Instructions:
- Extract any available information: name, age, gender, disease, language
- If a field is not mentioned, set it to null
- Language is optional and defaults to English if not specified
- Convert gender to proper format (Male/Female/Other)
- For disease/condition descriptions:
  * Remove filler words like "my", "little", "some", "a", "the", "I have", "I'm having", "suffering from"
  * Convert to clear medical terminology
  * Examples: "Pain in my left eye" → "pain in left eye", "I have a little fever" → "fever", "my head hurts" → "headache"
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Try to parse JSON response
      if (text.toLowerCase() === 'null' || text === '') {
        return null;
      }
      
      // Clean the response - remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const extractedData = JSON.parse(cleanText);
      
      // Get current session
      const session = getPatientSession(phoneNumber);
      
      // Check for corrupted language value in existing session
      if (session.language && session.language.includes('Please provide the text you want me to correct')) {
        session.language = 'English';
        updatePatientSession(phoneNumber, { language: 'English' });
      }
      
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
      // Always set language - use extracted value or default to English
      updates.language = extractedData.language || 'English';
      
      // Correct spelling in the updates if any text fields are present (except language)
      if (updates.name || updates.disease) {
        // Correct individual fields for better efficiency (skip language)
        if (updates.name) {
          updates.name = await this.correctSingleField(updates.name, 'name');
        }
        if (updates.disease) {
          updates.disease = await this.correctSingleField(updates.disease, 'disease');
        }
      }
      
      if (Object.keys(updates).length > 0) {
        updatePatientSession(phoneNumber, updates);
      }
      
      // Check if session is now complete
      const updatedSession = getPatientSession(phoneNumber);
      
      if (isSessionComplete(updatedSession)) {
        const finalData = {
          name: updatedSession.name!,
          age: updatedSession.age!,
          gender: updatedSession.gender!,
          disease: updatedSession.disease!,
          phone_number: phoneNumber,
          language: updatedSession.language || 'English' // Default to English if not provided
        };
        
        return finalData;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Explain a disease or condition in simple terms
   * @param disease - The disease/condition to explain
   * @returns Promise<string> - Simple explanation of the condition
   */
  async explainDisease(disease: string): Promise<string> {
    const prompt = `Explain this health condition in simple, patient-friendly terms: "${disease}"

Instructions:
- Provide a brief, easy-to-understand explanation
- Use simple language (avoid medical jargon)
- Keep it under 2 sentences
- Be reassuring but informative
- Focus on what the patient should know

Examples:
- "pain in left eye" → "This could be eye strain, infection, or injury. It's important to get it checked."
- "fever" → "A fever is your body's way of fighting infection. Rest and fluids help."
- "headache" → "Headaches can be caused by stress, dehydration, or other factors. Rest often helps."

Return only the explanation, nothing else.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      return `I understand you're experiencing ${disease}. Let me help you get the care you need.`;
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
      // Extract patient data from message
      const patientData = await this.extractPatientData(message, phoneNumber);
      
      if (!patientData) {
        // Check if we have a partial session
        const session = getPatientSession(phoneNumber);
        const missingFields = getMissingFields(session);
        
        if (missingFields.length > 0) {
          // Generate response asking for missing fields
          const missingFieldsResponse = await this.generateMissingFieldsResponse(session, missingFields);
          
          return {
            success: false,
            message: missingFieldsResponse
          };
        } else {
          return {
            success: false,
            message: "I couldn't understand the information. Please provide: Name, Age, Gender, Disease, Language (e.g., John, 25, Male, Diabetes, English)"
          };
        }
      }
      
      // Check if patient already exists
      const exists = await this.checkPatientExists(phoneNumber);
      if (exists) {
        clearPatientSession(phoneNumber); // Clear session
        return {
          success: false,
          message: "You're already registered! How may I help you today?"
        };
      }
      
      // Correct spelling mistakes in patient data
      const correctedPatientData = await this.correctSpellingMistakes(patientData);
      
      // Use AI to assign priority based on corrected patient information
      const priority = await this.assignPriorityWithAI(correctedPatientData);
      
      // Add priority to corrected patient data
      const patientDataWithPriority = {
        ...correctedPatientData,
        priority
      };
      
      // Insert corrected patient data into database
      const insertedPatient = await insertPatient(patientDataWithPriority);
      
      // Clear session after successful registration
      clearPatientSession(phoneNumber);
      
      // Check if any corrections were made
      const hasCorrections = 
        patientData.name !== correctedPatientData.name ||
        patientData.disease !== correctedPatientData.disease ||
        patientData.language !== correctedPatientData.language;
      
      // Generate disease explanation
      const diseaseExplanation = await this.explainDisease(correctedPatientData.disease);
      
      const correctionMessage = hasCorrections ? 
        " (I've corrected some spelling in your information)" : "";
      
      return {
        success: true,
        message: `Welcome ${correctedPatientData.name}! Your registration is complete${correctionMessage}. ${diseaseExplanation} How may I help you today?`,
        patientData: insertedPatient
      };
    } catch (error) {
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
   * @returns Promise<string> - Response asking for missing information
   */
  async generateMissingFieldsResponse(session: any, missingFields: string[]): Promise<string> {
    const prompt = `You are a healthcare assistant for Upchar AI.

Current session data:
- Name: ${session.name || 'Not provided'}
- Age: ${session.age || 'Not provided'}
- Gender: ${session.gender || 'Not provided'}
- Disease/Condition: ${session.disease || 'Not provided'}
- Language: ${session.language || 'English'}

Missing information: ${missingFields.join(', ')}

Instructions:
- Ask for the missing information naturally and conversationally
- For disease/condition: Ask in a way that encourages natural descriptions
- Examples: "What symptoms are you experiencing?" or "What health issue brings you here today?"
- Keep response under 2 sentences
- Be encouraging and helpful
- Respond in ${session.language || 'English'}
- Do NOT ask for address or other fields not in our database
- Make it feel like a natural conversation, not a form

Remember: Help the patient feel comfortable sharing their health information.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      // Fallback response
      const fieldNames = missingFields.map(field => {
        switch (field) {
          case 'name': return 'your full name';
          case 'age': return 'your age';
          case 'gender': return 'your gender (Male/Female/Other)';
          case 'disease': return 'what symptoms or health issue you\'re experiencing';
          default: return field;
        }
      });
      
      return `I need a few more details: ${fieldNames.join(', ')}. Please share this information so I can help you better.`;
    }
  }

  /**
   * Generate response for existing patient
   * @param patientData - Patient information
   * @returns Promise<string> - AI response for existing patient
   */
  async generateExistingPatientResponse(patientData: PatientData): Promise<string> {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      const fallbackResponse = `Hello ${patientData.name}! How may I help you today?`;
      
      return fallbackResponse;
    }
  }

  /**
   * Generate response for new patient registration
   * @param phoneNumber - Patient's phone number
   * @returns Promise<string> - AI response for new patient registration
   */
  async generateNewPatientResponse(phoneNumber: string): Promise<string> {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      const fallbackResponse = `Welcome to Upchar AI! To provide personalized care, I need your full name.`;
      
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
      let prompt = this.buildPrompt(messages, calendarEvents);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      throw new Error('Failed to get response from Gemini');
    }
  }

  private buildPrompt(messages: ChatMessage[], calendarEvents?: CalendarEvent[]): string {
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
    });

    // Add calendar context if available
    if (calendarEvents && calendarEvents.length > 0) {
      prompt += `\nCurrent calendar events:\n`;
      calendarEvents.forEach((event, index) => {
        prompt += `- ${event.summary} (${event.start.dateTime} to ${event.end.dateTime})\n`;
      });
    }

    prompt += `\nPlease respond as the AI assistant. If the user asks about calendar operations, provide helpful information and suggest appropriate actions.`;

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
      return 'Unable to generate calendar insights at this time.';
    }
  }

  /**
   * Assign priority using AI based on patient information
   * @param patientData - Patient information
   * @returns Promise<'High' | 'Medium' | 'Low'> - AI-assigned priority
   */
  async assignPriorityWithAI(patientData: PatientData): Promise<'High' | 'Medium' | 'Low'> {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Clean and validate the response
      const cleanPriority = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
      
      if (cleanPriority === 'high') {
        return 'High';
      } else if (cleanPriority === 'medium') {
        return 'Medium';
      } else if (cleanPriority === 'low') {
        return 'Low';
      } else {
        return 'Medium';
      }
    } catch (error) {
      return 'Medium';
    }
  }

  /**
   * Correct spelling mistakes in patient data using AI
   * @param patientData - Patient data that may contain spelling mistakes
   * @returns Promise<PatientData> - Corrected patient data
   */
  async correctSpellingMistakes(patientData: PatientData): Promise<PatientData> {
    // Preserve original language without correction (SarvamAI will handle translation)
    const originalLanguage = patientData.language || 'English';
    
    const prompt = `You are a healthcare AI assistant. Correct any spelling mistakes in this patient information while preserving the original meaning.

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Disease/Condition: ${patientData.disease}
- Language: ${originalLanguage}

Instructions:
- Correct spelling mistakes in names and diseases only
- Preserve the original meaning and intent
- Keep proper nouns (names) as close to original as possible
- Correct medical terms and common words
- Do NOT correct or translate the language field
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
  "language": "${originalLanguage}"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      const correctedData = JSON.parse(text);
      
      // Create corrected patient data (preserve original language)
      const correctedPatientData: PatientData = {
        name: correctedData.name,
        age: correctedData.age,
        gender: correctedData.gender,
        disease: correctedData.disease,
        phone_number: patientData.phone_number,
        language: originalLanguage // Preserve original language for SarvamAI
      };
      
      return correctedPatientData;
    } catch (error) {
      return patientData;
    }
  }

  /**
   * Correct spelling in a single field
   * @param text - Text to correct
   * @param fieldType - Type of field (name, disease, language)
   * @returns Promise<string> - Corrected text
   */
  async correctSingleField(text: string, fieldType: 'name' | 'disease' | 'language'): Promise<string> {
    // Handle empty or null text
    if (!text || text.trim() === '') {
      return text;
    }
    
    // Skip language field processing (SarvamAI will handle translation)
    if (fieldType === 'language') {
      return text; // Return original text without any processing
    }
    
    let prompt: string;
    
    if (fieldType === 'name') {
      prompt = `Correct any spelling mistakes in this name: "${text}"

Instructions:
- Correct spelling errors
- Keep the original name structure
- Return only the corrected name
- If the name is already correct, return it as is

Return only the corrected name, nothing else.`;
    } else if (fieldType === 'disease') {
      prompt = `Clean and correct this disease/condition description: "${text}"

Instructions:
- Remove filler words like "my", "little", "some", "a", "the", "I have", "I'm having", "suffering from", "feeling"
- Convert to clear medical terminology
- Correct any spelling mistakes
- Keep the essential medical information
- Examples:
  * "Pain in my left eye" → "pain in left eye"
  * "I have a little fever" → "fever"
  * "my head hurts" → "headache"
  * "suffering from diabetes" → "diabetes"
  * "feeling chest pain" → "chest pain"
  * "little cough" → "cough"

Return only the cleaned and corrected disease description, nothing else.`;
    } else {
      return text; // For any other field type, return as is
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const correctedText = response.text().trim();
      
      return correctedText;
    } catch (error) {
      return text;
    }
  }
} 