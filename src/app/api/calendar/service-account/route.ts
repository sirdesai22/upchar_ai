import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Initialize Google Calendar API
const calendar = google.calendar('v3')

/**
 * Get Google Auth client using service account
 */
async function getServiceAccountAuth() {
  // You'll need to set up a service account and download the JSON key file
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, // Path to your service account JSON file
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  return auth.getClient()
}

// GET - List events (for a specific calendar or user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const maxResults = parseInt(searchParams.get('maxResults') || '10')
    const calendarId = searchParams.get('calendarId') || 'primary'

    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    })

    const events = response.data.items?.map((event: any) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      attendees: event.attendees
    })) || []

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error listing calendar events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

// POST - Create event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summary, description, startDateTime, endDateTime, timeZone, location, attendees } = body

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: timeZone || 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone || 'UTC'
      },
      location,
      attendees
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    })

    const createdEvent = {
      id: response.data.id,
      summary: response.data.summary,
      description: response.data.description,
      start: response.data.start,
      end: response.data.end,
      location: response.data.location,
      attendees: response.data.attendees
    }

    return NextResponse.json(createdEvent)
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    )
  }
} 