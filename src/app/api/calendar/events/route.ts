import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { supabase } from '@/lib/supabase-client';

// Initialize Google Calendar API
const calendar = google.calendar('v3')

/**
 * Get Google OAuth2 client with access token from Authorization header
 */
async function getOAuth2Client(request: NextRequest) {
  // const authHeader = request.headers.get('authorization')
  
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   throw new Error('No valid authorization header provided')
  // }

  // const accessToken = authHeader.replace('Bearer ', '')
  
  // if (!accessToken) {
  //   throw new Error('No access token provided in authorization header')
  // }

  const { data, error } = await supabase.from('token').select('token').eq('id', 1);
  if (error) {
    console.error('Error getting token:', error);
  }
  const accessToken = data?.[0]?.token;

  if (!accessToken) {
    throw new Error('No access token provided in authorization header')
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

    const authClient = await getOAuth2Client(request);

    console.log('Calendar API called with:', { method, params });

    let result;
    switch (method) {
      case 'calendar.events.list':
        result = await calendar.events.list({
          auth: authClient,
          calendarId: 'primary',
          timeMin: params?.timeMin,
          timeMax: params?.timeMax,
          maxResults: params?.maxResults || 10,
          orderBy: params?.orderBy || 'startTime',
          singleEvents: params?.singleEvents || true,
          ...params
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
          eventId: params.eventId,
          requestBody: params.requestBody || params,
        });
        break;

      case 'calendar.events.delete':
        result = await calendar.events.delete({
          auth: authClient,
          calendarId: 'primary',
          eventId: params.eventId,
        });
        break;

      case 'calendar.calendarList.list':
        result = await calendar.calendarList.list({
          auth: authClient,
          ...params
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
    console.error('MCP Calendar API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 