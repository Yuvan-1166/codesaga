/**
 * Universal Code Execution Engine
 * Handles different execution contexts: browser, node, express, etc.
 */

export type ExecutionContext = 'browser' | 'node' | 'express' | 'react' | 'nextjs';

export type TestCase = {
  id: string;
  name: string;
  input: any;
  expectedOutput: any;
  hidden: boolean;
  weight: number;
  setup?: string; // Optional setup code
  teardown?: string; // Optional cleanup code
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
 * Determine execution context from code
 */
export function detectExecutionContext(code: string): ExecutionContext {
  // Check for Express
  if (code.includes('express()') || code.includes('require(\'express\')') || code.includes('from \'express\'')) {
    return 'express';
  }
  
  // Check for React
  if (code.includes('React.') || code.includes('useState') || code.includes('useEffect') || code.includes('jsx')) {
    return 'react';
  }
  
  // Check for Next.js
  if (code.includes('next/') || code.includes('getServerSideProps') || code.includes('getStaticProps')) {
    return 'nextjs';
  }
  
  // Check for Node.js specific features
  if (code.includes('require(') || code.includes('module.exports') || code.includes('process.')) {
    return 'node';
  }
  
  // Default to browser
  return 'browser';
}

/**
 * Check if code requires server-side execution
 */
export function requiresServerExecution(code: string): boolean {
  const context = detectExecutionContext(code);
  return context === 'express' || context === 'node' || context === 'nextjs';
}

/**
 * Get user-friendly error message for unsupported execution context
 */
export function getContextErrorMessage(context: ExecutionContext): string {
  switch (context) {
    case 'express':
      return 'This code requires Express.js which is not available in the browser. Server-side execution is needed.';
    case 'node':
      return 'This code uses Node.js features that are not available in the browser. Server-side execution is needed.';
    case 'react':
      return 'React components require a proper React environment to execute.';
    case 'nextjs':
      return 'Next.js code requires a Next.js runtime environment.';
    default:
      return 'This code cannot be executed in the current environment.';
  }
}

/**
 * Deep equality check for test validation
 */
export function deepEqual(a: any, b: any): boolean {
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

/**
 * Sanitize code for security
 */
export function sanitizeCode(code: string): { safe: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/g, message: 'Function constructor is not allowed' },
    { pattern: /import\s+.*\s+from\s+['"]fs['"]/g, message: 'File system access is not allowed' },
    { pattern: /require\s*\(\s*['"]fs['"]\s*\)/g, message: 'File system access is not allowed' },
    { pattern: /import\s+.*\s+from\s+['"]child_process['"]/g, message: 'Process execution is not allowed' },
    { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/g, message: 'Process execution is not allowed' },
  ];
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      issues.push(message);
    }
  }
  
  return {
    safe: issues.length === 0,
    issues,
  };
}

/**
 * Format execution error for user
 */
export function formatExecutionError(error: any, context: ExecutionContext): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Provide context-specific help
  if (context === 'express' && errorMessage.includes('express is not defined')) {
    return 'Express module is not available in browser execution. This task requires server-side execution.';
  }
  
  if (errorMessage.includes('require is not defined')) {
    return 'require() is not available in browser. Use ES6 imports or ensure task is configured for Node.js execution.';
  }
  
  if (errorMessage.includes('timeout')) {
    return 'Code execution timed out (5 seconds). Check for infinite loops or long-running operations.';
  }
  
  return errorMessage;
}
