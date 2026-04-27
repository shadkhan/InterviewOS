import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { z, type ZodSchema } from "zod";
import { PromptLoader } from "../../prompts";
import type { ChatMessage, GenerateOptions, LLMProvider } from "../../providers";
import { createInitialInterviewPrepState, type InterviewPrepState } from "../../state";
import { createInterviewQuestionNode } from "../interview-question.node";

const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
const silentLogger = { log: () => undefined };

class CapturingLLMProvider implements LLMProvider {
  messages: ChatMessage[] = [];

  constructor(private readonly response: unknown) {}

  async generate(_messages: ChatMessage[], _options?: GenerateOptions): Promise<string> {
    return JSON.stringify(this.response);
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodSchema<T>,
    _options?: GenerateOptions,
  ): Promise<T> {
    this.messages = messages;

    return schema.parse(this.response);
  }
}

const createBaseState = (seniority = "Senior"): InterviewPrepState => ({
  ...createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    seniority,
    location: "San Francisco, CA",
    resumeText:
      "Senior backend engineer with distributed systems experience, API reliability work, and measurable platform impact.",
    jobDescription:
      "Example Co is hiring a Senior Backend Engineer to improve API reliability, observability, platform APIs, and developer velocity.",
  }),
  resumeProfile: {
    currentTitle: "Senior Backend Engineer",
    totalExperience: "8 years",
    coreSkills: ["Backend engineering", "Reliability"],
    technicalSkills: ["TypeScript", "PostgreSQL", "Observability"],
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
  },
  jdAnalysis: {
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
  },
  companyResearch: {
    companySummary: "Example Co builds workflow software for operations teams.",
    businessModel: "SaaS subscription model.",
    products: ["Workflow platform"],
    competitors: [],
    recentNews: [],
    cultureSignals: ["Cross-functional product engineering"],
    techStackSignals: ["Platform APIs", "Observability"],
    roleRelevance: "The role appears connected to API reliability and observability.",
    interviewTalkingPoints: ["Ask how reliability improvements are measured."],
    risksOrUncertainties: [],
    citations: [
      {
        title: "Example Co official overview",
        url: "https://example.com/about",
        sourceType: "official",
      },
    ],
  },
  painPointReport: {
    likelyPainPoints: [
      {
        painPoint: "Inferred: API reliability may be limiting customer workflow adoption.",
        evidence: "JD mentions improving API reliability; company research mentions workflow platform APIs.",
        confidenceLevel: "medium",
      },
    ],
    howCandidateCanPositionThemself: ["Position backend reliability work as relevant to platform API quality."],
    smartQuestionsToAsk: ["How does the team measure API reliability improvements for operations customers?"],
    confidenceLevel: "medium",
    citations: [
      {
        title: "Example Co official overview",
        url: "https://example.com/about",
        sourceType: "official",
      },
    ],
  },
});

const questions = [
  {
    category: "recruiterScreen" as const,
    question: "How does your API reliability work map to Example Co's workflow platform goals?",
    difficulty: "easy" as const,
    interviewerIntent: "Check role motivation and relevance to the company context.",
    prepNotes: "Connect API reliability outcomes to operations workflow adoption.",
  },
  {
    category: "behavioral" as const,
    question: "Tell me about a time you led cross-functional reliability reviews under senior-level ambiguity.",
    difficulty: "medium" as const,
    interviewerIntent: "Assess senior ownership and collaboration style.",
    prepNotes: "Use the reliability review leadership signal from the resume profile.",
  },
  {
    category: "resumeDeepDive" as const,
    question: "What changed technically in the platform reliability program that reduced incidents by 30%?",
    difficulty: "hard" as const,
    interviewerIntent: "Validate the resume achievement and depth of contribution.",
    prepNotes: "Prepare metrics, tradeoffs, and concrete implementation details.",
  },
  {
    category: "technical" as const,
    question: "How would you improve observability for a TypeScript and PostgreSQL API serving workflow customers?",
    difficulty: "hard" as const,
    interviewerIntent: "Probe JD-required observability and backend skills.",
    prepNotes: "Cover tracing, metrics, logs, SLOs, and database bottleneck signals.",
  },
  {
    category: "systemDesign" as const,
    question: "Design an API reliability program for Example Co's workflow platform.",
    difficulty: "hard" as const,
    interviewerIntent: "Assess senior system design and operational judgment.",
    prepNotes: "Structure around SLOs, dependency mapping, observability, and rollout risk.",
  },
  {
    category: "roleSpecificScenarios" as const,
    question: "A workflow customer reports intermittent API latency; how would you lead diagnosis?",
    difficulty: "medium" as const,
    interviewerIntent: "Test practical role execution in a company-relevant scenario.",
    prepNotes: "Discuss triage, instrumentation, ownership, and customer impact.",
  },
  {
    category: "companySpecific" as const,
    question: "What reliability questions would you ask about Example Co's workflow platform APIs?",
    difficulty: "medium" as const,
    interviewerIntent: "See whether the candidate can use company research without overclaiming.",
    prepNotes: "Reference only the cited workflow platform and API relevance.",
  },
  {
    category: "salaryAndMotivation" as const,
    question: "What motivates you about senior backend reliability work at a SaaS workflow company?",
    difficulty: "easy" as const,
    interviewerIntent: "Assess motivation and alignment without salary guarantees.",
    prepNotes: "Tie motivation to platform reliability, customer workflows, and senior ownership.",
  },
  {
    category: "questionsCandidateShouldAsk" as const,
    question: "How does Example Co measure whether API reliability improvements improve workflow adoption?",
    difficulty: "medium" as const,
    interviewerIntent: "Help the candidate investigate inferred pain points.",
    prepNotes: "Ask as an exploratory question, not as a claimed company problem.",
  },
];

test("generates structured interview questions from required state", async () => {
  const llmProvider = new CapturingLLMProvider({ questions });
  const node = createInterviewQuestionNode({ llmProvider, loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.deepEqual(result.interviewQuestions, questions);
  assert.equal(result.warnings, undefined);
  assert.equal(llmProvider.messages.length, 2);
  assert.equal(llmProvider.messages[0]?.role, "system");
  assert.match(llmProvider.messages[0]?.content ?? "", /Interview Question Agent/);
  assert.match(llmProvider.messages[1]?.content ?? "", /<jdAnalysisJson>/);
  assert.match(llmProvider.messages[1]?.content ?? "", /<resumeProfileJson>/);
  assert.match(llmProvider.messages[1]?.content ?? "", /<companyResearchJson>/);
  assert.match(llmProvider.messages[1]?.content ?? "", /<painPointReportJson>/);
});

test("returns warnings when required state is missing", async () => {
  const node = createInterviewQuestionNode({
    llmProvider: new CapturingLLMProvider({ questions }),
    loader,
    logger: silentLogger,
  });
  const state = createBaseState();
  state.resumeProfile = undefined;
  state.painPointReport = undefined;

  const result = await node(state);

  assert.equal(result.interviewQuestions, undefined);
  assert.deepEqual(result.warnings, [
    "Resume profile is required before generating interview questions",
    "Pain point report is required before generating interview questions",
  ]);
});

test("filters system design questions for junior or entry seniority", async () => {
  const node = createInterviewQuestionNode({
    llmProvider: new CapturingLLMProvider({ questions }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState("entry"));

  const categorySchema = z.enum(["systemDesign"]);
  assert.equal(result.interviewQuestions?.some((question) => categorySchema.safeParse(question.category).success), false);
});
