import assert from "node:assert/strict";
import test from "node:test";
import { ResumeProfileSchema } from "@interviewos/shared";
import { createResumeParserNode } from "../resume-parser.node";
import { createBaseState, loader, QueueLLMProvider, silentLogger, ThrowingLLMProvider, validResumeProfile } from "./test-fixtures";

test("happy path parses a valid resume and matches schema", async () => {
  const node = createResumeParserNode({
    llmProvider: new QueueLLMProvider([validResumeProfile]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.deepEqual(ResumeProfileSchema.parse(result.resumeProfile), validResumeProfile);
  assert.equal(result.warnings, undefined);
  assert.equal(result.errors, undefined);
});

test("empty input pushes a warning and does not crash", async () => {
  const node = createResumeParserNode({
    llmProvider: new QueueLLMProvider([validResumeProfile]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState({ resumeText: "" }));

  assert.equal(result.resumeProfile?.currentTitle, "");
  assert.deepEqual(result.warnings, ["Resume text is too short to parse reliably"]);
});

test("LLM failure is caught and added to state errors", async () => {
  const node = createResumeParserNode({ llmProvider: new ThrowingLLMProvider(), loader, logger: silentLogger });

  const result = await node(createBaseState());

  assert.equal(result.resumeProfile?.currentTitle, "");
  assert.equal(result.errors?.at(-1)?.agent, "resumeParser");
  assert.match(result.errors?.at(-1)?.message ?? "", /LLM unavailable/);
});

test("schema validation failure is handled gracefully", async () => {
  // Pass a non-object so the outer z.object schema rejects it. The schema's
  // lenient field preprocessors coerce most partial objects into validity, so
  // a string at the top level is the cleanest way to trigger a real error.
  const node = createResumeParserNode({
    llmProvider: new QueueLLMProvider(["NOT_AN_OBJECT"]),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState());

  assert.equal(result.resumeProfile?.currentTitle, "");
  assert.match(result.warnings?.at(-1) ?? "", /invalid structured output/);
  assert.equal(result.errors?.at(-1)?.agent, "resumeParser");
});
