import type { Citation } from "@interviewos/shared";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";

const REQUIRED_OUTPUTS = [
  ["resumeProfile", "Resume profile is missing from final interview prep output"],
  ["jdAnalysis", "JD analysis is missing from final interview prep output"],
  ["companyResearch", "Company research is missing from final interview prep output"],
  ["salaryInsight", "Salary insight is missing from final interview prep output"],
  ["painPointReport", "Pain point report is missing from final interview prep output"],
  ["interviewQuestions", "Interview questions are missing from final interview prep output"],
  ["answerGuides", "Answer guides are missing from final interview prep output"],
  ["prepPlan", "Prep plan is missing from final interview prep output"],
] as const;

export interface FinalizeNodeOptions {
  logger?: Pick<Console, "log">;
}

export const createFinalizeNode = (options: FinalizeNodeOptions = {}): InterviewPrepNode => {
  return async (state) => finalizeInterviewPrep(state, options);
};

export const finalizeNode: InterviewPrepNode = async (state) => {
  return finalizeInterviewPrep(state, {
    logger: console,
  });
};

const finalizeInterviewPrep = async (
  state: InterviewPrepState,
  options: FinalizeNodeOptions,
): Promise<InterviewPrepState> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[Finalize] starting");

  const citations = dedupeCitationsByUrl(state.citations);
  const missingWarnings = getMissingOutputWarnings(state);
  const warnings = appendWarnings(state.warnings, missingWarnings);

  logNodeStatus(logger, missingWarnings.length > 0 ? "warning" : "success", startedAt, {
    citationCount: citations.length,
    missingOutputCount: missingWarnings.length,
  });
  console.log("[Finalize] done");

  return {
    ...state,
    citations,
    warnings,
    progress: 100,
  };
};

const dedupeCitationsByUrl = (citations: Citation[]): Citation[] => {
  const seenUrls = new Set<string>();
  const dedupedCitations: Citation[] = [];

  for (const citation of citations) {
    if (seenUrls.has(citation.url)) {
      continue;
    }

    seenUrls.add(citation.url);
    dedupedCitations.push(citation);
  }

  return dedupedCitations;
};

const getMissingOutputWarnings = (state: InterviewPrepState): string[] => {
  const warnings: string[] = [];

  for (const [fieldName, warning] of REQUIRED_OUTPUTS) {
    const value = state[fieldName];

    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      warnings.push(warning);
    }
  }

  return warnings;
};

const appendWarnings = (warnings: string[], nextWarnings: string[]): string[] => [...warnings, ...nextWarnings];

const logNodeStatus = (
  logger: Pick<Console, "log">,
  status: "success" | "warning",
  startedAt: number,
  extra: Record<string, number> = {},
): void => {
  logger.log({
    node: "finalize",
    status,
    duration: Date.now() - startedAt,
    ...extra,
  });
};
