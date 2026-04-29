export type Language = 'javascript' | 'python';

export interface TestCase {
  id: string;
  name: string;
  input: any;
  expectedOutput: any;
  hidden: boolean;
  weight: number;
}

export interface ExecutionRequest {
  language: Language;
  code: string;
  testCases: TestCase[];
  timeout?: number;
  memoryLimit?: number;
}

export interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  actualOutput?: any;
  expectedOutput?: any;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  hidden: boolean;
}

export interface ExecutionResult {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout';
  results: TestResult[];
  stdout: string;
  stderr: string;
  error?: string;
  totalExecutionTime: number;
}

export interface JobData {
  jobId: string;
  language: Language;
  code: string;
  testCases: TestCase[];
  timeout: number;
  memoryLimit: number;
  createdAt: number;
}
