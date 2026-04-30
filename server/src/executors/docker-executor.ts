import Docker from 'dockerode';
import { Language, TestCase, TestResult } from '../types';
import { CONFIG } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';

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

    return { results, stdout: allStdout, stderr: allStderr };
  }

  private async executeSingleTest(
    language: Language,
    code: string,
    testCase: TestCase,
    timeout: number,
    memoryLimit: number
  ): Promise<{ output: any; stdout: string; stderr: string; error?: string; memoryUsed?: number }> {
    // Use /tmp/codesaga for better Docker compatibility
    const baseDir = '/tmp/codesaga';
    await fs.mkdir(baseDir, { recursive: true, mode: 0o755 }).catch(() => {});
    
    const tempDir = await fs.mkdtemp(path.join(baseDir, 'exec-'));
    
    try {
      const fileName = language === 'javascript' ? 'solution.js' : 'solution.py';
      const filePath = path.join(tempDir, fileName);
      const testCode = this.generateTestCode(language, code, testCase);
      
      // Write file with world-readable permissions (0o644 = rw-r--r--)
      await fs.writeFile(filePath, testCode, { mode: 0o644 });
      
      // Ensure directory is readable by all users
      await fs.chmod(tempDir, 0o755);
      
      // Verify file exists and is readable
      await fs.access(filePath, fs.constants.R_OK);
      const stats = await fs.stat(filePath);
      console.log(`[Docker] Created file: ${filePath} (${stats.size} bytes, mode: ${stats.mode.toString(8)})`);

      const result = await this.runInDockerSandbox(
        language,
        tempDir,
        fileName,
        timeout,
        memoryLimit
      );

      return result;
    } catch (error) {
      console.error('[Docker] Error in executeSingleTest:', error);
      throw error;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private generateTestCode(language: Language, code: string, testCase: TestCase): string {
    if (language === 'javascript') {
      return `${code}

const input = ${JSON.stringify(testCase.input)};

(async () => {
  try {
    let result;
    let hasFunction = false;
    
    // Try common function names
    if (typeof sum !== 'undefined') {
      result = await sum(input.a, input.b);
      hasFunction = true;
    } else if (typeof filterEven !== 'undefined') {
      result = await filterEven(input);
      hasFunction = true;
    } else if (typeof main !== 'undefined') {
      result = await main(input);
      hasFunction = true;
    } else if (typeof solution !== 'undefined') {
      result = await solution(input);
      hasFunction = true;
    } else if (typeof countLines !== 'undefined') {
      result = await countLines(input);
      hasFunction = true;
    }
    
    // If a function was found and executed, output the result
    if (hasFunction) {
      console.log(JSON.stringify({ output: result }));
    }
    // If no function found, the code already executed (e.g., console.log statements)
    // Just exit successfully - output was already captured
    
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
})();`;
    } else {
      return `import json
import sys

${code}

input_data = ${JSON.stringify(testCase.input)}

try:
    result = None
    has_function = False
    
    # Try common function names
    if 'sum' in dir():
        result = sum(input_data.get('a'), input_data.get('b'))
        has_function = True
    elif 'filter_even' in dir():
        result = filter_even(input_data)
        has_function = True
    elif 'main' in dir():
        result = main(input_data)
        has_function = True
    elif 'solution' in dir():
        result = solution(input_data)
        has_function = True
    elif 'count_lines' in dir():
        result = count_lines(input_data)
        has_function = True
    
    # If a function was found and executed, output the result
    if has_function:
        print(json.dumps({'output': result}))
    # If no function found, the code already executed
    # Just exit successfully - output was already captured
    
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)`;
    }
  }

  private async runInDockerSandbox(
    language: Language,
    hostDir: string,
    fileName: string,
    timeout: number,
    memoryLimit: number
  ): Promise<{ output: any; stdout: string; stderr: string; error?: string; memoryUsed?: number }> {
    const imageName = CONFIG.docker.images[language];
    const cmd = language === 'javascript' 
      ? ['node', `/sandbox/${fileName}`] 
      : ['python3', `/sandbox/${fileName}`];

    console.log(`[Docker] Executing: ${cmd.join(' ')}`);
    console.log(`[Docker] Host directory: ${hostDir}`);
    console.log(`[Docker] Image: ${imageName}`);

    // Ensure image exists
    try {
      await this.docker.getImage(imageName).inspect();
    } catch {
      throw new Error(`Docker image ${imageName} not found. Build it first: docker build -t ${imageName} -f docker/${language === 'javascript' ? 'node' : 'python'}.Dockerfile .`);
    }

    const container = await this.docker.createContainer({
      Image: imageName,
      Cmd: cmd,
      User: language === 'javascript' ? 'node' : 'sandbox',
      WorkingDir: '/sandbox',
      HostConfig: {
        // Resource limits
        Memory: memoryLimit * 1024 * 1024,
        MemorySwap: memoryLimit * 1024 * 1024,
        MemoryReservation: (memoryLimit / 2) * 1024 * 1024,
        CpuQuota: 50000, // 0.5 CPU
        CpuPeriod: 100000,
        PidsLimit: 50,
        
        // Network isolation
        NetworkMode: 'none',
        
        // Filesystem - mount with :Z for SELinux compatibility
        Binds: [`${hostDir}:/sandbox:ro,Z`],
        ReadonlyRootfs: false,
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=10m,mode=1777'
        },
        
        // Security
        SecurityOpt: [
          'no-new-privileges:true',
        ],
        CapDrop: ['ALL'],
        
        AutoRemove: false,
      },
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    console.log(`[Docker] Container created: ${container.id}`);

    let containerId: string | undefined;

    try {
      containerId = container.id;
      console.log(`[Docker] Starting container...`);
      await container.start();

      // Wait with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout exceeded')), timeout);
      });

      const waitPromise = container.wait();
      const waitResult = await Promise.race([waitPromise, timeoutPromise]);
      
      console.log(`[Docker] Container finished with status: ${waitResult.StatusCode}`);

      // Get logs
      const logsStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: false,
      });

      const logs = logsStream.toString('utf-8');
      const { stdout, stderr } = this.parseDockerLogs(logs);
      
      console.log(`[Docker] stdout: ${stdout.substring(0, 200)}`);
      if (stderr) console.log(`[Docker] stderr: ${stderr.substring(0, 200)}`);

      // Parse output
      let output: any;
      let error: string | undefined;

      // First, check if stderr contains an error JSON
      if (stderr) {
        try {
          const stderrParsed = JSON.parse(stderr);
          if (stderrParsed.error) {
            error = stderrParsed.error;
          }
        } catch {
          // stderr is not JSON, treat as error message if non-empty
          if (stderr.trim()) {
            error = stderr.trim();
          }
        }
      }

      // Then parse stdout for output
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          error = parsed.error;
        } else if (parsed.output !== undefined) {
          output = parsed.output;
        }
      } catch {
        // stdout is not JSON, use it as-is (e.g., console.log output)
        output = stdout.trim();
      }

      // If we have output but also an error about "No recognized function"
      // it means the code executed successfully (just no function to call)
      // Clear the error in this case
      if (output && error && error.includes('No recognized function')) {
        error = undefined;
      }

      // Get memory stats
      let memoryUsed = 0;
      try {
        const stats = await container.stats({ stream: false });
        memoryUsed = Math.round((stats.memory_stats.usage || 0) / (1024 * 1024));
      } catch {
        memoryUsed = 0;
      }

      return { output, stdout, stderr, error, memoryUsed };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        output: null,
        stdout: '',
        stderr: error,
        error,
        memoryUsed: 0,
      };
    } finally {
      // Cleanup
      if (containerId) {
        try {
          await container.remove({ force: true, v: true });
        } catch {}
      }
    }
  }

  private parseDockerLogs(logs: string): { stdout: string; stderr: string } {
    const lines = logs.split('\n');
    let stdout = '';
    let stderr = '';

    for (const line of lines) {
      if (line.length < 8) continue;
      
      const streamType = line.charCodeAt(0);
      const content = line.slice(8);
      
      if (streamType === 1) {
        stdout += content + '\n';
      } else if (streamType === 2) {
        stderr += content + '\n';
      } else {
        stdout += line + '\n';
      }
    }

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  }

  private compareOutputs(actual: any, expected: any): boolean {
    if (actual === expected) return true;
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
}
