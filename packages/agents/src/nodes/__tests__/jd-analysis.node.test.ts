import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { MockLLMProvider } from "../../providers";
import { PromptLoader } from "../../prompts";
import { createInitialInterviewPrepState } from "../../state";
import { createJDAnalysisNode } from "../jd-analysis.node";

const createBaseState = (jobDescription: string) =>
  createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    seniority: "Senior",
    resumeText: "Senior backend engineer with distributed systems experience and measurable platform impact.",
    jobDescription,
  });

const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
const silentLogger = { log: () => undefined };

test("analyzes a valid job description with MockLLMProvider", async () => {
  const analysis = {
    roleSummary: "Senior backend role focused on distributed APIs and reliability.",
    mustHaveSkills: ["Node.js", "PostgreSQL", "Distributed systems"],
    niceToHaveSkills: ["Kafka"],
    responsibilities: ["Design APIs", "Improve service reliability"],
    toolsAndTechnologies: ["Node.js", "PostgreSQL", "Kafka"],
    domainKnowledge: ["SaaS platforms"],
    senioritySignals: ["Owns architecture decisions"],
    hiddenExpectations: ["Inferred: mentor engineers based on seniority wording"],
    screeningKeywords: ["backend", "distributed systems", "PostgreSQL"],
    interviewFocusAreas: ["System design", "API design"],
  };

  const node = createJDAnalysisNode({
    llmProvider: new MockLLMProvider({ structuredResponse: analysis }),
    loader,
    logger: silentLogger,
  });

  const result = await node(
    createBaseState(
      "We are hiring a Senior Backend Engineer to design and operate distributed APIs, improve reliability, work with Node.js and PostgreSQL, and collaborate with product teams on SaaS platform capabilities.",
    ),
  );

  assert.deepEqual(result.jdAnalysis, analysis);
  assert.equal(result.warnings, undefined);
});

test("returns minimal analysis and warning for short job description", async () => {
  const node = createJDAnalysisNode({
    llmProvider: new MockLLMProvider({
      structuredResponse: {
        roleSummary: "Should not be called",
      },
    }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState("Too short"));

  assert.equal(result.jdAnalysis?.roleSummary, "Minimal analysis for Senior Backend Engineer");
  assert.deepEqual(result.jdAnalysis?.mustHaveSkills, []);
  assert.deepEqual(result.warnings, ["Job description is too short to analyze reliably"]);
});
