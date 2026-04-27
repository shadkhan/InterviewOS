import { PainPointSchema, type Citation, type PainPoint } from "@interviewos/shared";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";

const MISSING_COMPANY_RESEARCH_WARNING = "Company research is required before pain point analysis";
const MISSING_JD_ANALYSIS_WARNING = "JD analysis is required before pain point analysis";
const VALIDATION_WARNING = "Pain point analysis returned invalid structured output";
const UNCONFIGURED_LLM_WARNING = "Pain point analysis LLM provider is not configured";

export interface PainPointNodeOptions {
  llmProvider?: LLMProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createPainPointNode = (options: PainPointNodeOptions): InterviewPrepNode => {
  return async (state) => analyzePainPoints(state, options);
};

export const painPointNode: InterviewPrepNode = async (state) =>
  analyzePainPoints(state, {
    loader: promptLoader,
    logger: console,
  });

const analyzePainPoints = async (
  state: InterviewPrepState,
  options: PainPointNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[PainPoint] starting");

  try {
    if (!state.companyResearch) {
      logNodeStatus(logger, "failed", startedAt);
      console.log("[PainPoint] done");

      return {
        warnings: appendWarning(state.warnings, MISSING_COMPANY_RESEARCH_WARNING),
      };
    }

    if (!state.jdAnalysis) {
      logNodeStatus(logger, "failed", startedAt);
      console.log("[PainPoint] done");

      return {
        warnings: appendWarning(state.warnings, MISSING_JD_ANALYSIS_WARNING),
      };
    }

    if (!options.llmProvider) {
      logNodeStatus(logger, "failed", startedAt);
      console.log("[PainPoint] done");

      return {
        warnings: appendWarning(state.warnings, UNCONFIGURED_LLM_WARNING),
      };
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadAgentPrompt("pain-point-agent"),
    ]);

    const painPointReport = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildPainPointUserMessage(state),
        },
      ],
      PainPointSchema,
    );

    const normalizedPainPointReport = normalizePainPointReport(painPointReport);

    logNodeStatus(logger, "success", startedAt);
    console.log("[PainPoint] done");

    return {
      painPointReport: normalizedPainPointReport,
      citations: mergeCitations(state.citations, normalizedPainPointReport.citations),
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[PainPoint] done");

    return {
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
    };
  }
};

const buildPainPointUserMessage = (state: InterviewPrepState): string => {
  return [
    "Infer likely business or technical pain points using only the company research, JD analysis, role title, and job description below.",
    "Do not present inferred pain points as confirmed company facts.",
    "Every likelyPainPoints item must include evidence and confidenceLevel.",
    "Each smartQuestionsToAsk item must be actionable, role-specific, and suitable for an interview.",
    "",
    `roleTitle: ${state.roleTitle}`,
    "",
    "<jobDescription>",
    state.jobDescription,
    "</jobDescription>",
    "",
    "<companyResearchJson>",
    JSON.stringify(state.companyResearch, null, 2),
    "</companyResearchJson>",
    "",
    "<jdAnalysisJson>",
    JSON.stringify(state.jdAnalysis, null, 2),
    "</jdAnalysisJson>",
  ].join("\n");
};

const normalizePainPointReport = (painPointReport: PainPoint): PainPoint => ({
  ...painPointReport,
  likelyPainPoints: painPointReport.likelyPainPoints.map((painPoint) => ({
    ...painPoint,
    evidence: painPoint.evidence || "Evidence not clearly provided by the model.",
  })),
});

const mergeCitations = (...citationGroups: Citation[][]): Citation[] => {
  const seenUrls = new Set<string>();
  const citations: Citation[] = [];

  for (const citation of citationGroups.flat()) {
    if (seenUrls.has(citation.url)) {
      continue;
    }

    seenUrls.add(citation.url);
    citations.push(citation);
  }

  return citations;
};

const appendWarning = (warnings: string[], warning: string): string[] => [...warnings, warning];

const formatValidationWarning = (error: unknown): string => {
  if (error instanceof Error) {
    return `${VALIDATION_WARNING}: ${error.message}`;
  }

  return VALIDATION_WARNING;
};

const logNodeStatus = (logger: Pick<Console, "log">, status: "success" | "failed", startedAt: number): void => {
  logger.log({
    node: "painPoint",
    status,
    duration: Date.now() - startedAt,
  });
};
