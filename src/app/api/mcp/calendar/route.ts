import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { config } from '@/config/env';

// Initialize Google Calendar API
const calendar = google.calendar('v3');

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json();

    // For demo purposes, we'll use a service account or API key
    // In production, you'd want proper OAuth2 flow
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const authClient = await auth.getClient();

    let result;

    switch (method) {
      case 'calendar.events.list':
        result = await calendar.events.list({
          auth: authClient,
          ...params,
        });
        break;

      case 'calendar.events.insert':
        result = await calendar.events.insert({
          auth: authClient,
          ...params,
        });
        break;

      case 'calendar.events.update':
        result = await calendar.events.update({
          auth: authClient,
          ...params,
        });
        break;

      case 'calendar.events.delete':
        result = await calendar.events.delete({
          auth: authClient,
          ...params,
        });
        break;

      case 'calendar.calendarList.list':
        result = await calendar.calendarList.list({
          auth: authClient,
          ...params,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown method' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 