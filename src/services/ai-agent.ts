import { GeminiService, ChatMessage, CalendarEvent } from './gemini';
import { MCPCalendarService } from './mcp-calendar';

export interface AgentResponse {
  message: string;
  events?: CalendarEvent[];
  insights?: string;
  action?: 'list' | 'create' | 'update' | 'delete' | 'insights' | 'chat' | 'error';
}

export class AIAgent {
  private geminiService: GeminiService;
  private calendarService: MCPCalendarService;

  constructor() {
    this.geminiService = new GeminiService();
    this.calendarService = new MCPCalendarService();
  }

  async processMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<AgentResponse> {
    try {
      // Add user message to history
      const updatedHistory = [...conversationHistory, { role: 'user' as const, content: message }];

      // Check if message is calendar-related
      const calendarIntent = this.detectCalendarIntent(message);
      
      if (calendarIntent) {
        return await this.handleCalendarRequest(message, updatedHistory, calendarIntent);
      }

      // Handle general conversation
      const response = await this.geminiService.chat(updatedHistory);
      
      return {
        message: response,
        action: 'chat'
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        action: 'error'
      };
    }
  }

  private detectCalendarIntent(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('calendar') || lowerMessage.includes('event') || lowerMessage.includes('schedule')) {
      if (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('what')) {
        return 'list';
      }
      if (lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('schedule')) {
        return 'create';
      }
      if (lowerMessage.includes('update') || lowerMessage.includes('modify') || lowerMessage.includes('change')) {
        return 'update';
      }
      if (lowerMessage.includes('delete') || lowerMessage.includes('remove') || lowerMessage.includes('cancel')) {
        return 'delete';
      }
      if (lowerMessage.includes('insight') || lowerMessage.includes('analyze') || lowerMessage.includes('summary')) {
        return 'insights';
      }
    }
    
    return null;
  }

  private async handleCalendarRequest(
    message: string, 
    conversationHistory: ChatMessage[], 
    intent: string
  ): Promise<AgentResponse> {
    try {
      switch (intent) {
        case 'list':
          return await this.handleListEvents(message, conversationHistory);
        case 'create':
          return await this.handleCreateEvent(message, conversationHistory);
        case 'update':
          return await this.handleUpdateEvent(message, conversationHistory);
        case 'delete':
          return await this.handleDeleteEvent(message, conversationHistory);
        case 'insights':
          return await this.handleCalendarInsights(message, conversationHistory);
        default:
          return await this.handleGeneralCalendarQuery(message, conversationHistory);
      }
    } catch (error) {
      console.error('Error handling calendar request:', error);
      return {
        message: 'I encountered an error while accessing your calendar. Please check your permissions and try again.',
        action: 'error'
      };
    }
  }

  private async handleListEvents(message: string, conversationHistory: ChatMessage[]): Promise<AgentResponse> {
    const events = await this.calendarService.listEvents();
    const response = await this.geminiService.chat(conversationHistory, events);
    
    return {
      message: response,
      events,
      action: 'list'
    };
  }

  private async handleCreateEvent(message: string, conversationHistory: ChatMessage[]): Promise<AgentResponse> {
    // Extract event details from message using Gemini
    const eventPrompt = `Extract event details from this message: "${message}". 
    Return a JSON object with: summary, description (optional), start (dateTime and timeZone), end (dateTime and timeZone), location (optional).
    Use current timezone if not specified.`;
    
    const extractionResponse = await this.geminiService.chat([
      { role: 'user' as const, content: eventPrompt }
    ]);

    // Parse the response and create event
    try {
      const eventData = JSON.parse(extractionResponse);
      const newEvent = await this.calendarService.createEvent(eventData);
      
      const response = await this.geminiService.chat([
        ...conversationHistory,
        { role: 'assistant' as const, content: `I've created the event: ${newEvent.summary}` }
      ]);

      return {
        message: response,
        events: [newEvent],
        action: 'create'
      };
    } catch (error) {
      return {
        message: 'I had trouble understanding the event details. Please provide the event information in a clear format.',
        action: 'error'
      };
    }
  }

  private async handleUpdateEvent(message: string, conversationHistory: ChatMessage[]): Promise<AgentResponse> {
    // This would require more sophisticated parsing to identify which event to update
    const response = await this.geminiService.chat([
      ...conversationHistory,
      { role: 'assistant' as const, content: 'I can help you update events. Please specify which event you\'d like to modify and what changes you want to make.' }
    ]);

    return {
      message: response,
      action: 'update'
    };
  }

  private async handleDeleteEvent(message: string, conversationHistory: ChatMessage[]): Promise<AgentResponse> {
    // This would require event identification logic
    const response = await this.geminiService.chat([
      ...conversationHistory,
      { role: 'assistant' as const, content: 'I can help you delete events. Please specify which event you\'d like to remove.' }
    ]);

    return {
      message: response,
      action: 'delete'
    };
  }

  private async handleCalendarInsights(message: string, conversationHistory: ChatMessage[]): Promise<AgentResponse> {
    const events = await this.calendarService.listEvents();
    const insights = await this.geminiService.generateCalendarInsights(events);
    const response = await this.geminiService.chat([
      ...conversationHistory,
      { role: 'assistant' as const, content: insights }
    ]);

    return {
      message: response,
      events,
      insights,
      action: 'insights'
    };
  }

  private async handleGeneralCalendarQuery(message: string, conversationHistory: ChatMessage[]): Promise<AgentResponse> {
    const events = await this.calendarService.listEvents();
    const response = await this.geminiService.chat(conversationHistory, events);

    return {
      message: response,
      events,
      action: 'list'
    };
  }
} 