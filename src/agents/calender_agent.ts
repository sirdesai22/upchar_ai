//calendar agent

import { GeminiService } from "@/services/gemini";
import { getPatientByPhone } from "@/services/supabase";

const geminiService = new GeminiService();

const calenderAgent = async (message: string) => {
    const prompt = `
    Analyse the message and determine the user's intent. Provide the output in the following JSON format:
    {
        "method": "", // Options: calendar.events.list, calendar.events.insert, calendar.events.update, calendar.events.delete
        "params": {
            "summary": "", // Summary of the patient's appointment
            "description": "", // Purpose of visit/appointment description
            "start": {
                "dateTime": "", // Example: 2025-06-22T09:00:00+05:30
                "timeZone": "Asia/Kolkata"
            },
            "end": {
                "dateTime": "", // Example: 2025-06-22T10:00:00+05:30
                "timeZone": "Asia/Kolkata"
            }
        }
    }
    Message: ${message}
    `

    const response = await geminiService.chat([
        { role: 'user', content: prompt }
    ]);

    return response;
}

export default calenderAgent;