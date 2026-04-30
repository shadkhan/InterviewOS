import { END, START, StateGraph } from "@langchain/langgraph";
import type { AgentError } from "@interviewos/shared";
import {
  answerCoachNode,
  companyResearchNode,
  createAnswerCoachNode,
  createCompanyResearchNode,
  createInterviewQuestionNode,
  createJDAnalysisNode,
  createPainPointNode,
  createPrepPlanNode,
  createResumeParserNode,
  createSalaryResearchNode,
  finalizeNode,
  intakeNode,
  interviewQuestionNode,
  jdAnalysisNode,
  painPointNode,
  prepPlanNode,
  resumeParserNode,
  salaryResearchNode,
} from "../nodes";
import { promptLoader } from "../prompts";
import type { LLMProvider, SearchProvider } from "../providers";
import type { InterviewPrepProgressReporter } from "../queue/queue.types";
import {
  InterviewPrepStateAnnotation,
  createInitialInterviewPrepState,
  type InterviewPrepInput,
  type InterviewPrepNode,
  type InterviewPrepState,
  type InterviewPrepStateUpdate,
} from "../state/interview-prep.state";

export type WorkflowNodeName =
  | "intake"
  | "resumeParser"
  | "jdAnalysisStep"
  | "companyResearchStep"
  | "salaryResearch"
  | "painPoint"
  | "interviewQuestion"
  | "answerCoach"
  | "prepPlanStep"
  | "finalize";

type WorkflowNodeDefinition = {
  name: WorkflowNodeName;
  node: InterviewPrepNode;
  progress: number;
};

export type NodeRunStatus = "pending" | "running" | "completed" | "failed";

export interface NodeStatusUpdate {
  name: WorkflowNodeName;
  status: NodeRunStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export type NodeStatusReporter = (update: NodeStatusUpdate) => Promise<void> | void;

export interface RunInterviewPrepWorkflowOptions {
  reportProgress?: InterviewPrepProgressReporter;
  reportNodeStatus?: NodeStatusReporter;
  nodeOverrides?: Partial<Record<WorkflowNodeName, InterviewPrepNode>>;
  llmProvider?: LLMProvider;
  searchProvider?: SearchProvider;
}

const intakeDefinition: WorkflowNodeDefinition = { name: "intake", node: intakeNode, progress: 10 };
const resumeParserDefinition: WorkflowNodeDefinition = { name: "resumeParser", node: resumeParserNode, progress: 20 };
const jdAnalysisDefinition: WorkflowNodeDefinition = { name: "jdAnalysisStep", node: jdAnalysisNode, progress: 30 };
const companyResearchDefinition: WorkflowNodeDefinition = { name: "companyResearchStep", node: companyResearchNode, progress: 40 };
const salaryResearchDefinition: WorkflowNodeDefinition = { name: "salaryResearch", node: salaryResearchNode, progress: 50 };
const painPointDefinition: WorkflowNodeDefinition = { name: "painPoint", node: painPointNode, progress: 60 };
const interviewQuestionDefinition: WorkflowNodeDefinition = { name: "interviewQuestion", node: interviewQuestionNode, progress: 70 };
const answerCoachDefinition: WorkflowNodeDefinition = { name: "answerCoach", node: answerCoachNode, progress: 80 };
const prepPlanDefinition: WorkflowNodeDefinition = { name: "prepPlanStep", node: prepPlanNode, progress: 90 };
const finalizeDefinition: WorkflowNodeDefinition = { name: "finalize", node: finalizeNode, progress: 100 };

export const runInterviewPrepWorkflow = async (
  input: InterviewPrepInput,
  options: RunInterviewPrepWorkflowOptions = {},
): Promise<InterviewPrepState> => {
  const graph = buildInterviewPrepWorkflow(options);
  const initialState = createInitialInterviewPrepState(input);
  const finalState = await graph.invoke(initialState);

  return finalState as InterviewPrepState;
};

export const buildInterviewPrepWorkflow = (options: RunInterviewPrepWorkflowOptions = {}) => {
  const providerOverrides = options.llmProvider
    ? buildProviderNodeOverrides(options.llmProvider, options.searchProvider)
    : {};

  const effectiveOverrides: Partial<Record<WorkflowNodeName, InterviewPrepNode>> = {
    ...providerOverrides,
    ...options.nodeOverrides,
  };

  const definitions = applyNodeOverrides(
    [
      intakeDefinition,
      resumeParserDefinition,
      jdAnalysisDefinition,
      companyResearchDefinition,
      salaryResearchDefinition,
      painPointDefinition,
      interviewQuestionDefinition,
      answerCoachDefinition,
      prepPlanDefinition,
      finalizeDefinition,
    ],
    effectiveOverrides,
  );

  const safe = (def: WorkflowNodeDefinition) =>
    createSafeWorkflowNode(def, options.reportProgress, options.reportNodeStatus);

  return new StateGraph(InterviewPrepStateAnnotation)
    .addNode("intake", safe(definitions.intake))
    .addNode("resumeParser", safe(definitions.resumeParser))
    .addNode("jdAnalysisStep", safe(definitions.jdAnalysisStep))
    .addNode("companyResearchStep", safe(definitions.companyResearchStep))
    .addNode("salaryResearch", safe(definitions.salaryResearch))
    .addNode("painPoint", safe(definitions.painPoint))
    .addNode("interviewQuestion", safe(definitions.interviewQuestion))
    .addNode("answerCoach", safe(definitions.answerCoach))
    .addNode("prepPlanStep", safe(definitions.prepPlanStep))
    .addNode("finalize", safe(definitions.finalize))
    .addEdge(START, "intake")
    .addEdge("intake", "resumeParser")
    .addEdge("resumeParser", "jdAnalysisStep")
    .addEdge("jdAnalysisStep", "companyResearchStep")
    .addEdge("companyResearchStep", "salaryResearch")
    .addEdge("salaryResearch", "painPoint")
    .addEdge("painPoint", "interviewQuestion")
    .addEdge("interviewQuestion", "answerCoach")
    .addEdge("answerCoach", "prepPlanStep")
    .addEdge("prepPlanStep", "finalize")
    .addEdge("finalize", END)
    .compile({ name: "interview-prep" });
};

const buildProviderNodeOverrides = (
  llmProvider: LLMProvider,
  searchProvider?: SearchProvider,
): Partial<Record<WorkflowNodeName, InterviewPrepNode>> => ({
  resumeParser: createResumeParserNode({ llmProvider, loader: promptLoader, logger: console }),
  jdAnalysisStep: createJDAnalysisNode({ llmProvider, loader: promptLoader, logger: console }),
  companyResearchStep: createCompanyResearchNode({ llmProvider, searchProvider, loader: promptLoader, logger: console }),
  salaryResearch: createSalaryResearchNode({ llmProvider, searchProvider, loader: promptLoader, logger: console }),
  painPoint: createPainPointNode({ llmProvider, loader: promptLoader, logger: console }),
  interviewQuestion: createInterviewQuestionNode({ llmProvider, loader: promptLoader, logger: console }),
  answerCoach: createAnswerCoachNode({ llmProvider, loader: promptLoader, logger: console }),
  prepPlanStep: createPrepPlanNode({ llmProvider, loader: promptLoader, logger: console }),
});

const applyNodeOverrides = (
  definitions: WorkflowNodeDefinition[],
  overrides: Partial<Record<WorkflowNodeName, InterviewPrepNode>> = {},
): Record<WorkflowNodeName, WorkflowNodeDefinition> => {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.name,
      {
        ...definition,
        node: overrides[definition.name] ?? definition.node,
      },
    ]),
  ) as Record<WorkflowNodeName, WorkflowNodeDefinition>;
};

