import assert from "node:assert/strict";
import test from "node:test";
import { InterviewQuestionSchema } from "@interviewos/shared";
import { createInterviewQuestionNode } from "../interview-question.node";
import { createBaseState, createReadyState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validInterviewQuestions } from "./test-fixtures";

test("happy path generates questions and each item matches schema", async () => {
  const node = createInterviewQuestionNode({
    llmProvider: new QueueLLMProvider([{ questions: validInterviewQuestions }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createReadyState({ interviewQuestions: undefined }));

  assert.deepEqual(result.interviewQuestions?.map((question) => InterviewQuestionSchema.parse(question)), validInterviewQuestions);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty prerequisite input pushes warnings and does not crash", async () => {
  const node = createInterviewQuestionNode({
    llmProvider: new QueueLLMProvider([{ questions: validInterviewQuestions }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.equal(result.interviewQuestions, undefined);
  assert.equal(result.warnings?.length, 4);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createInterviewQuestionNode({ llmProvider: new ThrowingLLMProvider(), loader, logger: silentLogger });

  const result = await node(createReadyState({ interviewQuestions: undefined }));

  assert.equal(result.errors?.at(-1)?.agent, "interviewQuestion");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  const node = createInterviewQuestionNode({
    llmProvider: new QueueLLMProvider([{ questions: [{ question: "Missing fields" }] }]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createReadyState({ interviewQuestions: undefined }));

  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "interviewQuestion");
});
