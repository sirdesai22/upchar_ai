'use client'
import React from 'react'
import Calendar from '@/components/Calendar'
import Dashboard from '@/components/Dashboard'
import GoogleLogin from '@/components/GoogleLogin'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Upchar AI Healthcare System
        </h1>
        
        {/* Dashboard Section */}
        <div className="mb-12">
          <Dashboard />
        </div>
        
        {/* Calendar Section */}
        <div className="mb-12">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Calendar Management</h2>
            <Calendar />
          </div>
        </div>
        
        {/* Google Login Section */}
        {/* <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Authentication</h2>
          <GoogleLogin />
        </div> */}
      </div>
    </main>
  )
}