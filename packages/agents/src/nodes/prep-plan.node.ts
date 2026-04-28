import { PrepPlanSchema } from "@interviewos/shared";
import { z } from "zod";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import { appendNodeError } from "./node-error";

const MISSING_JD_ANALYSIS_WARNING = "JD analysis is required before generating a prep plan";
const MISSING_RESUME_PROFILE_WARNING = "Resume profile is required before generating a prep plan";
const MISSING_COMPANY_RESEARCH_WARNING = "Company research is required before generating a prep plan";
const MISSING_INTERVIEW_QUESTIONS_WARNING = "Interview questions are required before generating a prep plan";
const MISSING_PAIN_POINT_REPORT_WARNING = "Pain point report is required before generating a prep plan";
const VALIDATION_WARNING = "Prep plan returned invalid structured output";
const UNCONFIGURED_LLM_WARNING = "Prep plan LLM provider is not configured";
const COMPRESSED_PLAN_WARNING = "Interview date is fewer than 7 days away; prep plan should be compressed";

const StrictPrepPlanSchema = PrepPlanSchema.refine((plan) => plan.sevenDayPlan.length === 7, {
  message: "sevenDayPlan must have exactly 7 entries",
  path: ["sevenDayPlan"],
}).refine((plan) => plan.sevenDayPlan.every((item, index) => item.day === index + 1), {
  message: "sevenDayPlan days must be numbered Day 1 through Day 7",
  path: ["sevenDayPlan"],
});

export interface PrepPlanNodeOptions {
  llmProvider?: LLMProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
  now?: () => Date;
}

export const createPrepPlanNode = (options: PrepPlanNodeOptions): InterviewPrepNode => {
  return async (state) => generatePrepPlan(state, options);
};

export const prepPlanNode: InterviewPrepNode = async (state) =>
  generatePrepPlan(state, {
    loader: promptLoader,
    logger: console,
  });

const generatePrepPlan = async (
  state: InterviewPrepState,
  options: PrepPlanNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[PrepPlan] starting");

  try {
    const missingWarnings = getMissingPrerequisiteWarnings(state);

    if (missingWarnings.length > 0) {
      logNodeStatus(logger, "failed", startedAt, { missingPrerequisites: missingWarnings.length });
      console.log("[PrepPlan] done");

      return {
        warnings: appendWarnings(state.warnings, missingWarnings),
      };
    }

    if (!options.llmProvider) {
      logNodeStatus(logger, "failed", startedAt);
      console.log("[PrepPlan] done");

      return {
        warnings: appendWarning(state.warnings, UNCONFIGURED_LLM_WARNING),
      };
    }

    const timeline = getInterviewTimeline(state.interviewDate, options.now?.() ?? new Date());
    const loader = options.loader ?? promptLoader;
    const [basePrompt, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadAgentPrompt("prep-plan-agent"),
    ]);

    const prepPlan = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildPrepPlanUserMessage(state, timeline),
        },
      ],
      StrictPrepPlanSchema,
    );
    const warnings = timeline.shouldCompress
      ? appendWarning(state.warnings, COMPRESSED_PLAN_WARNING)
      : state.warnings;

    logNodeStatus(logger, "success", startedAt, {
      priorityTopicCount: prepPlan.priorityTopics.length,
      sevenDayPlanCount: prepPlan.sevenDayPlan.length,
      compressed: timeline.shouldCompress ? 1 : 0,
    });
    console.log("[PrepPlan] done");

    return {
      prepPlan,
      ...(warnings.length !== state.warnings.length ? { warnings } : {}),
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[PrepPlan] done");

    return {
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
      errors: appendNodeError(state.errors, "prepPlan", error),
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

  if (!state.interviewQuestions) {
    warnings.push(MISSING_INTERVIEW_QUESTIONS_WARNING);
  }

  if (!state.painPointReport) {
    warnings.push(MISSING_PAIN_POINT_REPORT_WARNING);
  }

  return warnings;
};

type InterviewTimeline = {
  interviewDate?: string;
  daysUntilInterview?: number;
  shouldCompress: boolean;
};

const getInterviewTimeline = (interviewDate: string | undefined, now: Date): InterviewTimeline => {
  if (!interviewDate) {
    return { shouldCompress: false };
  }

  const parsedDate = new Date(interviewDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return { interviewDate, shouldCompress: false };
  }

  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfInterviewDate = Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
  );
  const daysUntilInterview = Math.ceil((startOfInterviewDate - startOfToday) / 86_400_000);

  return {
    interviewDate,
    daysUntilInterview,
    shouldCompress: daysUntilInterview >= 0 && daysUntilInterview < 7,
  };
};

const buildPrepPlanUserMessage = (state: InterviewPrepState, timeline: InterviewTimeline): string => {
  return [
    "Create a practical interview preparation plan using only the structured inputs below.",
    "Return exactly sevenDayPlan entries numbered Day 1 through Day 7.",
    "Every day must include specific tasks and practiceQuestions copied or tightly tied to the provided interviewQuestions.",
    "Rank priorityTopics by skill gaps between resumeProfile and jdAnalysis, interview importance, and company-specific relevance.",
    timeline.shouldCompress
      ? `The interview is ${timeline.daysUntilInterview} day(s) away. Compress the highest-impact preparation into the available days while still returning Day 1 through Day 7.`
      : "Use the full seven-day plan unless the interviewDate context suggests otherwise.",
    "",
    `companyName: ${state.companyName}`,
    `roleTitle: ${state.roleTitle}`,
    `seniority: ${state.seniority ?? ""}`,
    `location: ${state.location ?? ""}`,
    `interviewDate: ${state.interviewDate ?? ""}`,
    `daysUntilInterview: ${timeline.daysUntilInterview ?? ""}`,
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
    "<interviewQuestionsJson>",
    JSON.stringify(state.interviewQuestions, null, 2),
    "</interviewQuestionsJson>",
    "",
    "<painPointReportJson>",
    JSON.stringify(state.painPointReport, null, 2),
    "</painPointReportJson>",
  ].join("\n");
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
    node: "prepPlan",
    status,
    duration: Date.now() - startedAt,
    ...extra,
  });
};
