import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        return NextResponse.redirect(new URL('/?error=auth_error', request.url))
      }

      return NextResponse.redirect(new URL('/', request.url))
    } catch (error) {
      return NextResponse.redirect(new URL('/?error=auth_error', request.url))
    }
  }

  return NextResponse.redirect(new URL('/?error=no_code', request.url))
} 