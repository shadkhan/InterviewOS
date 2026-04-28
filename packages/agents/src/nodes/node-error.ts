import type { AgentError } from "@interviewos/shared";

export const appendNodeError = (errors: AgentError[], agent: string, error: unknown): AgentError[] => [
  ...errors,
  {
    agent,
    message: error instanceof Error ? error.message : "Agent node failed.",
    code: error instanceof Error ? error.name : "UnknownError",
    retryable: true,
  },
];
