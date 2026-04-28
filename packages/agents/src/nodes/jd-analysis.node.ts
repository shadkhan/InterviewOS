import { JDAnalysisSchema, type JDAnalysis } from "@interviewos/shared";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import { appendNodeError } from "./node-error";

const SHORT_JD_WARNING = "Job description is too short to analyze reliably";
const VALIDATION_WARNING = "JD analysis returned invalid structured output";
const UNCONFIGURED_LLM_WARNING = "JD analysis LLM provider is not configured";

export interface JDAnalysisNodeOptions {
  llmProvider?: LLMProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createJDAnalysisNode = (options: JDAnalysisNodeOptions): InterviewPrepNode => {
  return async (state) => analyzeJD(state, options);
};

export const jdAnalysisNode: InterviewPrepNode = async (state) =>
  analyzeJD(state, {
    loader: promptLoader,
    logger: console,
  });

const analyzeJD = async (
  state: InterviewPrepState,
  options: JDAnalysisNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[JDAnalysis] starting");

  try {
    const jobDescription = state.jobDescription.trim();

    if (jobDescription.length < 100) {
      const nextState = {
        jdAnalysis: createMinimalJDAnalysis(state),
        warnings: appendWarning(state.warnings, SHORT_JD_WARNING),
      };

      logNodeStatus(logger, "success", startedAt);
      console.log("[JDAnalysis] done");

      return nextState;
    }

    if (!options.llmProvider) {
      const nextState = {
        jdAnalysis: createMinimalJDAnalysis(state),
        warnings: appendWarning(state.warnings, UNCONFIGURED_LLM_WARNING),
      };

      logNodeStatus(logger, "failed", startedAt);
      console.log("[JDAnalysis] done");

      return nextState;
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadAgentPrompt("jd-analysis-agent"),
    ]);

    const jdAnalysis = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildJDAnalysisUserMessage(state),
        },
      ],
      JDAnalysisSchema,
    );

    logNodeStatus(logger, "success", startedAt);
    console.log("[JDAnalysis] done");

    return {
      jdAnalysis,
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[JDAnalysis] done");

    return {
      jdAnalysis: createMinimalJDAnalysis(state),
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
      errors: appendNodeError(state.errors, "jdAnalysis", error),
    };
  }
};

const buildJDAnalysisUserMessage = (state: InterviewPrepState): string => {
  return [
    "Analyze only the job description text below. Do not use external knowledge, search, or assumptions beyond the JD.",
    "If a field is inferred, prefix the item with 'Inferred:'. This is especially required for hiddenExpectations.",
    "For missing array fields, return an empty array. For missing string fields, return an empty string.",
    "",
    `roleTitle: ${state.roleTitle}`,
    `seniority: ${state.seniority ?? ""}`,
    "",
    "<jobDescription>",
    state.jobDescription,
    "</jobDescription>",
  ].join("\n");
};

const createMinimalJDAnalysis = (state: InterviewPrepState): JDAnalysis => ({
  roleSummary: state.roleTitle ? `Minimal analysis for ${state.roleTitle}` : "",
  mustHaveSkills: [],
  niceToHaveSkills: [],
  responsibilities: [],
  toolsAndTechnologies: [],
  domainKnowledge: [],
  senioritySignals: state.seniority ? [`Inferred: Target seniority provided as ${state.seniority}`] : [],
  hiddenExpectations: [],
  screeningKeywords: [],
  interviewFocusAreas: [],
});

const appendWarning = (warnings: string[], warning: string): string[] => [...warnings, warning];

const formatValidationWarning = (error: unknown): string => {
  if (error instanceof Error) {
    return `${VALIDATION_WARNING}: ${error.message}`;
  }

  return VALIDATION_WARNING;
};

const logNodeStatus = (logger: Pick<Console, "log">, status: "success" | "failed", startedAt: number): void => {
  logger.log({
    node: "jdAnalysis",
    status,
    duration: Date.now() - startedAt,
  });
};
