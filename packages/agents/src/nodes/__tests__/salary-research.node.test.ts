import assert from "node:assert/strict";
import test from "node:test";
import { SalaryInsightSchema } from "@interviewos/shared";
import { MockSearchProvider } from "../../providers";
import { createSalaryResearchNode } from "../salary-research.node";
import { createBaseState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validSalaryInsight } from "./test-fixtures";

const searchProvider = new MockSearchProvider({
  defaultResults: [
    {
      title: "Example salary data",
      url: "https://salary.example.com/role",
      snippet: "Senior backend engineer salary range.",
      sourceType: "salary-platform",
    },
    {
      title: "Example candidate salary",
      url: "https://candidate.example.com/role",
      snippet: "Candidate-reported compensation for backend roles.",
      sourceType: "candidate-reported",
    },
    {
      title: "Example official careers",
      url: "https://example.com/careers",
      snippet: "Official careers page.",
      sourceType: "official",
    },
  ],
});

test("happy path researches salary and matches schema", async () => {
  const node = createSalaryResearchNode({
    llmProvider: new QueueLLMProvider([validSalaryInsight]),
    searchProvider,
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.deepEqual(SalaryInsightSchema.parse(result.salaryInsight), validSalaryInsight);
  assert.equal(result.citations?.length, 3);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty location pushes a warning and does not crash", async () => {
  const node = createSalaryResearchNode({
    llmProvider: new QueueLLMProvider([validSalaryInsight]),
    searchProvider,
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState({ location: undefined }));

  assert.match(result.warnings?.[0] ?? "", /Location not specified/);
  assert.ok(result.salaryInsight);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createSalaryResearchNode({ llmProvider: new ThrowingLLMProvider(), searchProvider, loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.equal(result.errors?.at(-1)?.agent, "salaryResearch");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  // Pass a non-object so the outer z.object schema rejects it. Field-level
  // lenient preprocessors coerce most partial objects into validity.
  const node = createSalaryResearchNode({
    llmProvider: new QueueLLMProvider(["NOT_AN_OBJECT"]),
    searchProvider,
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "salaryResearch");
});
