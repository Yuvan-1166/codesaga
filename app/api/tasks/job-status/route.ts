import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const EXECUTION_SERVER_URL = process.env.EXECUTION_SERVER_URL || 'http://localhost:3001';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Forward request to execution server
    const response = await fetch(`${EXECUTION_SERVER_URL}/api/jobs/${jobId}`);

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
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
