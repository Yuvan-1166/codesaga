-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "checkpointPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storyLog" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "milestoneGroup" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TaskAttempt" ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalTaskId" TEXT,
ADD COLUMN     "wasDetour" BOOLEAN NOT NULL DEFAULT false;
