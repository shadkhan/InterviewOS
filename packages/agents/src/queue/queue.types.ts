import type { Job } from "bullmq";

export type InterviewPrepJobData = {
  jobTargetId: string;
  userId: string;
  resumeText: string;
  jobDescription: string;
  companyName: string;
  roleTitle: string;
  location?: string;
  seniority?: string;
  interviewDate?: string;
};

export type InterviewPrepJob = Job<InterviewPrepJobData, void, "run">;

export type InterviewPrepProgress = number;

export type InterviewPrepProgressReporter = (progress: InterviewPrepProgress) => Promise<void>;

export type InterviewPrepWorkflowRunner = (
  data: InterviewPrepJobData,
  reportProgress: InterviewPrepProgressReporter,
) => Promise<void>;

export type SerializedJobError = {
  name: string;
  message: string;
  stack?: string;
  attempt: number;
  failedAt: string;
};

export type AddInterviewPrepJobResult = {
  jobId: string;
  agentRunId: string;
};
