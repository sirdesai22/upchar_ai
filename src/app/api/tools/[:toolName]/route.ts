//return a tool by name

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: NextRequest) {
  const toolName = request.nextUrl.pathname.split('/').pop();
  const toolsPath = path.join(process.cwd(), 'src', 'config', 'tools.json');
  const tools = await fs.readFile(toolsPath, 'utf8');
  const tool = JSON.parse(tools).find((tool: any) => tool.name === toolName);
  return NextResponse.json(tool);
}