import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/services/ai-agent';
import { ChatMessage } from '@/services/gemini';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const agent = new AIAgent();
    const response = await agent.processMessage(message, conversationHistory);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 