const createSafeWorkflowNode = (
  definition: WorkflowNodeDefinition,
  reportProgress?: InterviewPrepProgressReporter,
  reportNodeStatus?: NodeStatusReporter,
) => {
  return async (state: InterviewPrepState): Promise<InterviewPrepStateUpdate> => {
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    await reportNodeStatus?.({
      name: definition.name,
      status: "running",
      startedAt: startedAtIso,
    });

    try {
      const update = await definition.node(state);
      await reportProgress?.(definition.progress);

      // The node may have failed internally without throwing (graceful failure).
      // Detect this by checking whether errors grew during this node's run.
      const nodeFailed = (update.errors?.length ?? 0) > state.errors.length;
      const completedAt = Date.now();

      await reportNodeStatus?.({
        name: definition.name,
        status: nodeFailed ? "failed" : "completed",
        startedAt: startedAtIso,
        completedAt: new Date(completedAt).toISOString(),
        durationMs: completedAt - startedAt,
        ...(nodeFailed && update.errors
          ? { error: extractLatestError(update.errors, state.errors) }
          : {}),
      });

      return {
        ...update,
        progress: definition.progress,
      };
    } catch (error) {
      const nextErrors = [...state.errors, serializeNodeError(definition.name, error)];
      await reportProgress?.(definition.progress);
      const completedAt = Date.now();

      await reportNodeStatus?.({
        name: definition.name,
        status: "failed",
        startedAt: startedAtIso,
        completedAt: new Date(completedAt).toISOString(),
        durationMs: completedAt - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        errors: nextErrors,
        progress: definition.progress,
      };
    }
  };
};

const extractLatestError = (next: AgentError[], previous: AgentError[]): string | undefined => {
  if (next.length <= previous.length) return undefined;
  const newest = next[next.length - 1];
  return newest?.message;
};

const serializeNodeError = (agent: string, error: unknown): AgentError => ({
  agent,
  message: error instanceof Error ? error.message : "Workflow node failed.",
  code: error instanceof Error ? error.name : "UnknownError",
  retryable: true,
});
