import { InterviewQuestionSchema, type InterviewQuestion } from "@interviewos/shared";
import { z } from "zod";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import { appendNodeError } from "./node-error";

const MISSING_JD_ANALYSIS_WARNING = "JD analysis is required before generating interview questions";
const MISSING_RESUME_PROFILE_WARNING = "Resume profile is required before generating interview questions";
const MISSING_COMPANY_RESEARCH_WARNING = "Company research is required before generating interview questions";
const MISSING_PAIN_POINT_REPORT_WARNING = "Pain point report is required before generating interview questions";
const VALIDATION_WARNING = "Interview question generation returned invalid structured output";
const UNCONFIGURED_LLM_WARNING = "Interview question LLM provider is not configured";

const InterviewQuestionResultSchema = z
  .object({
    questions: z.array(InterviewQuestionSchema),
  })
  .strict();

export interface InterviewQuestionNodeOptions {
  llmProvider?: LLMProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createInterviewQuestionNode = (options: InterviewQuestionNodeOptions): InterviewPrepNode => {
  return async (state) => generateInterviewQuestions(state, options);
};

export const interviewQuestionNode: InterviewPrepNode = async (state) =>
  generateInterviewQuestions(state, {
    loader: promptLoader,
    logger: console,
  });

const generateInterviewQuestions = async (
  state: InterviewPrepState,
  options: InterviewQuestionNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[InterviewQuestion] starting");

  try {
    const missingWarnings = getMissingPrerequisiteWarnings(state);

    if (missingWarnings.length > 0) {
      logNodeStatus(logger, "failed", startedAt, { missingPrerequisites: missingWarnings.length });
      console.log("[InterviewQuestion] done");

      return {
        warnings: appendWarnings(state.warnings, missingWarnings),
      };
    }

    if (!options.llmProvider) {
      logNodeStatus(logger, "failed", startedAt);
      console.log("[InterviewQuestion] done");

      return {
        warnings: appendWarning(state.warnings, UNCONFIGURED_LLM_WARNING),
      };
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadAgentPrompt("interview-question-agent"),
    ]);

    const result = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildInterviewQuestionUserMessage(state),
        },
      ],
      InterviewQuestionResultSchema,
    );
    const interviewQuestions = normalizeQuestionsForSeniority(result.questions, state.seniority);

    logNodeStatus(logger, "success", startedAt, { questionCount: interviewQuestions.length });
    console.log("[InterviewQuestion] done");

    return {
      interviewQuestions,
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[InterviewQuestion] done");

    return {
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
      errors: appendNodeError(state.errors, "interviewQuestion", error),
    };
  }
};

const getMissingPrerequisiteWarnings = (state: InterviewPrepState): string[] => {
  const warnings: string[] = [];

  if (!state.jdAnalysis) {
    warnings.push(MISSING_JD_ANALYSIS_WARNING);
  }

  if (!state.resumeProfile) {
    warnings.push(MISSING_RESUME_PROFILE_WARNING);
  }

  if (!state.companyResearch) {
    warnings.push(MISSING_COMPANY_RESEARCH_WARNING);
  }

  if (!state.painPointReport) {
    warnings.push(MISSING_PAIN_POINT_REPORT_WARNING);
  }

  return warnings;
};

const buildInterviewQuestionUserMessage = (state: InterviewPrepState): string => {
  return [
    "Generate an interview question bank using only the structured state below.",
    "Every question must be specific to the role, company, seniority, JD analysis, resume profile, company research, or pain point report.",
    "Every question must include category, difficulty, interviewerIntent, and prepNotes.",
    "Do not invent resume details, company facts, salary data, or uncited research claims.",
    "For company-specific questions, use only the companyResearch facts and preserve uncertainty where research is weak.",
    "For resumeDeepDive questions, use only details from resumeProfile.",
    "For questionsCandidateShouldAsk, derive questions from painPointReport likely pain points and smart questions.",
    "Generate category counts: recruiterScreen 3-5, behavioral 5-7, resumeDeepDive 3-5, technical 5-8, roleSpecificScenarios 3-5, companySpecific 3-5, salaryAndMotivation 2-3, questionsCandidateShouldAsk 5-7.",
    "Generate systemDesign 2-4 questions only if seniority is senior or staff. Skip systemDesign for junior or entry seniority.",
    "",
    `companyName: ${state.companyName}`,
    `roleTitle: ${state.roleTitle}`,
    `seniority: ${state.seniority ?? ""}`,
    `location: ${state.location ?? ""}`,
    "",
    "<jobDescription>",
    state.jobDescription,
    "</jobDescription>",
    "",
    "<jdAnalysisJson>",
    JSON.stringify(state.jdAnalysis, null, 2),
    "</jdAnalysisJson>",
    "",
    "<resumeProfileJson>",
    JSON.stringify(state.resumeProfile, null, 2),
    "</resumeProfileJson>",
    "",
    "<companyResearchJson>",
    JSON.stringify(state.companyResearch, null, 2),
    "</companyResearchJson>",
    "",
    "<painPointReportJson>",
    JSON.stringify(state.painPointReport, null, 2),
    "</painPointReportJson>",
  ].join("\n");
};

const normalizeQuestionsForSeniority = (
  questions: InterviewQuestion[],
  seniority: string | undefined,
): InterviewQuestion[] => {
  if (!isJuniorOrEntry(seniority)) {
    return questions;
  }

  return questions.filter((question) => question.category !== "systemDesign");
};

const isJuniorOrEntry = (seniority: string | undefined): boolean => {
  const normalizedSeniority = seniority?.trim().toLowerCase() ?? "";

  return normalizedSeniority === "junior" || normalizedSeniority === "entry";
};

const appendWarning = (warnings: string[], warning: string): string[] => [...warnings, warning];

const appendWarnings = (warnings: string[], nextWarnings: string[]): string[] => [...warnings, ...nextWarnings];

const formatValidationWarning = (error: unknown): string => {
  if (error instanceof Error) {
    return `${VALIDATION_WARNING}: ${error.message}`;
  }

  return VALIDATION_WARNING;
};

const logNodeStatus = (
  logger: Pick<Console, "log">,
  status: "success" | "failed",
  startedAt: number,
  extra: Record<string, number> = {},
): void => {
  logger.log({
    node: "interviewQuestion",
    status,
    duration: Date.now() - startedAt,
    ...extra,
  });
};
