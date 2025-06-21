import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { supabase } from '@/lib/supabase-client'

// Initialize Google Calendar API
const calendar = google.calendar('v3')

/**
 * Get Google OAuth2 client with access token from URL
 */
async function getOAuth2Client(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accessToken = searchParams.get('access_token')
  
  if (!accessToken) {
    throw new Error('No access token provided in URL parameters')
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: accessToken
  })

  return oauth2Client
}
export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json();

    // For demo purposes, we'll use a service account or API key
    // In production, you'd want proper OAuth2 flow
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    //   scopes: ['https://www.googleapis.com/auth/calendar'],
    // });

    const authClient = await getOAuth2Client(request);

    let result;
    switch (method) {
      case 'calendar.events.list':
        result = await calendar.events.list({
          auth: authClient,
          calendarId: 'primary',
        });
        break;

      case 'calendar.events.insert':
        result = await calendar.events.insert({
          auth: authClient,
          calendarId: 'primary',
          requestBody: params,
        });
        break;

      case 'calendar.events.update':
        result = await calendar.events.update({
          auth: authClient,
          calendarId: 'primary',
          ...params,
        });
        break;

      case 'calendar.events.delete':
        result = await calendar.events.delete({
          auth: authClient,
          calendarId: 'primary',
          ...params,
        });
        break;

      case 'calendar.calendarList.list':
        result = await calendar.calendarList.list({
          auth: authClient,
          calendarId: 'primary',
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
    console.error('MCP Calendar API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 