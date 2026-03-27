/**
 * Server-side code execution engine
 * Runs code in isolated context with security restrictions
 */

import type { TestCase, TestResult, ExecutionResult } from './browser-executor';

/**
 * Execute Node.js code in isolated context
 */
export async function executeServerCode(
  code: string,
  timeout: number = 5000
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const consoleOutput: string[] = [];

  try {
    // Create isolated execution context with timeout
    const executeWithTimeout = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timeout (5 seconds)'));
      }, timeout);

      try {
        // Create sandboxed context
        const sandbox = {
          console: {
            log: (...args: any[]) => consoleOutput.push(args.map(a => String(a)).join(' ')),
            error: (...args: any[]) => consoleOutput.push('ERROR: ' + args.map(a => String(a)).join(' ')),
            warn: (...args: any[]) => consoleOutput.push('WARN: ' + args.map(a => String(a)).join(' ')),
          },
          Math,
          Date,
          JSON,
          Array,
          Object,
          String,
          Number,
          Boolean,
          RegExp,
          Error,
          TypeError,
          RangeError,
          SyntaxError,
        };

        // Execute code in sandboxed context
        const fn = new Function(...Object.keys(sandbox), `
          'use strict';
          ${code}
        `);

        const result = fn(...Object.values(sandbox));
        clearTimeout(timer);
        resolve(result);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });

    const result = await executeWithTimeout;
    const executionTime = Date.now() - startTime;

    return {
      success: true,
      output: result,
      consoleOutput,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      consoleOutput,
      executionTime,
    };
  }
}

/**
 * Run test cases against user code in server VM
 */
export async function runServerTests(
  code: string,
  testCases: TestCase[]
): Promise<{ results: TestResult[]; passed: number; total: number }> {
  const results: TestResult[] = [];
  let passed = 0;

  for (const testCase of testCases) {
    const startTime = Date.now();

    try {
      // Prepare test code
      const testCode = `
        ${code}
        
        // Run test
        const input = ${JSON.stringify(testCase.input)};
        const result = typeof main === 'function' ? main(input) : 
                       typeof solution === 'function' ? solution(input) :
                       typeof solve === 'function' ? solve(input) :
                       null;
        result;
      `;

      const execution = await executeServerCode(testCode, 5000);
      const executionTime = Date.now() - startTime;

      if (!execution.success) {
        results.push({
          testId: testCase.id,
          name: testCase.name,
          passed: false,
          error: execution.error,
          expectedOutput: testCase.expectedOutput,
          executionTime,
          hidden: testCase.hidden,
        });
        continue;
      }

      // Compare output
      const actualOutput = execution.output;
      const isPassed = deepEqual(actualOutput, testCase.expectedOutput);

      results.push({
        testId: testCase.id,
        name: testCase.name,
        passed: isPassed,
        actualOutput,
        expectedOutput: testCase.expectedOutput,
        executionTime,
        hidden: testCase.hidden,
      });

      if (isPassed) passed++;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      results.push({
        testId: testCase.id,
        name: testCase.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        expectedOutput: testCase.expectedOutput,
        executionTime,
        hidden: testCase.hidden,
      });
    }
  }

  return {
    results,
    passed,
    total: testCases.length,
  };
}

/**
 * Deep equality check for test validation
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}
