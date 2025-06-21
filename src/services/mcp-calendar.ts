import { config } from '@/config/env';
import { CalendarEvent } from './gemini';

export interface MCPCalendarRequest {
  method: string;
  params: any;
}

export interface MCPCalendarResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class MCPCalendarService {
  private serverUrl: string;

  constructor() {
    this.serverUrl = config.mcp.serverUrl;
  }

  async listEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    try {
      const response = await this.makeMCPRequest({
        method: 'calendar.events.list',
        params: {
          calendarId,
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        }
      });

      if (response.success && response.data) {
        return response.data.items.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location
        }));
      }

      return [];
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  async createEvent(event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: string;
  }): Promise<CalendarEvent> {
    try {
      const response = await this.makeMCPRequest({
        method: 'calendar.events.insert',
        params: {
          calendarId: 'primary',
          resource: event
        }
      });

      if (response.success && response.data) {
        return {
          id: response.data.id,
          summary: response.data.summary,
          description: response.data.description,
          start: response.data.start,
          end: response.data.end,
          location: response.data.location
        };
      }

      throw new Error('Failed to create event');
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await this.makeMCPRequest({
        method: 'calendar.events.update',
        params: {
          calendarId: 'primary',
          eventId,
          resource: updates
        }
      });

      if (response.success && response.data) {
        return {
          id: response.data.id,
          summary: response.data.summary,
          description: response.data.description,
          start: response.data.start,
          end: response.data.end,
          location: response.data.location
        };
      }

      throw new Error('Failed to update event');
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const response = await this.makeMCPRequest({
        method: 'calendar.events.delete',
        params: {
          calendarId: 'primary',
          eventId
        }
      });

      return response.success;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  async getCalendarList(): Promise<any[]> {
    try {
      const response = await this.makeMCPRequest({
        method: 'calendar.calendarList.list',
        params: {}
      });

      if (response.success && response.data) {
        return response.data.items || [];
      }

      return [];
    } catch (error) {
      console.error('Error getting calendar list:', error);
      throw new Error('Failed to fetch calendar list');
    }
  }

  private async makeMCPRequest(request: MCPCalendarRequest): Promise<MCPCalendarResponse> {
    try {
      // Use relative URL for Next.js API routes
      const apiUrl = this.serverUrl === 'http://localhost:3000' 
        ? '/api/mcp/calendar' 
        : `${this.serverUrl}/mcp/calendar`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('MCP request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 