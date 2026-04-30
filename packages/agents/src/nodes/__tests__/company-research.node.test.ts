import assert from "node:assert/strict";
import test from "node:test";
import { CompanyResearchSchema } from "@interviewos/shared";
import { MockSearchProvider } from "../../providers";
import { createCompanyResearchNode } from "../company-research.node";
import { createBaseState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validCompanyResearch } from "./test-fixtures";

const searchProvider = new MockSearchProvider({
  defaultResults: [
    {
      title: "Example Co about",
      url: "https://example.com/about",
      snippet: "Example Co builds workflow software.",
      sourceType: "official",
    },
  ],
});

test("happy path researches a company and matches schema", async () => {
  const node = createCompanyResearchNode({
    llmProvider: new QueueLLMProvider([validCompanyResearch]),
    searchProvider,
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.deepEqual(CompanyResearchSchema.parse(result.companyResearch), validCompanyResearch);
  assert.equal(result.citations?.length, 1);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty provider input pushes a warning and does not crash", async () => {
  const node = createCompanyResearchNode({ loader, logger: silentLogger });

  const result = await node(createBaseState({ companyName: "" }));

  assert.match(result.warnings?.[0] ?? "", /providers are not configured/);
  assert.match(result.companyResearch?.risksOrUncertainties[0] ?? "", /requires configured/);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createCompanyResearchNode({ llmProvider: new ThrowingLLMProvider(), searchProvider, loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.equal(result.errors?.at(-1)?.agent, "companyResearch");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  // Pass a non-object so the outer z.object schema rejects it. Field-level
  // lenient preprocessors coerce most partial objects into validity.
  const node = createCompanyResearchNode({
    llmProvider: new QueueLLMProvider(["NOT_AN_OBJECT"]),
    searchProvider,
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "companyResearch");
});
