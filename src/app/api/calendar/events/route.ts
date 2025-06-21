import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Initialize Google Calendar API
const calendar = google.calendar('v3')

/**
 * Get Google OAuth2 client with user's access token
 */
async function getOAuth2Client(authorization: string) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new Error('No valid authorization token provided')
  }

  const token = authorization.replace('Bearer ', '')
  
  // Verify the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  // Get the session to access provider_token
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.provider_token) {
    throw new Error('No Google access token available. Please sign in with Google.')
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: session.provider_token
  })

  return oauth2Client
}

// GET - List events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')
    const maxResults = searchParams.get('maxResults') || '10'

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken
    })

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: parseInt(maxResults),
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
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST - Create event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { summary, description, start, end } = body

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken
    })

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: {
          dateTime: start.dateTime,
          timeZone: start.timeZone
        },
        end: {
          dateTime: end.dateTime,
          timeZone: end.timeZone
        }
      }
    })

    return NextResponse.json(response.data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, summary, description, start, end } = body

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken
    })

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary,
        description,
        start: {
          dateTime: start.dateTime,
          timeZone: start.timeZone
        },
        end: {
          dateTime: end.dateTime,
          timeZone: end.timeZone
        }
      }
    })

    return NextResponse.json(response.data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken
    })

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
} 