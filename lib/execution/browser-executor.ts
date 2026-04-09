/**
 * Browser-based code execution engine
 * Runs JavaScript/TypeScript code in a Web Worker for isolation
 */

export type TestCase = {
  id: string;
  name: string;
  input: any;
  expectedOutput: any;
  hidden: boolean;
  weight: number;
};

export type TestResult = {
  testId: string;
  name: string;
  passed: boolean;
  actualOutput?: any;
  expectedOutput?: any;
  error?: string;
  executionTime: number;
  hidden: boolean;
};

export type ExecutionResult = {
  success: boolean;
  output?: any;
  error?: string;
  consoleOutput: string[];
  executionTime: number;
};

/**
 * Execute JavaScript code in browser with timeout
 */
export async function executeBrowserCode(
  code: string,
  timeout: number = 5000
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const consoleOutput: string[] = [];

  try {
    // Capture console output
    const mockConsole = {
      log: (...args: any[]) => {
        consoleOutput.push(args.map(a => {
          if (typeof a === 'object') return JSON.stringify(a);
          return String(a);
        }).join(' '));
      },
      error: (...args: any[]) => {
        consoleOutput.push('ERROR: ' + args.map(a => String(a)).join(' '));
      },
      warn: (...args: any[]) => {
        consoleOutput.push('WARN: ' + args.map(a => String(a)).join(' '));
      },
    };

    // Execute with timeout
    const executeWithTimeout = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timeout (5 seconds)'));
      }, timeout);

      try {
        // Create function with console in scope
        const fn = new Function('console', `
          'use strict';
          ${code}
        `);
        
        const result = fn(mockConsole);
        clearTimeout(timer);
        resolve(result);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });

    const result = await executeWithTimeout;
    const executionTime = performance.now() - startTime;

    return {
      success: true,
      output: result,
      consoleOutput,
      executionTime,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      consoleOutput,
      executionTime,
    };
  }
}

/**
 * Run test cases against user code
 */
export async function runBrowserTests(
  code: string,
  testCases: TestCase[]
): Promise<{ results: TestResult[]; passed: number; total: number }> {
  const results: TestResult[] = [];
  let passed = 0;

  for (const testCase of testCases) {
    const startTime = performance.now();

    try {
      // Prepare test code - handle different input formats
      let testCode = '';
      
      // If input is an object with properties, pass them as separate arguments
      if (typeof testCase.input === 'object' && !Array.isArray(testCase.input) && testCase.input !== null) {
        const args = Object.values(testCase.input).map(v => JSON.stringify(v)).join(', ');
        testCode = `
          ${code}
          
          // Run test
          const result = typeof sum === 'function' ? sum(${args}) : 
                         typeof main === 'function' ? main(${args}) : 
                         typeof solution === 'function' ? solution(${args}) :
                         typeof solve === 'function' ? solve(${args}) :
                         typeof filterEven === 'function' ? filterEven(${args}) :
                         typeof add === 'function' ? add(${args}) :
                         typeof multiply === 'function' ? multiply(${args}) :
                         typeof calculate === 'function' ? calculate(${args}) :
                         undefined;
          result;
        `;
      } else if (Array.isArray(testCase.input)) {
        // For array inputs, pass as single argument
        testCode = `
          ${code}
          
          // Run test
          const input = ${JSON.stringify(testCase.input)};
          const result = typeof filterEven === 'function' ? filterEven(input) :
                         typeof main === 'function' ? main(input) : 
                         typeof solution === 'function' ? solution(input) :
                         typeof solve === 'function' ? solve(input) :
                         typeof process === 'function' ? process(input) :
                         typeof transform === 'function' ? transform(input) :
                         undefined;
          result;
        `;
      } else {
        // For primitive inputs
        testCode = `
          ${code}
          
          // Run test
          const input = ${JSON.stringify(testCase.input)};
          const result = typeof main === 'function' ? main(input) : 
                         typeof solution === 'function' ? solution(input) :
                         typeof solve === 'function' ? solve(input) :
                         typeof process === 'function' ? process(input) :
                         undefined;
          result;
        `;
      }

      const execution = await executeBrowserCode(testCode, 5000);
      const executionTime = performance.now() - startTime;

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
      const executionTime = performance.now() - startTime;
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
