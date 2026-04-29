import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExecutionQueue } from '../queue/execution-queue';
import { CONFIG } from '../config';

const router = Router();
const executionQueue = new ExecutionQueue();

// Validation schemas
const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.any(),
  expectedOutput: z.any(),
  hidden: z.boolean(),
  weight: z.number(),
});

const ExecutionRequestSchema = z.object({
  language: z.enum(['javascript', 'python']),
  code: z.string().max(CONFIG.security.maxCodeSize),
  testCases: z.array(TestCaseSchema).min(1),
  timeout: z.number().optional().default(CONFIG.security.maxExecutionTime),
  memoryLimit: z.number().optional().default(CONFIG.security.maxMemoryMB),
});

// POST /api/execute - Submit code for execution
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const validatedData = ExecutionRequestSchema.parse(req.body);

    // Add job to queue
    const jobId = await executionQueue.addJob({
      language: validatedData.language,
      code: validatedData.code,
      testCases: validatedData.testCases,
      timeout: validatedData.timeout,
      memoryLimit: validatedData.memoryLimit,
    });

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Code execution job queued successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      console.error('Error submitting job:', error);
      res.status(500).json({
        error: 'Failed to submit execution job',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

// GET /api/jobs/:jobId - Get job status and results
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const result = await executionQueue.getJobStatus(jobId);

    if (!result) {
      res.status(404).json({
        error: 'Job not found',
        jobId,
      });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({
      error: 'Failed to fetch job status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/health - Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
