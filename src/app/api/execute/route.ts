import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tool, parameters, userContext } = await request.json();
    
    // Initialize Google Calendar with OAuth token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: userContext.oauth?.google?.access_token
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    let result;
    
    switch (tool) {
      case 'rescheduleByPriority':
        result = await rescheduleByPriority(calendar, parameters);
        break;
      case 'optimizeSchedule':
        result = await optimizeSchedule(calendar, parameters);
        break;
      case 'resolveConflicts':
        result = await resolveConflicts(calendar, parameters);
        break;
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
    
  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}