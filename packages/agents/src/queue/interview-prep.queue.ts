import { prisma } from "@interviewos/database";
import { Queue, type JobsOptions } from "bullmq";
import {
  DEFAULT_BACKOFF_DELAY_MS,
  DEFAULT_JOB_ATTEMPTS,
  INTERVIEW_PREP_QUEUE_NAME,
  createRedisConnection,
} from "./queue.config";
import type { AddInterviewPrepJobResult, InterviewPrepJobData } from "./queue.types";

export const interviewPrepJobOptions: JobsOptions = {
  attempts: DEFAULT_JOB_ATTEMPTS,
  backoff: {
    type: "exponential",
    delay: DEFAULT_BACKOFF_DELAY_MS,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 1_000,
  },
  removeOnFail: false,
};

export const createInterviewPrepQueue = (): Queue<InterviewPrepJobData, void, "run"> => {
  return new Queue<InterviewPrepJobData, void, "run">(INTERVIEW_PREP_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: interviewPrepJobOptions,
  });
};

export const addInterviewPrepJob = async (data: InterviewPrepJobData): Promise<AddInterviewPrepJobResult> => {
  const agentRun = await prisma.agentRun.create({
    data: {
      jobTargetId: data.jobTargetId,
      status: "pending",
    },
    select: {
      id: true,
    },
  });

  const queue = createInterviewPrepQueue();

  try {
    const job = await queue.add("run", data, {
      ...interviewPrepJobOptions,
      jobId: agentRun.id,
    });

    return {
      jobId: String(job.id),
      agentRunId: agentRun.id,
    };
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        errors: serializeQueueAddError(error),
        completedAt: new Date(),
      },
    });

    throw error;
  } finally {
    await queue.close();
  }
};

const serializeQueueAddError = (error: unknown) => ({
  name: error instanceof Error ? error.name : "UnknownError",
  message: error instanceof Error ? error.message : "Failed to add interview prep job.",
  failedAt: new Date().toISOString(),
});
