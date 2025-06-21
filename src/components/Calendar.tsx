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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    attendees: ''
  })

  // Get auth token for API calls
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/calendar/events?maxResults=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load events')
      }

      const eventsList = await response.json()
      setEvents(eventsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const attendees = formData.attendees
        ? formData.attendees.split(',').map(email => ({ email: email.trim() }))
        : undefined

      const eventData: CreateEventRequest = {
        summary: formData.summary,
        description: formData.description || undefined,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        location: formData.location || undefined,
        attendees
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      setShowCreateForm(false)
      resetForm()
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent?.id) return

    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const attendees = formData.attendees
        ? formData.attendees.split(',').map(email => ({ email: email.trim() }))
        : undefined

      const eventData: UpdateEventRequest = {
        eventId: editingEvent.id,
        summary: formData.summary || undefined,
        description: formData.description || undefined,
        startDateTime: formData.startDateTime || undefined,
        endDateTime: formData.endDateTime || undefined,
        location: formData.location || undefined,
        attendees
      }

      const response = await fetch('/api/calendar/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update event')
      }

      setEditingEvent(null)
      resetForm()
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`/api/calendar/events?eventId=${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event')
      }

      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  const startEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormData({
      summary: event.summary,
      description: event.description || '',
      startDateTime: event.start.dateTime.slice(0, 16), // Remove seconds for datetime-local input
      endDateTime: event.end.dateTime.slice(0, 16),
      location: event.location || '',
      attendees: event.attendees?.map(a => a.email).join(', ') || ''
    })
  }

  const resetForm = () => {
    setFormData({
      summary: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      location: '',
      attendees: ''
    })
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString()
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Google Calendar</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Create Event
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDateTime}
                  onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDateTime}
                  onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Attendees (comma-separated emails)</label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Event Form */}
      {editingEvent && (
        <div className="mb-6 p-6 bg-yellow-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Edit Event</h2>
          <form onSubmit={handleUpdateEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Attendees (comma-separated emails)</label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Upcoming Events</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">No upcoming events found.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{event.summary}</h3>
                  {event.description && (
                    <p className="text-gray-600 mt-1">{event.description}</p>
                  )}
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Start: {formatDateTime(event.start.dateTime)}</p>
                    <p>End: {formatDateTime(event.end.dateTime)}</p>
                    {event.location && <p>Location: {event.location}</p>}
                    {event.attendees && event.attendees.length > 0 && (
                      <p>Attendees: {event.attendees.map(a => a.email).join(', ')}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => startEditEvent(event)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => event.id && handleDeleteEvent(event.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 