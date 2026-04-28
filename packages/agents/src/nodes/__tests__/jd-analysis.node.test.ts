import assert from "node:assert/strict";
import test from "node:test";
import { JDAnalysisSchema } from "@interviewos/shared";
import { createJDAnalysisNode } from "../jd-analysis.node";
import { createBaseState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validJDAnalysis } from "./test-fixtures";

test("happy path analyzes a valid job description and matches schema", async () => {
  const node = createJDAnalysisNode({ llmProvider: new QueueLLMProvider([validJDAnalysis]), loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.deepEqual(JDAnalysisSchema.parse(result.jdAnalysis), validJDAnalysis);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty input pushes a warning and does not crash", async () => {
  const node = createJDAnalysisNode({ llmProvider: new QueueLLMProvider([validJDAnalysis]), loader, logger: silentLogger });

  const result = await node(createBaseState({ jobDescription: "" }));

  assert.match(result.warnings?.[0] ?? "", /too short/);
  assert.equal(result.jdAnalysis?.roleSummary, "Minimal analysis for Senior Backend Engineer");
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createJDAnalysisNode({ llmProvider: new ThrowingLLMProvider(), loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.equal(result.errors?.at(-1)?.agent, "jdAnalysis");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
  assert.equal(result.jdAnalysis?.roleSummary, "Minimal analysis for Senior Backend Engineer");
});

test("schema validation failure is handled gracefully", async () => {
  const node = createJDAnalysisNode({
    llmProvider: new QueueLLMProvider([{ roleSummary: "Missing fields" }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "jdAnalysis");
});
