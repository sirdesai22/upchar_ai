"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import Calendar from "./Calendar";

export default function GoogleLogin() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Store access token in localStorage if available
        if (session.provider_token) {
          localStorage.setItem('google_access_token', session.provider_token);
          //update the access token in the supabase dataabase table token
          const { data, error } = await supabase.from('token').update({
            token: session.provider_token,
            id: 1,
          });
          if (error) {
            console.error('Error updating token:', error);
          }
        } else if (session.access_token) {
          localStorage.setItem('google_access_token', session.access_token);
          //update the access token in the supabase dataabase table token
          const { data, error } = await supabase.from('token').update({
            token: session.access_token,
            id: 1,
          });
          if (error) {
            console.error('Error updating token:', error);
          }
        }
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Store access token in localStorage
          if (session.provider_token) {
            localStorage.setItem('google_access_token', session.provider_token);
            //update the access token in the supabase dataabase table token
            const { data, error } = await supabase.from('token').update({
              token: session.provider_token,
              id: 1,
            });
            if (error) {
              console.error('Error updating token:', error);
            }
            console.log(session.provider_token);
          } else if (session.access_token) {
            localStorage.setItem('google_access_token', session.access_token);
            //update the access token in the supabase dataabase table token
            const { data, error } = await supabase.from('token').update({
              token: session.access_token,
              id: 1,
            });
            if (error) {
              console.error('Error updating token:', error);
            }
            console.log(session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Remove access token from localStorage
          localStorage.removeItem('google_access_token');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
        },
      });
      setData(data);
      // const accessToken = data.session?.access_token;

      if (error) {
        console.error('Google login error:', error);
        alert("Failed to login with Google");
      }
    } catch (error) {
      console.error('Login error:', error);
      alert("Failed to login with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert("Failed to logout");
      } else {
        // Remove access token from localStorage
        localStorage.removeItem('google_access_token');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert("Failed to logout");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center">
          {/* <div className="mb-4">
            <img
              src={user.user_metadata?.avatar_url || '/default-avatar.png'}
              alt="Profile"
              className="w-16 h-16 rounded-full mx-auto mb-2"
            />
            <h3 className="text-lg font-semibold text-gray-900">
              Welcome, {user.user_metadata?.full_name || user.email}
            </h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div> */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
          {/* <p className="text-xs text-gray-400 mt-2">
            Access token stored in localStorage
          </p> */}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Sign in to access your calendar
      </h3>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
      <p className="text-xs text-gray-400 mt-2">
        This will grant access to your Google Calendar
      </p>
    </div>
  );
}
