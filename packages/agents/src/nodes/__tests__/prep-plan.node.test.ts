import assert from "node:assert/strict";
import test from "node:test";
import { PrepPlanSchema } from "@interviewos/shared";
import { createPrepPlanNode } from "../prep-plan.node";
import { createBaseState, createReadyState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validPrepPlan } from "./test-fixtures";

test("happy path generates a prep plan and matches schema", async () => {
  const node = createPrepPlanNode({
    llmProvider: new QueueLLMProvider([validPrepPlan]),
    loader,
    logger: silentLogger,
    now: () => new Date("2026-04-28T00:00:00.000Z"),
  });

  const result = await node(createReadyState({ prepPlan: undefined }));

  assert.deepEqual(PrepPlanSchema.parse(result.prepPlan), validPrepPlan);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty prerequisite input pushes warnings and does not crash", async () => {
  const node = createPrepPlanNode({ llmProvider: new QueueLLMProvider([validPrepPlan]), loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.equal(result.prepPlan, undefined);
  assert.equal(result.warnings?.length, 5);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createPrepPlanNode({ llmProvider: new ThrowingLLMProvider(), loader, logger: silentLogger });

  const result = await node(createReadyState({ prepPlan: undefined }));

  assert.equal(result.errors?.at(-1)?.agent, "prepPlan");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  const node = createPrepPlanNode({
    llmProvider: new QueueLLMProvider([{ ...validPrepPlan, sevenDayPlan: validPrepPlan.sevenDayPlan.slice(0, 1) }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createReadyState({ prepPlan: undefined }));

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "prepPlan");
});
