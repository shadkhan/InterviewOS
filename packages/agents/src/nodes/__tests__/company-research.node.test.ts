import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { MockLLMProvider, MockSearchProvider } from "../../providers";
import { PromptLoader } from "../../prompts";
import { createInitialInterviewPrepState } from "../../state";
import { createCompanyResearchNode } from "../company-research.node";

const createBaseState = () =>
  createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    resumeText: "Senior backend engineer with distributed systems experience and measurable platform impact.",
    jobDescription:
      "Example Co is hiring a Senior Backend Engineer to design reliable platform APIs, improve observability, and collaborate with product teams.",
  });

const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
const silentLogger = { log: () => undefined };

test("researches a company with MockSearchProvider and MockLLMProvider", async () => {
  const searchResults = [
    {
      title: "Example Co official overview",
      url: "https://example.com/about",
      snippet: "Example Co builds workflow software for operations teams.",
      sourceType: "official" as const,
    },
    {
      title: "Example Co launches observability feature",
      url: "https://news.example.com/example-observability",
      snippet: "Example Co announced observability features for platform teams.",
      sourceType: "news" as const,
    },
  ];
  const companyResearch = {
    companySummary: "Example Co builds workflow software for operations teams.",
    businessModel: "SaaS subscription model for operations software.",
    products: ["Workflow platform"],
    competitors: [
      {
        name: "Workflow Rival",
        differentiator: "Targets larger enterprise operations teams.",
      },
    ],
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
    citations: [
      {
        title: "Example Co official overview",
        url: "https://example.com/about",
        sourceType: "official" as const,
      },
      {
        title: "Example Co launches observability feature",
        url: "https://news.example.com/example-observability",
        sourceType: "news" as const,
      },
    ],
  };
  const node = createCompanyResearchNode({
    llmProvider: new MockLLMProvider({ structuredResponse: companyResearch }),
    searchProvider: new MockSearchProvider({ defaultResults: searchResults }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.deepEqual(result.companyResearch, companyResearch);
  assert.equal(result.warnings, undefined);
  assert.equal(result.citations?.length, 2);
  assert.deepEqual(
    result.citations?.map((citation) => citation.url).sort(),
    ["https://example.com/about", "https://news.example.com/example-observability"],
  );
});

test("returns minimal report and warning when search has no results", async () => {
  const node = createCompanyResearchNode({
    llmProvider: new MockLLMProvider({ structuredResponse: {} }),
    searchProvider: new MockSearchProvider({ defaultResults: [] }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.equal(result.companyResearch?.companySummary, "");
  assert.equal(result.companyResearch?.citations.length, 0);
  assert.deepEqual(result.warnings, ["No search results for company research"]);
  assert.match(result.companyResearch?.risksOrUncertainties[0] ?? "", /No cited search evidence/);
});
