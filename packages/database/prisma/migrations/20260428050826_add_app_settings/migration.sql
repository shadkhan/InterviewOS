-- CreateEnum
CREATE TYPE "JobTargetStatus" AS ENUM ('draft', 'pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsedProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_targets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "location" TEXT,
    "seniority" TEXT,
    "jobDescription" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "status" "JobTargetStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_research_reports" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_research_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jd_analyses" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jd_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_insights" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "confidenceLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pain_point_reports" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "confidenceLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pain_point_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "interviewerIntent" TEXT NOT NULL,
    "prepNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_guides" (
    "id" TEXT NOT NULL,
    "interviewQuestionId" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "sampleAnswer" TEXT NOT NULL,
    "resumeEvidence" JSONB NOT NULL,
    "mistakesToAvoid" JSONB NOT NULL,
    "improvementTips" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_plans" (
    "id" TEXT NOT NULL,
    "jobTargetId" TEXT NOT NULL,
    "priorityTopics" JSONB NOT NULL,
    "sevenDayPlan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prep_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sourceType" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "resumes_userId_idx" ON "resumes"("userId");

-- CreateIndex
CREATE INDEX "resumes_createdAt_idx" ON "resumes"("createdAt");

-- CreateIndex
CREATE INDEX "job_targets_userId_idx" ON "job_targets"("userId");

-- CreateIndex
CREATE INDEX "job_targets_resumeId_idx" ON "job_targets"("resumeId");

-- CreateIndex
CREATE INDEX "job_targets_status_idx" ON "job_targets"("status");

-- CreateIndex
CREATE INDEX "job_targets_createdAt_idx" ON "job_targets"("createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_jobTargetId_idx" ON "agent_runs"("jobTargetId");

-- CreateIndex
CREATE INDEX "agent_runs_status_idx" ON "agent_runs"("status");

-- CreateIndex
CREATE INDEX "agent_runs_createdAt_idx" ON "agent_runs"("createdAt");

-- CreateIndex
CREATE INDEX "company_research_reports_jobTargetId_idx" ON "company_research_reports"("jobTargetId");

-- CreateIndex
CREATE INDEX "company_research_reports_createdAt_idx" ON "company_research_reports"("createdAt");

-- CreateIndex
CREATE INDEX "jd_analyses_jobTargetId_idx" ON "jd_analyses"("jobTargetId");

-- CreateIndex
CREATE INDEX "jd_analyses_createdAt_idx" ON "jd_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "salary_insights_jobTargetId_idx" ON "salary_insights"("jobTargetId");

-- CreateIndex
CREATE INDEX "salary_insights_createdAt_idx" ON "salary_insights"("createdAt");

-- CreateIndex
CREATE INDEX "pain_point_reports_jobTargetId_idx" ON "pain_point_reports"("jobTargetId");

-- CreateIndex
CREATE INDEX "pain_point_reports_createdAt_idx" ON "pain_point_reports"("createdAt");

-- CreateIndex
CREATE INDEX "interview_questions_jobTargetId_idx" ON "interview_questions"("jobTargetId");

-- CreateIndex
CREATE INDEX "interview_questions_category_idx" ON "interview_questions"("category");

-- CreateIndex
CREATE INDEX "interview_questions_createdAt_idx" ON "interview_questions"("createdAt");

-- CreateIndex
CREATE INDEX "answer_guides_interviewQuestionId_idx" ON "answer_guides"("interviewQuestionId");

-- CreateIndex
CREATE INDEX "answer_guides_createdAt_idx" ON "answer_guides"("createdAt");

-- CreateIndex
CREATE INDEX "prep_plans_jobTargetId_idx" ON "prep_plans"("jobTargetId");

-- CreateIndex
CREATE INDEX "prep_plans_createdAt_idx" ON "prep_plans"("createdAt");

-- CreateIndex
CREATE INDEX "citations_agentRunId_idx" ON "citations"("agentRunId");

-- CreateIndex
CREATE INDEX "citations_createdAt_idx" ON "citations"("createdAt");

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_targets" ADD CONSTRAINT "job_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_targets" ADD CONSTRAINT "job_targets_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_research_reports" ADD CONSTRAINT "company_research_reports_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jd_analyses" ADD CONSTRAINT "jd_analyses_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_insights" ADD CONSTRAINT "salary_insights_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_point_reports" ADD CONSTRAINT "pain_point_reports_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_guides" ADD CONSTRAINT "answer_guides_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_plans" ADD CONSTRAINT "prep_plans_jobTargetId_fkey" FOREIGN KEY ("jobTargetId") REFERENCES "job_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
