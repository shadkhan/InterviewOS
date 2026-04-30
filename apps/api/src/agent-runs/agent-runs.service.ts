import { createInterviewPrepQueue, retryNode, type RetryProviderName } from "@interviewos/agents";
import { prisma } from "@interviewos/database";
import { NotFoundError, PersistenceError } from "../http-errors";

type RetryableNode =
  | "resumeParser"
  | "jdAnalysisStep"
  | "companyResearchStep"
  | "salaryResearch"
  | "painPoint"
  | "interviewQuestion"
  | "answerCoach"
  | "prepPlanStep";

export class AgentRunsService {
  async retryNode(userId: string, id: string, node: RetryableNode, provider?: RetryProviderName) {
    const agentRun = await this.findRunRecordForUser(userId, id);
    return retryNode({
      jobTargetId: agentRun.jobTargetId,
      agentRunId: agentRun.id,
      node,
      provider,
    });
  }

  async getRunForUser(userId: string, id: string) {
    const agentRun = await this.findRunRecordForUser(userId, id);
    const progress = await this.getQueueProgress(id, agentRun.status);

    return {
      id: agentRun.id,
      jobTargetId: agentRun.jobTargetId,
      status: agentRun.status,
      progress,
      startedAt: agentRun.startedAt,
      completedAt: agentRun.completedAt,
      createdAt: agentRun.createdAt,
      nodeStatuses: agentRun.nodeStatuses ?? {},
    };
  }

  async getErrorsForUser(userId: string, id: string) {
    const agentRun = await this.findRunRecordForUser(userId, id);

    return {
      id: agentRun.id,
      jobTargetId: agentRun.jobTargetId,
      status: agentRun.status,
      errors: agentRun.errors ?? [],
    };
  }

  private async findRunRecordForUser(userId: string, id: string) {
    try {
      const agentRun = await prisma.agentRun.findFirst({
        where: {
          id,
          jobTarget: {
            userId,
          },
        },
        select: {
          id: true,
          jobTargetId: true,
          status: true,
          startedAt: true,
          completedAt: true,
          errors: true,
          nodeStatuses: true,
          createdAt: true,
        },
      });

      if (!agentRun) {
        throw new NotFoundError("Agent run not found.");
      }

      return agentRun;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new PersistenceError("Unable to load agent run.");
    }
  }

  private async getQueueProgress(agentRunId: string, status: string): Promise<number> {
    const queue = createInterviewPrepQueue();

    try {
      const job = await queue.getJob(agentRunId);
      const progress = normalizeQueueProgress(job?.progress);

      if (progress !== undefined) {
        return progress;
      }

      return progressFromStatus(status);
    } catch {
      return progressFromStatus(status);
    } finally {
      await queue.close();
    }
  }
}

const normalizeQueueProgress = (progress: unknown): number | undefined => {
  if (typeof progress !== "number" || !Number.isFinite(progress)) {
    return undefined;
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
};

const progressFromStatus = (status: string): number => {
  switch (status) {
    case "completed":
      return 100;
    case "running":
      return 50;
    default:
      return 0;
  }
};
