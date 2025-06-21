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

// GET - List events
export async function GET(request: NextRequest) {
  try {
    const auth = await getOAuth2Client(request)
    
    const { searchParams } = new URL(request.url)
    const maxResults = parseInt(searchParams.get('maxResults') || '10')

    const response = await calendar.events.list({
      auth,
      calendarId: 'primary',
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
    const auth = await getOAuth2Client(request)
    
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
      auth,
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

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    const auth = await getOAuth2Client(request)
    
    const body = await request.json()
    const { eventId, summary, description, startDateTime, endDateTime, timeZone, location, attendees } = body

    // First, get the existing event to merge with updates
    const existingEvent = await calendar.events.get({
      auth,
      calendarId: 'primary',
      eventId
    })

    const updatedEvent = {
      ...existingEvent.data,
      summary: summary || existingEvent.data.summary,
      description: description || existingEvent.data.description,
      start: {
        dateTime: startDateTime || existingEvent.data.start?.dateTime,
        timeZone: timeZone || existingEvent.data.start?.timeZone
      },
      end: {
        dateTime: endDateTime || existingEvent.data.end?.dateTime,
        timeZone: timeZone || existingEvent.data.end?.timeZone
      },
      location: location || existingEvent.data.location,
      attendees: attendees || existingEvent.data.attendees
    }

    const response = await calendar.events.update({
      auth,
      calendarId: 'primary',
      eventId,
      requestBody: updatedEvent
    })

    const updatedEventResponse = {
      id: response.data.id,
      summary: response.data.summary,
      description: response.data.description,
      start: response.data.start,
      end: response.data.end,
      location: response.data.location,
      attendees: response.data.attendees
    }

    return NextResponse.json(updatedEventResponse)
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update calendar event' },
      { status: 500 }
    )
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getOAuth2Client(request)
    
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    await calendar.events.delete({
      auth,
      calendarId: 'primary',
      eventId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete calendar event' },
      { status: 500 }
    )
  }
} 