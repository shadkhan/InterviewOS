import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { MockLLMProvider, MockSearchProvider } from "../../providers";
import { PromptLoader } from "../../prompts";
import { createInitialInterviewPrepState } from "../../state";
import { createSalaryResearchNode } from "../salary-research.node";

const createBaseState = (location: string | undefined = "San Francisco, CA") =>
  createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    seniority: "Senior",
    location,
    resumeText: "Senior backend engineer with distributed systems experience and measurable platform impact.",
    jobDescription: "Build reliable platform APIs and improve observability.",
  });

const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
const silentLogger = { log: () => undefined };

test("researches salary and appends citations", async () => {
  const searchResults = [
    {
      title: "Levels salary data",
      url: "https://levels.fyi/company/example/salaries/software-engineer",
      snippet: "Senior backend engineer compensation ranges from 180k to 260k.",
      sourceType: "salary-platform" as const,
    },
    {
      title: "Glassdoor salary data",
      url: "https://glassdoor.com/example-senior-backend-salary",
      snippet: "Reported salaries for senior backend engineers at Example Co.",
      sourceType: "salary-platform" as const,
    },
    {
      title: "LinkedIn salary data",
      url: "https://linkedin.com/salary/example-senior-backend",
      snippet: "Market salary estimates for senior backend engineers in San Francisco.",
      sourceType: "salary-platform" as const,
    },
  ];
  const salaryInsight = {
    estimatedBaseSalaryRange: {
      low: 180000,
      high: 230000,
      currency: "USD",
    },
    estimatedTotalCompRange: {
      low: 220000,
      high: 310000,
      currency: "USD",
    },
    sourceBreakdown: ["Levels, Glassdoor, and LinkedIn salary sources were used."],
    negotiationAdvice: ["Use the range as an estimate, not a guaranteed outcome."],
    confidenceLevel: "medium" as const,
    caveats: ["Salary varies by location, equity, bonus, and leveling."],
    citations: [
      {
        title: "Levels salary data",
        url: "https://levels.fyi/company/example/salaries/software-engineer",
        sourceType: "salary-platform" as const,
      },
    ],
  };
  const node = createSalaryResearchNode({
    llmProvider: new MockLLMProvider({ structuredResponse: salaryInsight }),
    searchProvider: new MockSearchProvider({ defaultResults: searchResults }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.equal(result.salaryInsight?.confidenceLevel, "medium");
  assert.deepEqual(result.salaryInsight?.caveats, ["Salary varies by location, equity, bonus, and leveling."]);
  assert.equal(result.citations?.length, 3);
  assert.equal(result.warnings, undefined);
});

test("forces low confidence with fewer than three sources and warns without location", async () => {
  const searchResults = [
    {
      title: "Glassdoor salary data",
      url: "https://glassdoor.com/example-salary",
      snippet: "Reported salaries for backend engineers.",
      sourceType: "salary-platform" as const,
    },
    {
      title: "Candidate reported salary data",
      url: "https://example.com/candidate-reported-salary",
      snippet: "Candidate-reported compensation estimate.",
      sourceType: "candidate-reported" as const,
    },
  ];
  const salaryInsight = {
    estimatedBaseSalaryRange: {
      low: 150000,
      high: 210000,
      currency: "USD",
    },
    estimatedTotalCompRange: {
      low: 170000,
      high: 250000,
      currency: "USD",
    },
    sourceBreakdown: ["Two salary sources were found."],
    negotiationAdvice: ["Treat this as an estimate."],
    confidenceLevel: "high" as const,
    caveats: [],
    citations: [],
  };
  const node = createSalaryResearchNode({
    llmProvider: new MockLLMProvider({ structuredResponse: salaryInsight }),
    searchProvider: new MockSearchProvider({ defaultResults: searchResults }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState(""));

  assert.equal(result.salaryInsight?.confidenceLevel, "low");
  assert.ok((result.salaryInsight?.caveats.length ?? 0) > 0);
  assert.deepEqual(result.warnings, ["Location not specified; salary estimate may be inaccurate"]);
});
