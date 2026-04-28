import assert from "node:assert/strict";
import test from "node:test";
import { AnswerGuideSchema } from "@interviewos/shared";
import { createAnswerCoachNode } from "../answer-coach.node";
import {
  createBaseState,
  createReadyState,
  loader,
  QueueLLMProvider,
  silentLogger,
  ThrowingLLMProvider,
  validAnswerGuide,
} from "./test-fixtures";

test("happy path coaches selected questions and output matches schema", async () => {
  const node = createAnswerCoachNode({
    llmProvider: new QueueLLMProvider([validAnswerGuide, { ...validAnswerGuide, questionId: "technical-2" }, { ...validAnswerGuide, questionId: "resumeDeepDive-3" }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createReadyState({ answerGuides: undefined }));

  assert.equal(result.answerGuides?.length, 3);
  assert.deepEqual(result.answerGuides?.map((guide) => AnswerGuideSchema.parse(guide).questionId), [
    "behavioral-1",
    "technical-2",
    "resumeDeepDive-3",
  ]);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty prerequisite input pushes warnings and does not crash", async () => {
  const node = createAnswerCoachNode({ llmProvider: new QueueLLMProvider([validAnswerGuide]), loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.equal(result.answerGuides, undefined);
  assert.equal(result.warnings?.length, 3);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createAnswerCoachNode({ llmProvider: new ThrowingLLMProvider(), loader, logger: silentLogger });

  const result = await node(createReadyState({ answerGuides: undefined }));

  assert.equal(result.errors?.at(-1)?.agent, "answerCoach");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  const node = createAnswerCoachNode({
    llmProvider: new QueueLLMProvider([{ questionId: "behavioral-1" }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createReadyState({ answerGuides: undefined }));

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "answerCoach");
});
