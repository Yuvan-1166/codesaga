import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const EXECUTION_SERVER_URL = process.env.EXECUTION_SERVER_URL || 'http://localhost:3001';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, language, testCases, timeout, memoryLimit } = await req.json();

    if (!code || !language || !testCases) {
      return NextResponse.json(
        { error: 'Missing required fields: code, language, testCases' },
        { status: 400 }
      );
    }

    // Forward request to execution server
    const response = await fetch(`${EXECUTION_SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        language,
        testCases,
        timeout: timeout || 5000,
        memoryLimit: memoryLimit || 128,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Execution server error', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing code:', error);
    return NextResponse.json(
      { error: 'Failed to execute code', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
