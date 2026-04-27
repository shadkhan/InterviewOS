import { prisma } from "@interviewos/database";
import { Worker } from "bullmq";
import { runInterviewPrepWorkflow } from "../workflows/interview-prep.workflow";
import { INTERVIEW_PREP_QUEUE_NAME, createRedisConnection, getWorkerConcurrency } from "./queue.config";
import type { InterviewPrepJob, InterviewPrepWorkflowRunner, SerializedJobError } from "./queue.types";

const defaultWorkflowRunner: InterviewPrepWorkflowRunner = async (data, reportProgress) => {
  await runInterviewPrepWorkflow(
    {
      projectId: data.jobTargetId,
      userId: data.userId,
      resumeText: data.resumeText,
      jobDescription: data.jobDescription,
      companyName: data.companyName,
      roleTitle: data.roleTitle,
      location: data.location,
      seniority: data.seniority,
      interviewDate: data.interviewDate,
    },
    { reportProgress },
  );
};

export interface CreateInterviewPrepWorkerOptions {
  workflowRunner?: InterviewPrepWorkflowRunner;
  concurrency?: number;
}

export const createInterviewPrepWorker = (
  options: CreateInterviewPrepWorkerOptions = {},
): Worker<InterviewPrepJob["data"], void, "run"> => {
  const workflowRunner = options.workflowRunner ?? defaultWorkflowRunner;

  return new Worker(
    INTERVIEW_PREP_QUEUE_NAME,
    async (job: InterviewPrepJob): Promise<void> => {
      const agentRunId = String(job.id);

      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: "running",
          startedAt: new Date(),
        },
      });

      await job.updateProgress(0);

      try {
        await workflowRunner(job.data, async (progress) => {
          await job.updateProgress(normalizeProgress(progress));
        });

        await job.updateProgress(100);

        await prisma.agentRun.update({
          where: { id: agentRunId },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
      } catch (error) {
        await prisma.agentRun.update({
          where: { id: agentRunId },
          data: {
            status: "failed",
            errors: serializeWorkerError(error, job.attemptsMade + 1),
            completedAt: new Date(),
          },
        });

        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: options.concurrency ?? getWorkerConcurrency(),
    },
  );
};

const normalizeProgress = (progress: number): number => {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
};

const serializeWorkerError = (error: unknown, attempt: number): SerializedJobError => ({
  ...baseSerializedWorkerError(error, attempt),
  ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
});

const baseSerializedWorkerError = (error: unknown, attempt: number): Omit<SerializedJobError, "stack"> => ({
  name: error instanceof Error ? error.name : "UnknownError",
  message: error instanceof Error ? error.message : "Interview prep workflow failed.",
  attempt,
  failedAt: new Date().toISOString(),
});
