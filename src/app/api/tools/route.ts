//return the tools.json file as a json object

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: NextRequest) {
  const toolsPath = path.join(process.cwd(), 'src', 'config', 'tools.json');
  const tools = await fs.readFile(toolsPath, 'utf8');
  return NextResponse.json(JSON.parse(tools));
}