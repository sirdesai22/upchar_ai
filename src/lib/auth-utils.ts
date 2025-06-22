/**
 * Utility functions for handling Google access tokens
 */

export const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('google_access_token')
}

export const setStoredAccessToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem('google_access_token', token)
}

export const removeStoredAccessToken = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem('google_access_token')
}

export const isTokenValid = (token: string): boolean => {
  if (!token) return false
  
  try {
    // Basic validation - check if token exists and has reasonable length
    return token.length > 50
  } catch {
    return false
  }
}

export const getValidAccessToken = async (): Promise<string | null> => {
  // First try to get from localStorage
  const storedToken = getStoredAccessToken()
  if (storedToken && isTokenValid(storedToken)) {
    return storedToken
  }

  // If no valid token in localStorage, try to get from Supabase session
  try {
    const { supabase } = await import('@/lib/supabase-client')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.provider_token && isTokenValid(session.provider_token)) {
      setStoredAccessToken(session.provider_token)
      return session.provider_token
    }
    
    if (session?.access_token && isTokenValid(session.access_token)) {
      setStoredAccessToken(session.access_token)
      return session.access_token
    }
  } catch (error) {
    console.error('Error getting access token from session:', error)
  }

  return null
} 