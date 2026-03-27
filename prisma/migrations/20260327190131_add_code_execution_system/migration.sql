-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "executionMode" TEXT NOT NULL DEFAULT 'browser',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'javascript',
ADD COLUMN     "starterCode" TEXT,
ADD COLUMN     "testCases" JSONB;

-- AlterTable
ALTER TABLE "TaskAttempt" ADD COLUMN     "codeSubmitted" TEXT,
ADD COLUMN     "passedTests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "testResults" JSONB,
ADD COLUMN     "totalTests" INTEGER NOT NULL DEFAULT 0;
