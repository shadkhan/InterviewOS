import { AnswerGuideSchema, type AnswerGuide, type InterviewQuestion, type ResumeProfile } from "@interviewos/shared";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import { appendNodeError } from "./node-error";

const MISSING_RESUME_PROFILE_WARNING = "Resume profile is required before coaching answers";
const MISSING_JD_ANALYSIS_WARNING = "JD analysis is required before coaching answers";
const MISSING_INTERVIEW_QUESTIONS_WARNING = "Interview questions are required before coaching answers";
const VALIDATION_WARNING = "Answer coach returned invalid structured output";
const UNCONFIGURED_LLM_WARNING = "Answer coach LLM provider is not configured";
const MAX_QUESTIONS_TO_COACH = 15;
const COACHED_CATEGORIES = new Set(["behavioral", "technical", "resumeDeepDive"]);

export interface AnswerCoachNodeOptions {
  llmProvider?: LLMProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createAnswerCoachNode = (options: AnswerCoachNodeOptions): InterviewPrepNode => {
  return async (state) => coachAnswers(state, options);
};

export const answerCoachNode: InterviewPrepNode = async (state) =>
  coachAnswers(state, {
    loader: promptLoader,
    logger: console,
  });

const coachAnswers = async (
  state: InterviewPrepState,
  options: AnswerCoachNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[AnswerCoach] starting");

  try {
    const missingWarnings = getMissingPrerequisiteWarnings(state);

    if (missingWarnings.length > 0) {
      logNodeStatus(logger, "failed", startedAt, { missingPrerequisites: missingWarnings.length });
      console.log("[AnswerCoach] done");

      return {
        warnings: appendWarnings(state.warnings, missingWarnings),
      };
    }

    if (!options.llmProvider) {
      logNodeStatus(logger, "failed", startedAt);
      console.log("[AnswerCoach] done");

      return {
        warnings: appendWarning(state.warnings, UNCONFIGURED_LLM_WARNING),
      };
    }

    const llmProvider = options.llmProvider;
    const questionsToCoach = selectQuestionsToCoach(state.interviewQuestions ?? []);

    if (questionsToCoach.length === 0) {
      logNodeStatus(logger, "success", startedAt, { questionCount: 0, answerGuideCount: 0 });
      console.log("[AnswerCoach] done");

      return {
        answerGuides: [],
      };
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadAgentPrompt("answer-coach-agent"),
    ]);
    const systemMessage = {
      role: "system" as const,
      content: `${basePrompt}\n\n${agentPrompt}`,
    };

    const answerGuides = await Promise.all(
      questionsToCoach.map(async ({ question, questionId }) => {
        const answerGuide = await llmProvider.generateStructured(
          [
            systemMessage,
            {
              role: "user",
              content: buildAnswerCoachUserMessage(state, question, questionId),
            },
          ],
          AnswerGuideSchema,
        );

        return normalizeAnswerGuide(answerGuide, state.resumeProfile as ResumeProfile, questionId);
      }),
    );

    logNodeStatus(logger, "success", startedAt, {
      questionCount: questionsToCoach.length,
      answerGuideCount: answerGuides.length,
    });
    console.log("[AnswerCoach] done");

    return {
      answerGuides,
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[AnswerCoach] done");

    return {
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
      errors: appendNodeError(state.errors, "answerCoach", error),
    };
  }
};

const getMissingPrerequisiteWarnings = (state: InterviewPrepState): string[] => {
  const warnings: string[] = [];

  if (!state.resumeProfile) {
    warnings.push(MISSING_RESUME_PROFILE_WARNING);
  }

  if (!state.jdAnalysis) {
    warnings.push(MISSING_JD_ANALYSIS_WARNING);
  }

  if (!state.interviewQuestions) {
    warnings.push(MISSING_INTERVIEW_QUESTIONS_WARNING);
  }

  return warnings;
};

const selectQuestionsToCoach = (
  interviewQuestions: InterviewQuestion[],
): Array<{ question: InterviewQuestion; questionId: string }> => {
  return interviewQuestions
    .map((question, index) => ({
      question,
      questionId: `${question.category}-${index + 1}`,
    }))
    .filter(({ question }) => COACHED_CATEGORIES.has(question.category))
    .slice(0, MAX_QUESTIONS_TO_COACH);
};

const buildAnswerCoachUserMessage = (
  state: InterviewPrepState,
  question: InterviewQuestion,
  questionId: string,
): string => {
  const resumeEvidence = collectResumeEvidence(state.resumeProfile as ResumeProfile);

  return [
    "Create one answer guide for the selected interview question.",
    "Use only facts that appear in resumeProfile. Do not invent employers, metrics, projects, achievements, technologies, or responsibilities.",
    "resumeEvidenceToUse must contain only exact items from the allowedResumeEvidence list below.",
    "For behavioral questions, prefer a STAR structure: Situation, Task, Action, Result.",
    "strongSampleAnswer must be natural, conversational, and interview-ready. Do not make it a bullet list.",
    "",
    `questionId: ${questionId}`,
    "",
    "<selectedQuestionJson>",
    JSON.stringify(question, null, 2),
    "</selectedQuestionJson>",
    "",
    "<allowedResumeEvidence>",
    ...resumeEvidence.map((evidence) => `- ${evidence}`),
    "</allowedResumeEvidence>",
    "",
    "<resumeProfileJson>",
    JSON.stringify(state.resumeProfile, null, 2),
    "</resumeProfileJson>",
    "",
    "<jdAnalysisJson>",
    JSON.stringify(state.jdAnalysis, null, 2),
    "</jdAnalysisJson>",
  ].join("\n");
};

const normalizeAnswerGuide = (
  answerGuide: AnswerGuide,
  resumeProfile: ResumeProfile,
  questionId: string,
): AnswerGuide => {
  const allowedEvidence = new Set(collectResumeEvidence(resumeProfile));

  return {
    ...answerGuide,
    questionId,
    resumeEvidenceToUse: answerGuide.resumeEvidenceToUse.filter((evidence) => allowedEvidence.has(evidence)),
  };
};

const collectResumeEvidence = (resumeProfile: ResumeProfile): string[] => {
  const evidence = new Set<string>();

  for (const achievement of resumeProfile.achievements) {
    addEvidence(evidence, achievement);
  }

  for (const project of resumeProfile.projects) {
    addEvidence(evidence, project.name);
    addEvidence(evidence, project.description);
    addEvidence(evidence, `${project.name}: ${project.description}`);
  }

  return [...evidence];
};

const addEvidence = (evidence: Set<string>, value: string): void => {
  const normalizedValue = value.trim();

  if (normalizedValue) {
    evidence.add(normalizedValue);
  }
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
    node: "answerCoach",
    status,
    duration: Date.now() - startedAt,
    ...extra,
  });
};
