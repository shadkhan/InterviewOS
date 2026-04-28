import assert from "node:assert/strict";
import test from "node:test";
import { PainPointSchema } from "@interviewos/shared";
import { createPainPointNode } from "../pain-point.node";
import { createBaseState, createReadyState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validPainPointReport } from "./test-fixtures";

test("happy path analyzes pain points and matches schema", async () => {
  const node = createPainPointNode({ llmProvider: new QueueLLMProvider([validPainPointReport]), loader, logger: silentLogger });

  const result = await node(createReadyState({ painPointReport: undefined }));

  assert.deepEqual(PainPointSchema.parse(result.painPointReport), validPainPointReport);
  assert.equal(result.citations?.length, 1);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty prerequisite input pushes a warning and does not crash", async () => {
  const node = createPainPointNode({ llmProvider: new QueueLLMProvider([validPainPointReport]), loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.deepEqual(result.warnings, ["Company research is required before pain point analysis"]);
  assert.equal(result.painPointReport, undefined);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createPainPointNode({ llmProvider: new ThrowingLLMProvider(), loader, logger: silentLogger });

  const result = await node(createReadyState({ painPointReport: undefined }));

  assert.equal(result.errors?.at(-1)?.agent, "painPoint");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  const node = createPainPointNode({
    llmProvider: new QueueLLMProvider([{ likelyPainPoints: [] }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createReadyState({ painPointReport: undefined }));

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "painPoint");
});
