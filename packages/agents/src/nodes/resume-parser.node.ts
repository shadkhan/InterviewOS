import { ResumeProfileSchema, type ResumeProfile } from "@interviewos/shared";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";

const SHORT_RESUME_WARNING = "Resume text is too short to parse reliably";
const VALIDATION_WARNING = "Resume parser returned invalid structured output";
const UNCONFIGURED_LLM_WARNING = "Resume parser LLM provider is not configured";

export interface ResumeParserNodeOptions {
  llmProvider?: LLMProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createResumeParserNode = (options: ResumeParserNodeOptions): InterviewPrepNode => {
  return async (state) => parseResume(state, options);
};

export const resumeParserNode: InterviewPrepNode = async (state) =>
  parseResume(state, {
    loader: promptLoader,
    logger: console,
  });

const parseResume = async (
  state: InterviewPrepState,
  options: ResumeParserNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[ResumeParser] starting");

  try {
    const resumeText = state.resumeText.trim();

    if (resumeText.length < 50) {
      const nextState = {
        resumeProfile: createEmptyResumeProfile(),
        warnings: appendWarning(state.warnings, SHORT_RESUME_WARNING),
      };

      logNodeStatus(logger, "success", startedAt);
      console.log("[ResumeParser] done");

      return nextState;
    }

    if (!options.llmProvider) {
      const nextState = {
        resumeProfile: createEmptyResumeProfile(),
        warnings: appendWarning(state.warnings, UNCONFIGURED_LLM_WARNING),
      };

      logNodeStatus(logger, "failed", startedAt);
      console.log("[ResumeParser] done");

      return nextState;
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadAgentPrompt("resume-parser-agent"),
    ]);

    const parsedProfile = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildResumeParserUserMessage(resumeText),
        },
      ],
      ResumeProfileSchema,
    );

    logNodeStatus(logger, "success", startedAt);
    console.log("[ResumeParser] done");

    return {
      resumeProfile: parsedProfile,
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[ResumeParser] done");

    return {
      resumeProfile: createEmptyResumeProfile(),
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
    };
  }
};

const buildResumeParserUserMessage = (resumeText: string): string => {
  return [
    "Parse the following resume text into the required structured schema.",
    "Use only details present in the resume. Do not infer or invent missing facts.",
    "For missing array fields, return an empty array. For missing string fields, return an empty string.",
    "",
    "<resumeText>",
    resumeText,
    "</resumeText>",
  ].join("\n");
};

const createEmptyResumeProfile = (): ResumeProfile => ({
  currentTitle: "",
  totalExperience: "",
  coreSkills: [],
  technicalSkills: [],
  industries: [],
  projects: [],
  achievements: [],
  leadershipSignals: [],
  education: [],
  certifications: [],
  gapsOrWeaknesses: [],
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
    node: "resumeParser",
    status,
    duration: Date.now() - startedAt,
  });
};
