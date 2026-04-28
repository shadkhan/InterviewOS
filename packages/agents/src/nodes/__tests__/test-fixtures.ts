import path from "node:path";
import type { ZodSchema } from "zod";
import { PromptLoader } from "../../prompts";
import type { ChatMessage, GenerateOptions, LLMProvider } from "../../providers";
import { createInitialInterviewPrepState, type InterviewPrepState } from "../../state";

export const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
export const silentLogger = { log: () => undefined };

export class QueueLLMProvider implements LLMProvider {
  readonly messages: ChatMessage[][] = [];
  private responseIndex = 0;

  constructor(private readonly responses: unknown[]) {}

  async generate(_messages: ChatMessage[], _options?: GenerateOptions): Promise<string> {
    return JSON.stringify(this.responses[this.responseIndex] ?? {});
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodSchema<T>,
    _options?: GenerateOptions,
  ): Promise<T> {
    this.messages.push(messages);
    const response = this.responses[this.responseIndex] ?? {};
    this.responseIndex += 1;

    return schema.parse(response);
  }
}

export class ThrowingLLMProvider implements LLMProvider {
  async generate(): Promise<string> {
    throw new Error("LLM unavailable");
  }

  async generateStructured<T>(): Promise<T> {
    throw new Error("LLM unavailable");
  }
}

export const validCitation = {
  title: "Example Co about",
  url: "https://example.com/about",
  sourceType: "official" as const,
};

export const validResumeProfile = {
  currentTitle: "Senior Backend Engineer",
  totalExperience: "8 years",
  coreSkills: ["Backend engineering", "Reliability"],
  technicalSkills: ["TypeScript", "PostgreSQL", "OpenTelemetry"],
  industries: ["SaaS"],
  projects: [
    {
      name: "Platform reliability program",
      description: "Improved API uptime and incident response for a SaaS platform.",
      techStack: ["TypeScript", "PostgreSQL", "OpenTelemetry"],
    },
  ],
  achievements: ["Reduced API incident rate by 30%"],
  leadershipSignals: ["Led cross-functional reliability reviews"],
  education: [],
  certifications: [],
  gapsOrWeaknesses: [],
};

export const validJDAnalysis = {
  roleSummary: "Senior backend role focused on API reliability.",
  mustHaveSkills: ["API design", "Observability"],
  niceToHaveSkills: ["Developer platform experience"],
  responsibilities: ["Improve service reliability", "Build platform APIs"],
  toolsAndTechnologies: ["APIs", "Observability tooling", "PostgreSQL"],
  domainKnowledge: ["SaaS platforms"],
  senioritySignals: ["Senior ownership"],
  hiddenExpectations: ["Inferred: drive reliability improvements across teams"],
  screeningKeywords: ["API reliability", "observability"],
  interviewFocusAreas: ["System design", "Reliability"],
};

export const validCompanyResearch = {
  companySummary: "Example Co builds workflow software for operations teams.",
  businessModel: "SaaS subscription model for operations software.",
  products: ["Workflow platform"],
  competitors: [{ name: "Workflow Rival", differentiator: "Targets larger enterprise operations teams." }],
  recentNews: [
    {
      headline: "Example Co launches observability feature",
      date: "2026-04-01",
      url: "https://news.example.com/example-observability",
    },
  ],
  cultureSignals: ["Product-engineering collaboration"],
  techStackSignals: ["Platform APIs", "Observability"],
  roleRelevance: "The backend role maps to API reliability and observability work.",
  interviewTalkingPoints: ["Ask how observability work supports operations customers."],
  risksOrUncertainties: [],
  citations: [validCitation],
};

export const validSalaryInsight = {
  estimatedBaseSalaryRange: { low: 180000, high: 230000, currency: "USD" },
  estimatedTotalCompRange: { low: 220000, high: 310000, currency: "USD" },
  sourceBreakdown: ["Salary sources reviewed."],
  negotiationAdvice: ["Treat ranges as estimates."],
  confidenceLevel: "medium" as const,
  caveats: ["Compensation varies by level, location, and package mix."],
  citations: [
    {
      title: "Example salary data",
      url: "https://salary.example.com/role",
      sourceType: "salary-platform" as const,
    },
  ],
};

