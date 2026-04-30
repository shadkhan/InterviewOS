import type { Job } from "bullmq";
import type { InterviewPrepState } from "../state/interview-prep.state";

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

export type InterviewPrepNodeStatusReporter = (update: {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}) => Promise<void>;

export type InterviewPrepWorkflowRunner = (
  data: InterviewPrepJobData,
  reportProgress: InterviewPrepProgressReporter,
  reportNodeStatus?: InterviewPrepNodeStatusReporter,
) => Promise<InterviewPrepState>;

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
