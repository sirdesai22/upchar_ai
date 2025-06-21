//Simple hello world api route

import { GeminiService } from "@/services/gemini";
import { NextResponse } from "next/server";

export async function GET() {
    const geminiService = new GeminiService();
    const genaiResponse = await geminiService.chat([{ role: "user", content: "Hello, world!" }]);
  return NextResponse.json({ message: genaiResponse });
}