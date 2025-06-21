import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { method, params } = body;

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken
    });

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    let result;

    switch (method) {
      case 'list_events':
        result = await calendar.events.list({
          calendarId: 'primary',
          timeMin: params.timeMin,
          timeMax: params.timeMax,
          maxResults: params.maxResults || 10,
          singleEvents: true,
          orderBy: 'startTime'
        });
        break;

      case 'create_event':
        result = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: params.summary,
            description: params.description,
            start: {
              dateTime: params.start.dateTime,
              timeZone: params.start.timeZone
            },
            end: {
              dateTime: params.end.dateTime,
              timeZone: params.end.timeZone
            }
          }
        });
        break;

      case 'update_event':
        result = await calendar.events.update({
          calendarId: 'primary',
          eventId: params.eventId,
          requestBody: {
            summary: params.summary,
            description: params.description,
            start: {
              dateTime: params.start.dateTime,
              timeZone: params.start.timeZone
            },
            end: {
              dateTime: params.end.dateTime,
              timeZone: params.end.timeZone
            }
          }
        });
        break;

      case 'delete_event':
        result = await calendar.events.delete({
          calendarId: 'primary',
          eventId: params.eventId
        });
        break;

      default:
        return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
    }

    return NextResponse.json({ result: result.data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 