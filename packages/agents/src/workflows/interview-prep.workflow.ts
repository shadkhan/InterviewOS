import { END, START, StateGraph } from "@langchain/langgraph";
import type { AgentError } from "@interviewos/shared";
import {
  answerCoachNode,
  companyResearchNode,
  finalizeNode,
  intakeNode,
  interviewQuestionNode,
  jdAnalysisNode,
  painPointNode,
  prepPlanNode,
  resumeParserNode,
  salaryResearchNode,
} from "../nodes";
import type { InterviewPrepProgressReporter } from "../queue/queue.types";
import {
  InterviewPrepStateAnnotation,
  createInitialInterviewPrepState,
  type InterviewPrepInput,
  type InterviewPrepNode,
  type InterviewPrepState,
  type InterviewPrepStateUpdate,
} from "../state/interview-prep.state";

type WorkflowNodeName =
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
  return new StateGraph(InterviewPrepStateAnnotation)
    .addNode("intake", createSafeWorkflowNode(intakeDefinition, options.reportProgress))
    .addNode("resumeParser", createSafeWorkflowNode(resumeParserDefinition, options.reportProgress))
    .addNode("jdAnalysisStep", createSafeWorkflowNode(jdAnalysisDefinition, options.reportProgress))
    .addNode("companyResearchStep", createSafeWorkflowNode(companyResearchDefinition, options.reportProgress))
    .addNode("salaryResearch", createSafeWorkflowNode(salaryResearchDefinition, options.reportProgress))
    .addNode("painPoint", createSafeWorkflowNode(painPointDefinition, options.reportProgress))
    .addNode("interviewQuestion", createSafeWorkflowNode(interviewQuestionDefinition, options.reportProgress))
    .addNode("answerCoach", createSafeWorkflowNode(answerCoachDefinition, options.reportProgress))
    .addNode("prepPlanStep", createSafeWorkflowNode(prepPlanDefinition, options.reportProgress))
    .addNode("finalize", createSafeWorkflowNode(finalizeDefinition, options.reportProgress))
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