export const validPainPointReport = {
  likelyPainPoints: [
    {
      painPoint: "Inferred: API reliability matters.",
      evidence: "JD emphasizes reliability and observability.",
      confidenceLevel: "medium" as const,
    },
  ],
  howCandidateCanPositionThemself: ["Emphasize reliability work and measurable incident reduction."],
  smartQuestionsToAsk: ["How does the team measure API reliability today?"],
  confidenceLevel: "medium" as const,
  citations: [validCitation],
};

export const validInterviewQuestions = [
  {
    category: "behavioral" as const,
    question: "Tell me about a time you led a reliability improvement across teams.",
    difficulty: "medium" as const,
    interviewerIntent: "Assess ownership, collaboration, and senior communication.",
    prepNotes: "Use a concrete reliability example from the resume.",
  },
  {
    category: "technical" as const,
    question: "How would you improve observability for a TypeScript API backed by PostgreSQL?",
    difficulty: "hard" as const,
    interviewerIntent: "Probe backend observability depth.",
    prepNotes: "Discuss tracing, metrics, logs, and database bottlenecks.",
  },
  {
    category: "resumeDeepDive" as const,
    question: "What technical changes helped reduce API incidents by 30%?",
    difficulty: "hard" as const,
    interviewerIntent: "Validate resume impact and depth of contribution.",
    prepNotes: "Explain the project, implementation choices, and measured result.",
  },
];

export const validAnswerGuide = {
  questionId: "behavioral-1",
  recommendedAnswerStructure: "Use STAR: situation, task, action, and result.",
  resumeEvidenceToUse: ["Reduced API incident rate by 30%"],
  strongSampleAnswer:
    "In my platform reliability work, I focused on improving API uptime and incident response, reducing the API incident rate by 30%.",
  mistakesToAvoid: ["Do not claim experience that is not in the resume."],
  improvementTips: ["Tie the answer back to the target role's observability and API reliability needs."],
};

export const validPrepPlan = {
  priorityTopics: [{ topic: "API reliability", reason: "Directly tied to the JD.", urgency: "high" }],
  sevenDayPlan: Array.from({ length: 7 }, (_value, index) => ({
    day: index + 1,
    focus: `Day ${index + 1}`,
    tasks: ["Practice API reliability answer."],
    practiceQuestions: ["How would you improve API reliability?"],
  })),
  mockInterviewPlan: "Run one technical mock.",
  companyResearchTasks: ["Review company platform context."],
  salaryNegotiationPrep: ["Prepare caveated salary range."],
  finalDayChecklist: ["Review top questions."],
};

export const createBaseState = (overrides: Partial<InterviewPrepState> = {}): InterviewPrepState => ({
  ...createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    seniority: "Senior",
    location: "San Francisco, CA",
    interviewDate: "2026-05-20",
    resumeText:
      "Senior backend engineer with 8 years of TypeScript, PostgreSQL, API reliability, observability, leadership, and measurable platform impact.",
    jobDescription:
      "Example Co is hiring a Senior Backend Engineer to improve API reliability, observability, platform APIs, developer velocity, incident response, and cross-functional engineering outcomes.",
  }),
  ...overrides,
});

export const createReadyState = (overrides: Partial<InterviewPrepState> = {}): InterviewPrepState =>
  createBaseState({
    resumeProfile: validResumeProfile,
    jdAnalysis: validJDAnalysis,
    companyResearch: validCompanyResearch,
    salaryInsight: validSalaryInsight,
    painPointReport: validPainPointReport,
    interviewQuestions: validInterviewQuestions,
    answerGuides: [validAnswerGuide],
    prepPlan: validPrepPlan,
    citations: [validCitation],
    ...overrides,
  });
