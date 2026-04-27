import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { MockLLMProvider } from "../../providers";
import { PromptLoader } from "../../prompts";
import { createInitialInterviewPrepState, type InterviewPrepState } from "../../state";
import { createPainPointNode } from "../pain-point.node";

const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
const silentLogger = { log: () => undefined };

const createBaseState = (): InterviewPrepState => ({
  ...createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    resumeText: "Senior backend engineer with distributed systems experience and measurable platform impact.",
    jobDescription:
      "Example Co is hiring a Senior Backend Engineer to improve API reliability, observability, and developer velocity.",
  }),
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
  jdAnalysis: {
    roleSummary: "Senior backend role focused on API reliability.",
    mustHaveSkills: ["API design", "Observability"],
    niceToHaveSkills: [],
    responsibilities: ["Improve service reliability", "Build platform APIs"],
    toolsAndTechnologies: ["APIs", "Observability tooling"],
    domainKnowledge: ["SaaS platforms"],
    senioritySignals: ["Senior ownership"],
    hiddenExpectations: ["Inferred: drive reliability improvements across teams"],
    screeningKeywords: ["API reliability", "observability"],
    interviewFocusAreas: ["System design", "Reliability"],
  },
});

test("infers pain points with evidence and interview questions", async () => {
  const painPointReport = {
    likelyPainPoints: [
      {
        painPoint: "Inferred: API reliability may be limiting customer workflow adoption.",
        evidence: "JD mentions improving API reliability; company research mentions workflow platform APIs.",
        confidenceLevel: "medium" as const,
      },
    ],
    howCandidateCanPositionThemself: ["Position backend reliability work as relevant to platform API quality."],
    smartQuestionsToAsk: ["How does the team measure API reliability improvements for operations customers?"],
    confidenceLevel: "medium" as const,
    citations: [
      {
        title: "Example Co official overview",
        url: "https://example.com/about",
        sourceType: "official" as const,
      },
    ],
  };
  const node = createPainPointNode({
    llmProvider: new MockLLMProvider({ structuredResponse: painPointReport }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.deepEqual(result.painPointReport, painPointReport);
  assert.equal(result.warnings, undefined);
  assert.deepEqual(result.citations, painPointReport.citations);
});

test("skips when company research is missing", async () => {
  const node = createPainPointNode({
    llmProvider: new MockLLMProvider({ structuredResponse: {} }),
    loader,
    logger: silentLogger,
  });
  const state = createBaseState();
  state.companyResearch = undefined;

  const result = await node(state);

  assert.equal(result.painPointReport, undefined);
  assert.deepEqual(result.warnings, ["Company research is required before pain point analysis"]);
});
