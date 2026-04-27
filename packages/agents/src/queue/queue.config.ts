import { QueueEvents } from "bullmq";
import IORedis from "ioredis";

export const INTERVIEW_PREP_QUEUE_NAME = "interview-prep";
export const DEFAULT_WORKER_CONCURRENCY = 2;
export const DEFAULT_JOB_ATTEMPTS = 3;
export const DEFAULT_BACKOFF_DELAY_MS = 5_000;

export const getRedisUrl = (): string => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is required to configure the interview prep queue.");
  }

  return redisUrl;
};

export const getWorkerConcurrency = (): number => {
  const configuredConcurrency = process.env.WORKER_CONCURRENCY;

  if (!configuredConcurrency) {
    return DEFAULT_WORKER_CONCURRENCY;
  }

  const parsedConcurrency = Number.parseInt(configuredConcurrency, 10);

  if (!Number.isInteger(parsedConcurrency) || parsedConcurrency < 1) {
    throw new Error("WORKER_CONCURRENCY must be a positive integer.");
  }

  return parsedConcurrency;
};

export const createRedisConnection = (): IORedis => {
  return new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: null,
  });
};

export const createInterviewPrepQueueEvents = (): QueueEvents => {
  return new QueueEvents(INTERVIEW_PREP_QUEUE_NAME, {
    connection: createRedisConnection(),
  });
};
