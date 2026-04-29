import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { CONFIG } from '../config';
import { JobData, ExecutionResult } from '../types';
import { DockerExecutor } from '../executors/docker-executor';
import { SecurityValidator } from '../security/validator';

export class ExecutionQueue {
  private queue: Queue<JobData>;
  private worker: Worker<JobData, ExecutionResult>;
  private redis: Redis;
  private executor: DockerExecutor;

  constructor() {
    this.redis = new Redis({
      host: CONFIG.redis.host,
      port: CONFIG.redis.port,
      password: CONFIG.redis.password,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue<JobData>('code-execution', {
      connection: this.redis,
    });

    this.executor = new DockerExecutor();

    this.worker = new Worker<JobData, ExecutionResult>(
      'code-execution',
      async (job: Job<JobData>) => this.processJob(job),
      {
        connection: this.redis,
        concurrency: 5, // Process 5 jobs concurrently
      }
    );

    this.setupWorkerEvents();
  }

  async addJob(jobData: Omit<JobData, 'jobId' | 'createdAt'>): Promise<string> {
    const job = await this.queue.add('execute', {
      ...jobData,
      jobId: '',
      createdAt: Date.now(),
    });

    return job.id!;
  }

  async getJobStatus(jobId: string): Promise<ExecutionResult | null> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();
    
    if (state === 'completed') {
      return job.returnvalue;
    } else if (state === 'failed') {
      return {
        jobId,
        status: 'failed',
        results: [],
        stdout: '',
        stderr: '',
        error: job.failedReason || 'Unknown error',
        totalExecutionTime: 0,
      };
    } else {
      return {
        jobId,
        status: state as any,
        results: [],
        stdout: '',
        stderr: '',
        totalExecutionTime: 0,
      };
    }
  }

  private async processJob(job: Job<JobData>): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { language, code, testCases, timeout, memoryLimit } = job.data;

    try {
      // Validate code
      const validation = SecurityValidator.validateCode(code, language);
      if (!validation.valid) {
        throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute code
      const { results, stdout, stderr } = await this.executor.executeCode(
        language,
        code,
        testCases,
        timeout,
        memoryLimit
      );

      const totalExecutionTime = Date.now() - startTime;

      return {
        jobId: job.id!,
        status: 'completed',
        results,
        stdout,
        stderr,
        totalExecutionTime,
      };
    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      
      return {
        jobId: job.id!,
        status: 'failed',
        results: [],
        stdout: '',
        stderr: '',
        error: error instanceof Error ? error.message : String(error),
        totalExecutionTime,
      };
    }
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();
  }
}
