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
import type { LLMProvider } from "../providers";
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

export interface RunInterviewPrepWorkflowOptions {
  reportProgress?: InterviewPrepProgressReporter;
  nodeOverrides?: Partial<Record<WorkflowNodeName, InterviewPrepNode>>;
  llmProvider?: LLMProvider;
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
    ? buildProviderNodeOverrides(options.llmProvider)
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

  return new StateGraph(InterviewPrepStateAnnotation)
    .addNode("intake", createSafeWorkflowNode(definitions.intake, options.reportProgress))
    .addNode("resumeParser", createSafeWorkflowNode(definitions.resumeParser, options.reportProgress))
    .addNode("jdAnalysisStep", createSafeWorkflowNode(definitions.jdAnalysisStep, options.reportProgress))
    .addNode("companyResearchStep", createSafeWorkflowNode(definitions.companyResearchStep, options.reportProgress))
    .addNode("salaryResearch", createSafeWorkflowNode(definitions.salaryResearch, options.reportProgress))
    .addNode("painPoint", createSafeWorkflowNode(definitions.painPoint, options.reportProgress))
    .addNode("interviewQuestion", createSafeWorkflowNode(definitions.interviewQuestion, options.reportProgress))
    .addNode("answerCoach", createSafeWorkflowNode(definitions.answerCoach, options.reportProgress))
    .addNode("prepPlanStep", createSafeWorkflowNode(definitions.prepPlanStep, options.reportProgress))
    .addNode("finalize", createSafeWorkflowNode(definitions.finalize, options.reportProgress))
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

const buildProviderNodeOverrides = (llmProvider: LLMProvider): Partial<Record<WorkflowNodeName, InterviewPrepNode>> => ({
  resumeParser: createResumeParserNode({ llmProvider, loader: promptLoader, logger: console }),
  jdAnalysisStep: createJDAnalysisNode({ llmProvider, loader: promptLoader, logger: console }),
  companyResearchStep: createCompanyResearchNode({ llmProvider, loader: promptLoader, logger: console }),
  salaryResearch: createSalaryResearchNode({ llmProvider, loader: promptLoader, logger: console }),
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
) => {
  return async (state: InterviewPrepState): Promise<InterviewPrepStateUpdate> => {
    try {
      const update = await definition.node(state);
      await reportProgress?.(definition.progress);

      return {
        ...update,
        progress: definition.progress,
      };
    } catch (error) {
      const nextErrors = [...state.errors, serializeNodeError(definition.name, error)];
      await reportProgress?.(definition.progress);

      return {
        errors: nextErrors,
        progress: definition.progress,
      };
    }
  };
};

const serializeNodeError = (agent: string, error: unknown): AgentError => ({
  agent,
  message: error instanceof Error ? error.message : "Workflow node failed.",
  code: error instanceof Error ? error.name : "UnknownError",
  retryable: true,
});
