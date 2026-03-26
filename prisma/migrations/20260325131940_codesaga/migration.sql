-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "TaskAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Stack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "internalOrder" INTEGER NOT NULL,
    "conceptTags" TEXT[],
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "isDetour" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAttempt" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',

    CONSTRAINT "TaskAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "conceptTag" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "ConceptProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Stack_slug_key" ON "Stack"("slug");

-- CreateIndex
CREATE INDEX "Stack_slug_idx" ON "Stack"("slug");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- CreateIndex
CREATE INDEX "Enrollment_stackId_idx" ON "Enrollment"("stackId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_stackId_key" ON "Enrollment"("userId", "stackId");

-- CreateIndex
CREATE INDEX "Session_enrollmentId_idx" ON "Session"("enrollmentId");

-- CreateIndex
CREATE INDEX "Task_stackId_idx" ON "Task"("stackId");

-- CreateIndex
CREATE INDEX "Task_isDetour_idx" ON "Task"("isDetour");

-- CreateIndex
CREATE UNIQUE INDEX "Task_stackId_internalOrder_key" ON "Task"("stackId", "internalOrder");

-- CreateIndex
CREATE INDEX "TaskAttempt_taskId_idx" ON "TaskAttempt"("taskId");

-- CreateIndex
CREATE INDEX "TaskAttempt_sessionId_idx" ON "TaskAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "TaskAttempt_userId_idx" ON "TaskAttempt"("userId");

-- CreateIndex
CREATE INDEX "TaskAttempt_status_idx" ON "TaskAttempt"("status");

-- CreateIndex
CREATE INDEX "ConceptProgress_userId_idx" ON "ConceptProgress"("userId");

-- CreateIndex
CREATE INDEX "ConceptProgress_stackId_idx" ON "ConceptProgress"("stackId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptProgress_userId_stackId_conceptTag_key" ON "ConceptProgress"("userId", "stackId", "conceptTag");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttempt" ADD CONSTRAINT "TaskAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttempt" ADD CONSTRAINT "TaskAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttempt" ADD CONSTRAINT "TaskAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptProgress" ADD CONSTRAINT "ConceptProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptProgress" ADD CONSTRAINT "ConceptProgress_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
