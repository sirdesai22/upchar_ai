import twilio from "twilio";
import { GeminiService } from "@/services/gemini";
import { getPatientByPhone } from "@/services/supabase";
import { supabase } from "@/lib/supabase-client";
import { formatPhoneNumber } from "@/lib/utils";

const intents = [
  "register",
  "enquiry",
  "book appointment",
  "cancel appointment",
  "change language",
]

export async function POST(request: Request) {
  try {
    // Parse the incoming form data from Twilio
    const formData = await request.formData();
    const incomingMessage = formData.get("Body") as string;
    const fromNumber = formData.get("From") as string;

    // Format the phone number to 10-digit format
    const formattedPhoneNumber = formatPhoneNumber(fromNumber);

    let response: string;

    const geminiService = new GeminiService();

    let user_intent: any = await geminiService.getIntent(incomingMessage, intents);
    console.log(user_intent);
    //format the user_intent to json
    //remove the ```json and ``` from the user_intent
    user_intent = user_intent.replace(/```json\s*/, '').replace(/\s*```$/, '');
    user_intent = JSON.parse(user_intent);
    console.log(user_intent);

    switch (user_intent.intent) {
      case "register":
        response = await geminiService.generateNewPatientResponse(formattedPhoneNumber);
        break;
      case "enquiry":
        response = await geminiService.generateExistingPatientResponse(formattedPhoneNumber);
        break;
      case "book appointment":
        response = await geminiService.bookAppointment(incomingMessage, formattedPhoneNumber);
        break;
      case "cancel appointment":
        response = await geminiService.cancelAppointment(incomingMessage, formattedPhoneNumber);
        break;
      case "change language":
        response = await geminiService.changeLanguage(incomingMessage, formattedPhoneNumber);
        break;
      default:
        response = "Sorry, I didn't understand your message. Please try again.";
        break;
    }

    // Check if this is a new conversation (first message)
    const hasCommas = (incomingMessage.match(/,/g) || []).length >= 3;

    // Check for natural language patient information patterns
    const hasPatientInfo =
      hasCommas ||
      /\d+\s*(?:yrs?|years?|age)/i.test(incomingMessage) || // age pattern
      /\b(?:male|female|m|f)\b/i.test(incomingMessage) || // gender pattern
      /\b(?:headache|fever|pain|diabetes|heart|asthma|cancer|stroke|hypertension|diabetes|asthma|pneumonia|fever|chest pain|breathing difficulty|severe pain|bleeding|unconscious|seizure|allergic reaction|heart_problem|heart disease|cardiac|headache|cold|cough|fever|stomach ache|back pain|joint pain|skin rash|eye problem|ear pain|dental issue)\b/i.test(
        incomingMessage
      ); // disease patterns

    const isGreeting =
      !hasPatientInfo &&
      (incomingMessage.toLowerCase().includes("hello") ||
        incomingMessage.toLowerCase().includes("hi") ||
        incomingMessage.toLowerCase().includes("start") ||
        incomingMessage.toLowerCase().includes("help"));

    if (isGreeting) {
      // Check if patient exists in database
      const patientExists = await geminiService.checkPatientExists(formattedPhoneNumber);

      if (patientExists) {
        // Get patient data from database
        const patientData = await getPatientByPhone(formattedPhoneNumber);

        if (patientData) {
          // Generate response for existing patient
          response = await geminiService.generateExistingPatientResponse(
            formattedPhoneNumber
          );
        } else {
          // Fallback if patient data not found
          response = "Hello! How may I help you today?";
        }
      } else {
        // Generate response for new patient registration
        response = await geminiService.generateNewPatientResponse(formattedPhoneNumber);
      }
    } else {
      const patientExists = await geminiService.checkPatientExists(formattedPhoneNumber);

      // Check if we have an existing session for this phone number
      const { getPatientSession } = await import("@/lib/patient-sessions");
      const existingSession = getPatientSession(formattedPhoneNumber);
      const hasExistingSession =
        existingSession.name ||
        existingSession.age ||
        existingSession.gender ||
        existingSession.disease ||
        existingSession.language;

      if (!patientExists && (hasPatientInfo || hasExistingSession)) {
        // Test Supabase connection first
        // const connectionTest = await testSupabaseConnection();

        if (!supabase) {
          response =
            "Sorry, there's a technical issue. Please try again later.";
        } else {
          // Try to process and store patient data
          const result = await geminiService.processAndStorePatientData(
            incomingMessage,
            formattedPhoneNumber
          );

          response = result.message;
        }
      } else if (patientExists) {
        // Handle ongoing conversation for existing patients
        const patientData = await getPatientByPhone(formattedPhoneNumber);

        if (patientData) {
          // Create context-aware prompt
          const contextPrompt = `Patient: ${patientData.name} (${
            patientData.age
          } years, ${patientData.gender})
Condition: ${patientData.disease}

User: ${incomingMessage}

Instructions:
- Respond as a caring healthcare assistant
- Use patient's name when appropriate
- Keep response under 3 sentences
- Be helpful and concise
- Respond in ${patientData.language || "English"}

Remember: Provide support, not medical advice.`;

          response = await geminiService.chat(
            [{ role: "user", content: contextPrompt }],
            undefined,
            patientData.language
          );
        } else {
          // Fallback to regular chat
          response = await geminiService.chat([
            { role: "user", content: incomingMessage },
          ]);
        }
      } else {
        // For new patients with no detected info and no session, ask for all required fields
        response = await geminiService.generateNewPatientResponse(formattedPhoneNumber);
      }
    }

    // Create TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(response);

    // Return XML response
    return new Response(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    // Return error response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Sorry, something went wrong. Please try again later.");

    return new Response(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
