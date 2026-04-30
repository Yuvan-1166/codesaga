/**
 * Server-Side Code Execution
 * Integrates with the CodeSaga Execution Server for secure, isolated code execution
 */

import type { TestCase } from './browser-executor';

const EXECUTION_SERVER_URL = process.env.EXECUTION_SERVER_URL || 'http://localhost:3001';

export type ServerExecutionResult = {
  success: boolean;
  output?: any;
  error?: string;
  consoleOutput: string[];
  executionTime: number;
};

export type ServerTestResult = {
  results: Array<{
    testId: string;
    name: string;
    passed: boolean;
    actualOutput?: any;
    expectedOutput?: any;
    error?: string;
    executionTime: number;
    hidden: boolean;
  }>;
  passed: number;
  total: number;
};

/**
 * Execute code on the execution server
 */
export async function executeServerCode(
  code: string,
  timeout: number = 5000,
  language: 'javascript' | 'python' = 'javascript'
): Promise<ServerExecutionResult> {
  try {
    console.log(`[Server Executor] Submitting code execution to ${EXECUTION_SERVER_URL}/api/execute`);
    
    // Create a dummy test case for simple execution
    const dummyTestCase = {
      id: 'exec-1',
      name: 'Execute code',
      input: {},
      expectedOutput: null,
      hidden: false,
      weight: 1,
    };
    
    const response = await fetch(`${EXECUTION_SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        code,
        testCases: [dummyTestCase], // At least one test case required
        timeout,
        memoryLimit: 128,
      }),
    });

    console.log(`[Server Executor] Execute response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Server Executor] Execute error:', errorData);
      throw new Error(errorData.error || 'Execution server error');
    }

    const data = await response.json();
    console.log('[Server Executor] Execute response data:', data);

    // Check if response has jobId (async) or direct results (sync)
    if (data.jobId) {
      console.log(`[Server Executor] Got jobId: ${data.jobId}, polling for results...`);
      // Poll for job completion
      const result = await pollJobStatus(data.jobId);
      
      console.log('[Server Executor] Job completed, result:', JSON.stringify(result, null, 2));

      return {
        success: result.status === 'completed',
        output: result.results?.[0]?.actualOutput,
        error: result.results?.[0]?.error,
        consoleOutput: [
          result.stdout || '',
          result.stderr || '',
          result.results?.[0]?.error ? `Error: ${result.results[0].error}` : ''
        ].filter(Boolean),
        executionTime: result.totalExecutionTime || 0,
      };
    } else if (data.success !== undefined) {
      // Direct synchronous response
      console.log('[Server Executor] Got direct response (no jobId)');
      return {
        success: data.success,
        output: data.output,
        error: data.error,
        consoleOutput: data.consoleOutput || [],
        executionTime: data.executionTime || 0,
      };
    } else {
      throw new Error('Unexpected response format from execution server');
    }
  } catch (error) {
    console.error('[Server Executor] Server execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown execution error',
      consoleOutput: [],
      executionTime: 0,
    };
  }
}

/**
 * Run tests on the execution server
 */
export async function runServerTests(
  code: string,
  testCases: TestCase[],
  timeout: number = 5000,
  language: 'javascript' | 'python' = 'javascript'
): Promise<ServerTestResult> {
  try {
    // Convert test cases to execution server format
    const serverTestCases = testCases.map(tc => ({
      id: tc.id,
      name: tc.name,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      hidden: tc.hidden,
      weight: tc.weight,
    }));

    const response = await fetch(`${EXECUTION_SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        code,
        testCases: serverTestCases,
        timeout,
        memoryLimit: 128,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Execution server error');
    }

    const data = await response.json();

    // Poll for job completion
    const result = await pollJobStatus(data.jobId);

    if (result.status === 'failed') {
      throw new Error(result.error || 'Test execution failed');
    }

    const passed = result.results?.filter((r: any) => r.passed).length || 0;
    const total = result.results?.length || 0;

    return {
      results: result.results || [],
      passed,
      total,
    };
  } catch (error) {
    console.error('Server test execution error:', error);
    
    // Return failed results for all test cases
    return {
      results: testCases.map(tc => ({
        testId: tc.id,
        name: tc.name,
        passed: false,
        expectedOutput: tc.expectedOutput,
        error: error instanceof Error ? error.message : 'Unknown test error',
        executionTime: 0,
        hidden: tc.hidden,
      })),
      passed: 0,
      total: testCases.length,
    };
  }
}

/**
 * Poll job status until completion
 */
async function pollJobStatus(jobId: string, maxAttempts: number = 30): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const url = `${EXECUTION_SERVER_URL}/api/jobs/${jobId}`;
      console.log(`[Poll ${attempt + 1}/${maxAttempts}] Fetching job status from: ${url}`);
      
      const response = await fetch(url);
      
      console.log(`[Poll ${attempt + 1}/${maxAttempts}] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Poll ${attempt + 1}/${maxAttempts}] Error response:`, errorText);
        throw new Error(`Failed to fetch job status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Poll ${attempt + 1}/${maxAttempts}] Job status:`, data.status);

      if (data.status === 'completed' || data.status === 'failed') {
        console.log(`[Poll ${attempt + 1}/${maxAttempts}] Job finished:`, data.status);
        return data;
      }

      // Wait 500ms before next poll
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[Poll ${attempt + 1}/${maxAttempts}] Error:`, error);
      
      // If this is the last attempt, throw
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      // Otherwise, wait and retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error('Job execution timeout - max polling attempts reached');
}

/**
 * Check if execution server is healthy
 */
export async function checkExecutionServerHealth(): Promise<boolean> {
  try {
    // Try both /health and /api/health endpoints
    let response = await fetch(`${EXECUTION_SERVER_URL}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      response = await fetch(`${EXECUTION_SERVER_URL}/api/health`, {
        method: 'GET',
      });
    }

    return response.ok;
  } catch (error) {
    console.error('Execution server health check failed:', error);
    return false;
  }
}
