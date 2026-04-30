import { prisma } from "@interviewos/database";
import {
  createAnswerCoachNode,
  createCompanyResearchNode,
  createInterviewQuestionNode,
  createJDAnalysisNode,
  createPainPointNode,
  createPrepPlanNode,
  createResumeParserNode,
  createSalaryResearchNode,
} from "../nodes";
import { promptLoader } from "../prompts";
import { getActiveLLMProvider, getActiveSearchProvider, getLLMProviderByName } from "../providers/default-provider";
import type { LLMProvider, SearchProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import type { WorkflowNodeName } from "../workflows/interview-prep.workflow";
import { loadInterviewPrepStateFromDb } from "./load-state";
import { persistWorkflowResults } from "./persist-results";

export type RetryProviderName = "gemini" | "groq" | "anthropic" | "openai";

export interface RetryNodeOptions {
  jobTargetId: string;
  agentRunId: string;
  node: WorkflowNodeName;
  provider?: RetryProviderName;
}

export interface RetryNodeResult {
  status: "completed" | "failed";
  durationMs: number;
  error?: string;
}

const buildSingleNode = (
  name: WorkflowNodeName,
  llmProvider: LLMProvider,
  searchProvider: SearchProvider | undefined,
): InterviewPrepNode | undefined => {
  const opts = { llmProvider, loader: promptLoader, logger: console };
  const searchOpts = { ...opts, searchProvider };
  switch (name) {
    case "resumeParser":
      return createResumeParserNode(opts);
    case "jdAnalysisStep":
      return createJDAnalysisNode(opts);
    case "companyResearchStep":
      return createCompanyResearchNode(searchOpts);
    case "salaryResearch":
      return createSalaryResearchNode(searchOpts);
    case "painPoint":
      return createPainPointNode(opts);
    case "interviewQuestion":
      return createInterviewQuestionNode(opts);
    case "answerCoach":
      return createAnswerCoachNode(opts);
    case "prepPlanStep":
      return createPrepPlanNode(opts);
    case "intake":
    case "finalize":
      return undefined;
  }
};

export const retryNode = async (options: RetryNodeOptions): Promise<RetryNodeResult> => {
  const { jobTargetId, agentRunId, node, provider } = options;
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  const llmProvider = provider ? await getLLMProviderByName(provider) : await getActiveLLMProvider();
  if (!llmProvider) {
    return { status: "failed", durationMs: 0, error: `No API key configured for provider '${provider ?? "default"}'.` };
  }
  const searchProvider = getActiveSearchProvider();

  const state = await loadInterviewPrepStateFromDb(jobTargetId);
  if (!state) {
    return { status: "failed", durationMs: 0, error: "Job target not found." };
  }

  const nodeImpl = buildSingleNode(node, llmProvider, searchProvider);
  if (!nodeImpl) {
    return { status: "failed", durationMs: 0, error: `Cannot retry node '${node}'.` };
  }

  // Mark this node as running in the agent run's nodeStatuses map
  const runRow = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
    select: { nodeStatuses: true },
  });
  const nodeStatuses: Record<string, unknown> = (runRow?.nodeStatuses as Record<string, unknown> | null) ?? {};
  nodeStatuses[node] = { status: "running", startedAt: startedAtIso };
  await prisma.agentRun.update({ where: { id: agentRunId }, data: { nodeStatuses: nodeStatuses as object } });

  try {
    const update = await nodeImpl(state);
    const errorsBefore = state.errors.length;
    const errorsAfter = update.errors?.length ?? errorsBefore;
    const failedInternally = errorsAfter > errorsBefore;

    const completedAt = Date.now();
    const completedAtIso = new Date(completedAt).toISOString();
    const durationMs = completedAt - startedAt;

    if (failedInternally) {
      const lastError = update.errors?.[update.errors.length - 1]?.message ?? "Node failed internally.";
      nodeStatuses[node] = {
        status: "failed",
        startedAt: startedAtIso,
        completedAt: completedAtIso,
        durationMs,
        error: lastError,
      };
      await prisma.agentRun.update({ where: { id: agentRunId }, data: { nodeStatuses: nodeStatuses as object } });
      return { status: "failed", durationMs, error: lastError };
    }

    // Merge update into state and persist
    const merged: InterviewPrepState = {
      ...state,
      ...update,
      errors: state.errors,
      warnings: update.warnings ?? state.warnings,
      progress: state.progress,
      citations: update.citations ?? state.citations,
    } as InterviewPrepState;

    const jobTarget = await prisma.jobTarget.findUnique({
      where: { id: jobTargetId },
      select: { resumeId: true },
    });
    if (jobTarget?.resumeId) {
      await persistWorkflowResults(jobTargetId, agentRunId, jobTarget.resumeId, merged);
    }

    nodeStatuses[node] = {
      status: "completed",
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      durationMs,
    };
    await prisma.agentRun.update({ where: { id: agentRunId }, data: { nodeStatuses: nodeStatuses as object } });

    return { status: "completed", durationMs };
  } catch (err) {
    const completedAt = Date.now();
    const message = err instanceof Error ? err.message : String(err);
    nodeStatuses[node] = {
      status: "failed",
      startedAt: startedAtIso,
      completedAt: new Date(completedAt).toISOString(),
      durationMs: completedAt - startedAt,
      error: message,
    };
    await prisma.agentRun.update({ where: { id: agentRunId }, data: { nodeStatuses: nodeStatuses as object } });
    return { status: "failed", durationMs: completedAt - startedAt, error: message };
  }
};
