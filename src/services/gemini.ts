import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/config/env';
import { checkPhoneExists, getPatientByPhone, insertPatient, PatientData } from './supabase';
import { getPatientSession, updatePatientSession, clearPatientSession, isSessionComplete, getMissingFields } from '@/lib/patient-sessions';
import { sarvamService } from './sarvam';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CalendarEvent {
  id: string;
  description?: string;
  summary: string;
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

// Local interface for patient data during processing
export interface PatientDataInput {
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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async getIntent(message: string, intents: string[]): Promise<string> {
    const prompt = `Analyse the message and determine the user's intent. Provide the output in the following JSON format:
    {
      "intent": "", // Output single intent from the list of intents
    }
      Message: ${message}
      make sure the intent is one of the following: ${intents.join(', ')}
    `

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    return text;
  }

 async bookAppointment(message: string, phoneNumber: string): Promise<string> {
  try{
  const patientData = await getPatientByPhone(phoneNumber);
  console.log(patientData);

  if(!patientData) {
    return "You are not registered. Please register first.";
  }

  const prompt = `Book an appointment for the patient with the following message: ${message} and patient data: ${JSON.stringify(patientData)} consider the patient priority and disease in the appointment booking
    output the response in the following json format:
    {
      method: "calendar.events.insert", // calendar.events.list, calendar.events.insert, calendar.events.update, calendar.events.delete
      params: {
        summary: "", // Priority of the appointment
        description: "", // purpose of visit/appointment description
        start: {
          dateTime: "", // example: 2025-06-22T09:00:00+05:30
          timeZone: "Asia/Kolkata"
        },
        end: {
          dateTime: "",
          timeZone: "Asia/Kolkata"
        }
      }
    }
    }
  `;
  const result = await this.model.generateContent(prompt);
    //convert the result to json
    //remove the ```json and ``` from the result
    const text = JSON.parse(result.response.text().trim().replace(/```json\s*/, '').replace(/\s*```$/, ''));

  console.log(text);


  //book the appointment
  //call the google calendar api to book the appointment
  const response = await fetch(`http://localhost:3000/api/calendar/events`, {
    method: "POST",
    body: JSON.stringify(text),
    headers: {
      "Content-Type": "application/json"
    }
  });
  if(response.status !== 200) {
    return "Sorry, there was an error booking the appointment. Please try again.";
  }

  console.log(response);

  const data = await response.json();

  console.log(data);

  return "Appointment booked successfully";
  } catch (error) {
    console.error(error);
    return "Sorry, there was an error booking the appointment. Please try again. Error: " + error;
  }
 }


 //will do same for cancel appointment
 async cancelAppointment(message: string, phoneNumber: string): Promise<string> {
  try {
    const patientData = await getPatientByPhone(phoneNumber);
    console.log(patientData);
    
    if (!patientData) {
      return "You are not registered. Please register first.";
    }

    const prompt = `Cancel an appointment for the patient with the following message: ${message} and patient data: ${JSON.stringify(patientData)} 
    First, get all events for today and tomorrow, then find which event the user wants to cancel based on their message.
    output the response in the following json format:
    {
      method: "calendar.events.list", // First get events
      params: {
        calendarId: "primary",
        //based on the patient date and time, get the events for that day and time
        timeMin: "2025-01-20T00:00:00Z", // Today's date
        timeMax: "2025-01-22T00:00:00Z", // Tomorrow's date
        maxResults: 50
      }
    }
    After getting the events, analyze which event matches the user's request and return:
    {
      method: "calendar.events.delete",
      params: {
        eventId: "event_id_here" // The ID of the event to cancel
      }
    }
      just return the json format, no other text
    `;
    const result = await this.model.generateContent(prompt);
    console.log(result.response.text().trim());
    //convert the result to json
    //remove the ```json and ``` from the result
    const text = JSON.parse(result.response.text().trim().replace(/```json\s*/, '').replace(/\s*```$/, ''));

    console.log(text);

    // First, get all events for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventsResponse = await fetch(`http://localhost:3000/api/calendar/events`, {
      method: "POST",
      body: JSON.stringify({
        method: "calendar.events.list",
        params: {
          calendarId: "primary",
          timeMin: today.toISOString(),
          timeMax: tomorrow.toISOString(),
          maxResults: 50
        }
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (eventsResponse.status !== 200) {
      return "Sorry, there was an error getting your appointments. Please try again.";
    }

    const eventsData = await eventsResponse.json();
    console.log("All events:", eventsData);

    if (!eventsData.data || !eventsData.data.items || eventsData.data.items.length === 0) {
      return "You don't have any appointments scheduled for today or tomorrow.";
    }

    // Use AI to find the matching event based on user's message and available events
    const events = eventsData.data.items;
    const eventsDescription = events.map((event: any, index: number) => 
      `${index + 1}. ID: ${event.id} - ${event.summary || 'No title'} - ${event.description || 'No description'} - ${event.start?.dateTime || 'No time'}`
    ).join('\n');

    const matchPrompt = `The user wants to cancel an appointment. Here are their available appointments:

${eventsDescription}

User's message: "${message}"

Patient data: ${JSON.stringify(patientData)}

Instructions:
- Analyze the user's message and match it to one of the appointments above
- Consider the patient's name, disease, and any specific details mentioned
- Return the event ID of the appointment to cancel
- If no clear match is found, return "no_match"

Return only the event ID or "no_match" in JSON format with no other text:
{
  "eventId": "event_id_here"
}
strictly follow the json format, no other text
`;

    const matchResult = await this.model.generateContent(matchPrompt);
    const matchText = matchResult.response.text().trim();
    
    // Parse the AI response
    let matchData;
    try {
      const cleanText = matchText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      console.log(cleanText);
      matchData = JSON.parse(cleanText);
    } catch (error) {
      console.error("Failed to parse AI match response:", error);
      return "Sorry, I couldn't understand which appointment you want to cancel. Please be more specific.";
    }

    if (matchData.eventId === "no_match" || !matchData.eventId) {
      return "I couldn't find a matching appointment. Please specify which appointment you want to cancel, or check your appointments first.";
    }

    // Verify the event ID exists in the events list
    const selectedEvent = events.find((event: any) => event.id === matchData.eventId);
    if (!selectedEvent) {
      return "Invalid appointment selection. Please try again.";
    }

    console.log("Selected event to cancel:", selectedEvent);

    // Now cancel the specific event
    const cancelResponse = await fetch(`http://localhost:3000/api/calendar/events`, {
      method: "POST",
      body: JSON.stringify({
        method: "calendar.events.delete",
        params: {
          eventId: matchData.eventId
        }
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (cancelResponse.status !== 200) {
      return "Sorry, there was an error cancelling the appointment. Please try again.";
    }

    const cancelData = await cancelResponse.json();
    console.log("Cancel response:", cancelData);

    return `Appointment "${selectedEvent.summary || 'your appointment'}" has been cancelled successfully.`;
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return "Sorry, there was an error cancelling the appointment. Please try again.";
  }
}   

  async changeLanguage(message: string, phoneNumber: string): Promise<string> {

    const patientData = await getPatientByPhone(phoneNumber);
    console.log(patientData);

    if(!patientData) {
      return "You are not registered. Please register first.";
    }

    //go to database and update the language
    const updatedPatientData = await updatePatientSession(phoneNumber, { language: message });
    console.log(updatedPatientData);

    return "Language changed successfully";
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
   * @returns Promise<PatientDataInput | null> - Extracted patient data or null if invalid
   */
  async extractPatientData(message: string, phoneNumber: string): Promise<PatientDataInput | null> {
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
      
      const finalMessage = `Welcome ${correctedPatientData.name}! Your registration is complete${correctionMessage}. ${diseaseExplanation} How may I help you today?`;
      
      // Translate the final message if needed
      let translatedMessage = finalMessage;
      if (correctedPatientData.language && sarvamService.isTranslationNeeded(correctedPatientData.language)) {
        const translation = await sarvamService.translateRegistrationMessage(finalMessage, correctedPatientData.language);
        translatedMessage = translation.success ? translation.translatedText! : finalMessage;
      }
      
      return {
        success: true,
        message: translatedMessage,
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
   * Generate response for existing patient
   * @param patientData - Patient data for response generation
   * @returns Promise<string> - Generated response
   */
  async generateExistingPatientResponse(phoneNumber: string): Promise<string> {

    const patientData = await getPatientByPhone(phoneNumber);
    console.log(patientData);

    if(!patientData) {
      return "You are not registered. Please register first.";
    }
    const prompt = `You are a healthcare assistant for Upchar AI. 

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age} years
- Gender: ${patientData.gender}
- Condition: ${patientData.disease}
- Language: ${patientData.language || 'English'}

Instructions:
- Greet the patient warmly using their name
- Acknowledge their previous registration
- Ask how you can help them today
- Keep response under 2 sentences
- Be friendly and professional
- Respond in ${patientData.language || 'English'}

Remember: This is a returning patient who is already registered.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Translate response if needed
      if (patientData.language && sarvamService.isTranslationNeeded(patientData.language)) {
        const translation = await sarvamService.translateGeminiResponse(text, patientData.language);
        return translation.success ? translation.translatedText! : text;
      }
      
      return text;
    } catch (error) {
      const fallbackResponse = `Hello ${patientData.name}! How may I help you today?`;
      
      // Translate fallback response if needed
      if (patientData.language && sarvamService.isTranslationNeeded(patientData.language)) {
        const translation = await sarvamService.translateGeminiResponse(fallbackResponse, patientData.language);
        return translation.success ? translation.translatedText! : fallbackResponse;
      }
      
      return fallbackResponse;
    }
  }

  /**
   * Generate response for new patient registration
   * @param phoneNumber - Patient's phone number
   * @returns Promise<string> - Generated response
   */
  async generateNewPatientResponse(phoneNumber: string): Promise<string> {
    const prompt = `You are a healthcare assistant for Upchar AI. 

Instructions:
- Welcome a new patient to the system
- Ask for their full name to start registration
- Keep response under 2 sentences
- Be welcoming and encouraging
- Make it feel like a natural conversation
- Use a friendly, professional tone

Remember: This is a new patient who needs to register.`;

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
   * Generate missing fields response
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
      
      // Translate response if needed
      if (session.language && sarvamService.isTranslationNeeded(session.language)) {
        const translation = await sarvamService.translateGeminiResponse(text, session.language);
        return translation.success ? translation.translatedText! : text;
      }
      
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
      
      const fallbackResponse = `I need a few more details: ${fieldNames.join(', ')}. Please share this information so I can help you better.`;
      
      // Translate fallback response if needed
      if (session.language && sarvamService.isTranslationNeeded(session.language)) {
        const translation = await sarvamService.translateGeminiResponse(fallbackResponse, session.language);
        return translation.success ? translation.translatedText! : fallbackResponse;
      }
      
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
      return await this.generateExistingPatientResponse(phoneNumber!);
    } else if (phoneNumber) {
      return await this.generateNewPatientResponse(phoneNumber);
    } else {
      return "Welcome to Upchar AI! I'm here to help you with your healthcare needs. How may I assist you today?";
    }
  }

  /**
   * Chat with Gemini AI
   * @param messages - Array of chat messages
   * @param calendarEvents - Optional calendar events for context
   * @param patientLanguage - Patient's preferred language for translation
   * @returns Promise<string> - AI response
   */
  async chat(messages: ChatMessage[], calendarEvents?: CalendarEvent[], patientLanguage?: string): Promise<string> {
    try {
      let prompt = this.buildPrompt(messages, calendarEvents);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Translate response if needed
      if (patientLanguage && sarvamService.isTranslationNeeded(patientLanguage)) {
        const translation = await sarvamService.translateGeminiResponse(text, patientLanguage);
        return translation.success ? translation.translatedText! : text;
      }
      
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
   * Correct spelling mistakes in patient data
   * @param patientData - Patient data to correct
   * @returns Promise<PatientDataInput> - Corrected patient data
   */
  async correctSpellingMistakes(patientData: PatientDataInput): Promise<PatientDataInput> {
    // Preserve original language without correction (SarvamAI will handle translation)
    const originalLanguage = patientData.language || 'English';
    
    const prompt = `You are a healthcare AI assistant. Correct any spelling mistakes in this patient information while preserving the original meaning.

Name: "${patientData.name}"
Age: ${patientData.age}
Gender: ${patientData.gender}
Disease: "${patientData.disease}"
Language: "${originalLanguage}"

Instructions:
- Correct spelling mistakes in name and disease
- Keep the original meaning and intent
- For names: keep as close to original as possible, only fix obvious mistakes
- For diseases: correct medical terms and common words
- Preserve the original language field exactly as provided
- Return only the corrected data in JSON format

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
      const correctedPatientData: PatientDataInput = {
        name: correctedData.name || patientData.name,
        age: correctedData.age || patientData.age,
        gender: correctedData.gender || patientData.gender,
        disease: correctedData.disease || patientData.disease,
        phone_number: patientData.phone_number,
        language: originalLanguage // Always preserve original language
      };
      
      return correctedPatientData;
    } catch (error) {
      return patientData;
    }
  }

  /**
   * Assign priority using AI
   * @param patientData - Patient data for priority assignment
   * @returns Promise<'High' | 'Medium' | 'Low'> - Assigned priority
   */
  async assignPriorityWithAI(patientData: PatientDataInput): Promise<'High' | 'Medium' | 'Low'> {
    const prompt = `You are a healthcare AI assistant. Analyze this patient's information and assign a priority level.

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Disease/Condition: ${patientData.disease}
- Language: ${patientData.language || 'English'}

Priority Guidelines:
- HIGH: Emergency conditions, severe pain, life-threatening symptoms
  Examples: chest pain, severe bleeding, unconsciousness, difficulty breathing, severe trauma
- MEDIUM: Moderate symptoms, chronic conditions, non-urgent but concerning
  Examples: fever, moderate pain, chronic diseases, persistent symptoms
- LOW: Mild symptoms, routine check-ups, minor issues
  Examples: mild headache, cold symptoms, minor injuries, general wellness

Return only: "High", "Medium", or "Low"`;

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