'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: string
  attendees?: Array<{ email: string; name?: string }>
}

export interface CreateEventRequest {
  summary: string
  description?: string
  startDateTime: string
  endDateTime: string
  timeZone?: string
  location?: string
  attendees?: Array<{ email: string; name?: string }>
}

export interface UpdateEventRequest {
  eventId: string
  summary?: string
  description?: string
  startDateTime?: string
  endDateTime?: string
  timeZone?: string
  location?: string
  attendees?: Array<{ email: string; name?: string }>
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Get access token from URL or session
  const getAccessToken = async () => {
    // First try to get from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('access_token')
    
    if (urlToken) {
      return urlToken
    }
    
    // Fallback to session token
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token || session?.access_token
  }

  useEffect(() => {
    loadEvents()
  }, [selectedDate])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      

      // Get events for the selected date and next 7 days
      const startDate = new Date(selectedDate)
      const endDate = new Date(selectedDate)
      endDate.setDate(endDate.getDate() + 7)

      const response = await fetch('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'calendar.events.list',
          params: {
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            maxResults: 50,
            orderBy: 'startTime',
            singleEvents: true
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load events')
      }

      const result = await response.json()
      if (result.success && result.data && result.data.items) {
        setEvents(result.data.items)
      } else {
        setEvents([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start)
    const endTime = new Date(end)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (durationHours > 0) {
      return `${durationHours}h ${durationMinutes}m`
    }
    return `${durationMinutes}m`
  }

  const getEventTypeColor = (summary: string) => {
    const lowerSummary = summary.toLowerCase()
    if (lowerSummary.includes('emergency') || lowerSummary.includes('urgent')) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    if (lowerSummary.includes('consultation') || lowerSummary.includes('checkup')) {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    if (lowerSummary.includes('follow-up') || lowerSummary.includes('review')) {
      return 'bg-green-100 text-green-800 border-green-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const grouped: { [key: string]: CalendarEvent[] } = {}
    
    events.forEach(event => {
      const date = new Date(event.start.dateTime).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(event)
    })
    
    return grouped
  }

  const groupedEvents = groupEventsByDate(events)
  const sortedDates = Object.keys(groupedEvents).sort()

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading appointments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
            <p className="text-sm text-gray-500 mt-1">View and manage your appointments</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {error ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">Error loading appointments</p>
                <p className="text-sm text-gray-500 mt-2">{error}</p>
                <button 
                  onClick={loadEvents}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 6h8" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No appointments found</p>
                <p className="text-sm text-gray-400 mt-2">You don't have any appointments scheduled for the next 7 days.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => (
                  <div key={date} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {formatDate(new Date(date))}
                    </h3>
                    <div className="space-y-3">
                      {groupedEvents[date].map((event, index) => (
                        <div key={event.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEventTypeColor(event.summary)}`}>
                                  {event.summary}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({formatDuration(event.start.dateTime, event.end.dateTime)})
                                </span>
                              </div>
                              
                              {event.description && (
                                <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                              )}
                              
                              {event.location && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {event.location}
                                </div>
                              )}
                              
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 mb-1">Attendees:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {event.attendees.map((attendee, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                        {attendee.name || attendee.email}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Appointment Statistics */}
        <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">Appointment Statistics</h2>
            <p className="text-sm text-gray-500 mt-1">Overview of your schedule</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 6h8" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Appointments</p>
                      <p className="text-2xl font-semibold text-blue-900">{events.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Next 7 Days</p>
                      <p className="text-2xl font-semibold text-green-900">{events.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Appointments */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Today's Appointments</h3>
                {(() => {
                  const today = new Date().toDateString()
                  const todayEvents = groupedEvents[today] || []
                  
                  if (todayEvents.length === 0) {
                    return (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No appointments scheduled for today</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="space-y-2">
                      {todayEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{event.summary}</p>
                            <p className="text-sm text-gray-500">
                              {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.summary)}`}>
                            {formatDuration(event.start.dateTime, event.end.dateTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Upcoming Appointments */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Appointments</h3>
                {(() => {
                  const upcomingEvents = events
                    .filter(event => new Date(event.start.dateTime) > new Date())
                    .slice(0, 5)
                  
                  if (upcomingEvents.length === 0) {
                    return (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No upcoming appointments</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="space-y-2">
                      {upcomingEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{event.summary}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(new Date(event.start.dateTime))} at {formatTime(event.start.dateTime)}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.summary)}`}>
                            {formatDuration(event.start.dateTime, event.end.dateTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 