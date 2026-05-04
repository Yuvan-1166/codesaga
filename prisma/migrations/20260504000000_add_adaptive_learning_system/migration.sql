-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('CORE', 'PRACTICE', 'CHALLENGE', 'REMEDIAL', 'ASSESSMENT', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "ModuleAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntensityLevel" AS ENUM ('CASUAL', 'STANDARD', 'INTENSIVE');

-- AlterTable: Add adaptive learning fields to Enrollment
ALTER TABLE "Enrollment" ADD COLUMN "currentIntensity" "IntensityLevel" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "consecutiveStruggles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "completedModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "availableModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "currentModuleId" TEXT,
ADD COLUMN "avgCompletionTime" INTEGER,
ADD COLUMN "avgTestPassRate" DOUBLE PRECISION,
ADD COLUMN "totalHintsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Enrollment_currentIntensity_idx" ON "Enrollment"("currentIntensity");

-- CreateTable: Module
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "prerequisites" JSONB NOT NULL DEFAULT '{}',
    "conceptTags" TEXT[],
    "conceptWeights" JSONB,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "language" TEXT NOT NULL DEFAULT 'javascript',
    "executionMode" TEXT NOT NULL DEFAULT 'browser',
    "starterCode" TEXT,
    "solutionCode" TEXT,
    "testCases" JSONB,
    "assessmentType" TEXT,
    "assessmentData" JSONB,
    "storyContext" TEXT,
    "successMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ModuleAttempt
CREATE TABLE "ModuleAttempt" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "status" "ModuleAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "editorState" TEXT,
    "codeSubmitted" TEXT,
    "testResults" JSONB,
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptPass" BOOLEAN NOT NULL DEFAULT false,
    "assessmentScore" DOUBLE PRECISION,
    "assessmentData" JSONB,
    "performanceScore" DOUBLE PRECISION,
    "struggledConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "masteredConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wasRemedial" BOOLEAN NOT NULL DEFAULT false,
    "wasChallenge" BOOLEAN NOT NULL DEFAULT false,
    "triggeredByModule" TEXT,

    CONSTRAINT "ModuleAttempt_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Make CompanionMessage support both Task and Module attempts
ALTER TABLE "CompanionMessage" ALTER COLUMN "taskAttemptId" DROP NOT NULL;
ALTER TABLE "CompanionMessage" ADD COLUMN "moduleAttemptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Module_stackId_slug_key" ON "Module"("stackId", "slug");
CREATE INDEX "Module_stackId_moduleType_idx" ON "Module"("stackId", "moduleType");
CREATE INDEX "Module_stackId_isActive_idx" ON "Module"("stackId", "isActive");
CREATE INDEX "Module_difficultyLevel_idx" ON "Module"("difficultyLevel");

-- CreateIndex
CREATE INDEX "ModuleAttempt_moduleId_idx" ON "ModuleAttempt"("moduleId");
CREATE INDEX "ModuleAttempt_sessionId_idx" ON "ModuleAttempt"("sessionId");
CREATE INDEX "ModuleAttempt_userId_idx" ON "ModuleAttempt"("userId");
CREATE INDEX "ModuleAttempt_status_idx" ON "ModuleAttempt"("status");
CREATE INDEX "ModuleAttempt_performanceScore_idx" ON "ModuleAttempt"("performanceScore");

-- CreateIndex
CREATE INDEX "CompanionMessage_moduleAttemptId_idx" ON "CompanionMessage"("moduleAttemptId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAttempt" ADD CONSTRAINT "ModuleAttempt_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAttempt" ADD CONSTRAINT "ModuleAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAttempt" ADD CONSTRAINT "ModuleAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionMessage" ADD CONSTRAINT "CompanionMessage_moduleAttemptId_fkey" FOREIGN KEY ("moduleAttemptId") REFERENCES "ModuleAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
