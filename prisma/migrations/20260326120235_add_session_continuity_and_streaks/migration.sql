-- AlterTable
ALTER TABLE "TaskAttempt" ADD COLUMN     "editorState" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveDate" TIMESTAMP(3),
ADD COLUMN     "streakDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanionMessage" (
    "id" TEXT NOT NULL,
    "taskAttemptId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanionMessage_taskAttemptId_idx" ON "CompanionMessage"("taskAttemptId");

-- CreateIndex
CREATE INDEX "CompanionMessage_createdAt_idx" ON "CompanionMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "CompanionMessage" ADD CONSTRAINT "CompanionMessage_taskAttemptId_fkey" FOREIGN KEY ("taskAttemptId") REFERENCES "TaskAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
