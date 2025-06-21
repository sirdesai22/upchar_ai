import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/config/env';

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

  async chat(messages: ChatMessage[], calendarEvents?: CalendarEvent[]): Promise<string> {
    try {
      let prompt = this.buildPrompt(messages, calendarEvents);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in Gemini chat:', error);
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
    messages.forEach(message => {
      prompt += `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}\n`;
    });

    // Add calendar context if available
    if (calendarEvents && calendarEvents.length > 0) {
      prompt += `\nCurrent calendar events:\n`;
      calendarEvents.forEach(event => {
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
      console.error('Error generating calendar insights:', error);
      return 'Unable to generate calendar insights at this time.';
    }
  }
} 