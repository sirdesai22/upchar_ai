export const config = {
  gemini: {
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google',
  },
  mcp: {
    // For development, we're using Next.js API routes instead of a separate MCP server
    // Set this to your Next.js app URL or a separate MCP server if you have one
    serverUrl: process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3000',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
};

export const isDevelopment = process.env.NODE_ENV === 'development'; 