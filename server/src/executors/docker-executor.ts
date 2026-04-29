import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { Language, TestCase, TestResult } from '../types';
import { CONFIG } from '../config';
import { SecurityValidator } from '../security/validator';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class DockerExecutor {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: CONFIG.docker.socketPath });
  }

  async executeCode(
    language: Language,
    code: string,
    testCases: TestCase[],
    timeout: number,
    memoryLimit: number
  ): Promise<{ results: TestResult[]; stdout: string; stderr: string }> {
    const results: TestResult[] = [];
    let allStdout = '';
    let allStderr = '';

    for (const testCase of testCases) {
      const startTime = Date.now();
      
      try {
        const result = await this.executeSingleTest(
          language,
          code,
          testCase,
          timeout,
          memoryLimit
        );
        
        const executionTime = Date.now() - startTime;
        
        results.push({
          testId: testCase.id,
          name: testCase.name,
          passed: this.compareOutputs(result.output, testCase.expectedOutput),
          actualOutput: result.output,
          expectedOutput: testCase.expectedOutput,
          error: result.error,
          executionTime,
          memoryUsed: result.memoryUsed,
          hidden: testCase.hidden,
        });

        allStdout += result.stdout;
        allStderr += result.stderr;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        results.push({
          testId: testCase.id,
          name: testCase.name,
          passed: false,
          expectedOutput: testCase.expectedOutput,
          error: error instanceof Error ? error.message : String(error),
          executionTime,
          hidden: testCase.hidden,
        });
      }
    }

    return {
      results,
      stdout: SecurityValidator.sanitizeOutput(allStdout),
      stderr: SecurityValidator.sanitizeOutput(allStderr),
    };
  }

  private async executeSingleTest(
    language: Language,
    code: string,
    testCase: TestCase,
    timeout: number,
    memoryLimit: number
  ): Promise<{ output: any; stdout: string; stderr: string; error?: string; memoryUsed?: number }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codesaga-'));
    
    try {
      // Prepare code file
      const { filePath, command } = await this.prepareCodeFile(
        tempDir,
        language,
        code,
        testCase
      );

      // Execute in Docker container
      const result = await this.runContainer(
        language,
        tempDir,
        command,
        timeout,
        memoryLimit
      );

      return result;
    } finally {
      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async prepareCodeFile(
    tempDir: string,
    language: Language,
    code: string,
    testCase: TestCase
  ): Promise<{ filePath: string; command: string[] }> {
    if (language === 'javascript') {
      const filePath = path.join(tempDir, 'solution.js');
      const testCode = this.generateJavaScriptTestCode(code, testCase);
      await fs.writeFile(filePath, testCode);
      return { filePath, command: ['node', '/sandbox/solution.js'] };
    } else if (language === 'python') {
      const filePath = path.join(tempDir, 'solution.py');
      const testCode = this.generatePythonTestCode(code, testCase);
      await fs.writeFile(filePath, testCode);
      return { filePath, command: ['python3', '/sandbox/solution.py'] };
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }

  private generateJavaScriptTestCode(code: string, testCase: TestCase): string {
    return `
${code}

// Test execution
const input = ${JSON.stringify(testCase.input)};
let result;

try {
  // Try common function names
  if (typeof sum === 'function') {
    result = sum(input.a, input.b);
  } else if (typeof filterEven === 'function') {
    result = filterEven(input);
  } else if (typeof main === 'function') {
    result = main(input);
  } else if (typeof solution === 'function') {
    result = solution(input);
  } else {
    throw new Error('No recognized function found');
  }
  
  console.log(JSON.stringify({ output: result }));
} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
}
`;
  }

  private generatePythonTestCode(code: string, testCase: TestCase): string {
    return `
import json
import sys

${code}

# Test execution
input_data = ${JSON.stringify(testCase.input)}

try:
    # Try common function names
    if 'sum' in dir():
        result = sum(input_data.get('a'), input_data.get('b'))
    elif 'filter_even' in dir():
        result = filter_even(input_data)
    elif 'main' in dir():
        result = main(input_data)
    elif 'solution' in dir():
        result = solution(input_data)
    else:
        raise Exception('No recognized function found')
    
    print(json.dumps({'output': result}))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;
  }

  private async runContainer(
    language: Language,
    tempDir: string,
    command: string[],
    timeout: number,
    memoryLimit: number
  ): Promise<{ output: any; stdout: string; stderr: string; error?: string; memoryUsed?: number }> {
    const imageName = CONFIG.docker.images[language];
    
    const container = await this.docker.createContainer({
      Image: imageName,
      Cmd: command,
      HostConfig: {
        Memory: memoryLimit * 1024 * 1024, // Convert MB to bytes
        MemorySwap: memoryLimit * 1024 * 1024,
        CpuQuota: 50000, // 0.5 CPU
        PidsLimit: 50,
        NetworkMode: 'none',
        ReadonlyRootfs: true,
        Binds: [`${tempDir}:/sandbox:ro`],
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=10m' },
        SecurityOpt: ['no-new-privileges'],
      },
      User: 'sandbox',
      WorkingDir: '/sandbox',
    });

    try {
      await container.start();

      // Wait for container with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), timeout);
      });

      const waitPromise = container.wait();
      await Promise.race([waitPromise, timeoutPromise]);

      // Get logs
      const logs = await container.logs({
        stdout: true,
        stderr: true,
      });

      const logString = logs.toString('utf-8');
      const [stdout, stderr] = this.parseLogs(logString);

      // Parse output
      let output: any;
      let error: string | undefined;

      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          error = parsed.error;
        } else {
          output = parsed.output;
        }
      } catch {
        // If not JSON, treat as raw output
        output = stdout.trim();
      }

      // Get memory stats
      const stats = await container.stats({ stream: false });
      const memoryUsed = Math.round(stats.memory_stats.usage / (1024 * 1024)); // Convert to MB

      return { output, stdout, stderr, error, memoryUsed };
    } finally {
      // Cleanup container
      try {
        await container.remove({ force: true });
      } catch (err) {
        console.error('Error removing container:', err);
      }
    }
  }

  private parseLogs(logs: string): [string, string] {
    // Docker logs format: 8 bytes header + payload
    // Simple split by newlines for now
    const lines = logs.split('\n');
    const stdout = lines.filter(l => !l.includes('ERROR')).join('\n');
    const stderr = lines.filter(l => l.includes('ERROR')).join('\n');
    return [stdout, stderr];
  }

  private compareOutputs(actual: any, expected: any): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
}
