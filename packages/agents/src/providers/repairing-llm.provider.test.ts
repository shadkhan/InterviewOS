import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { RepairingLLMProvider } from "./repairing-llm.provider";
import {
  type ChatMessage,
  type GenerateOptions,
  type LLMProvider,
  StructuredOutputParseError,
  StructuredOutputValidationError,
} from "./provider.types";

const targetSchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
});
type Target = z.infer<typeof targetSchema>;

class ScriptedProvider implements LLMProvider {
  readonly recordedMessages: ChatMessage[][] = [];
  callCount = 0;

  constructor(
    private readonly script: Array<
      | { kind: "validation"; raw: string }
      | { kind: "parse"; raw: string }
      | { kind: "throw"; error: Error }
      | { kind: "ok"; value: Target }
    >,
  ) {}

  async generate(): Promise<string> {
    throw new Error("not used");
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: import("zod").ZodSchema<T>,
    _options?: GenerateOptions,
  ): Promise<T> {
    this.recordedMessages.push(messages);
    const step = this.script[this.callCount];
    this.callCount += 1;

    if (!step) throw new Error("ScriptedProvider exhausted");

    if (step.kind === "validation") {
      const parsed = targetSchema.safeParse(JSON.parse(step.raw));
      if (parsed.success) throw new Error("Test misconfigured: validation step produced valid output");
      throw new StructuredOutputValidationError(step.raw, parsed.error);
    }
    if (step.kind === "parse") {
      throw new StructuredOutputParseError(step.raw);
    }
    if (step.kind === "throw") {
      throw step.error;
    }
    return schema.parse(step.value);
  }
}

const baseMessages: ChatMessage[] = [
  { role: "system", content: "You are a helper." },
  { role: "user", content: "Return a JSON object with name and tags." },
];

test("succeeds on first try without modifying messages", async () => {
  const inner = new ScriptedProvider([{ kind: "ok", value: { name: "x", tags: ["a"] } }]);
  const provider = new RepairingLLMProvider(inner);

  const result = await provider.generateStructured(baseMessages, targetSchema);

  assert.deepEqual(result, { name: "x", tags: ["a"] });
  assert.equal(inner.callCount, 1);
  assert.deepEqual(inner.recordedMessages[0], baseMessages);
});

test("recovers after a single validation failure by re-prompting", async () => {
  const broken = JSON.stringify({ name: "x", tags: "not-an-array" });
  const inner = new ScriptedProvider([
    { kind: "validation", raw: broken },
    { kind: "ok", value: { name: "x", tags: ["a", "b"] } },
  ]);
  const provider = new RepairingLLMProvider(inner);

  const result = await provider.generateStructured(baseMessages, targetSchema);

  assert.deepEqual(result, { name: "x", tags: ["a", "b"] });
  assert.equal(inner.callCount, 2);

  const repairMessages = inner.recordedMessages[1]!;
  assert.equal(repairMessages.length, baseMessages.length + 2);
  assert.equal(repairMessages.at(-2)?.role, "assistant");
  assert.equal(repairMessages.at(-2)?.content, broken);
  assert.equal(repairMessages.at(-1)?.role, "user");
  assert.match(repairMessages.at(-1)?.content ?? "", /repair attempt 2\/3/);
  assert.match(repairMessages.at(-1)?.content ?? "", /tags/);
});

test("recovers after a JSON parse failure by re-prompting", async () => {
  const inner = new ScriptedProvider([
    { kind: "parse", raw: "not json {" },
    { kind: "ok", value: { name: "x", tags: [] } },
  ]);
  const provider = new RepairingLLMProvider(inner);

  const result = await provider.generateStructured(baseMessages, targetSchema);

  assert.deepEqual(result, { name: "x", tags: [] });
  assert.equal(inner.callCount, 2);
  assert.match(inner.recordedMessages[1]!.at(-1)?.content ?? "", /not valid JSON/);
});

test("throws the last validation error after exhausting repair attempts", async () => {
  const broken = JSON.stringify({ name: "x" });
  const inner = new ScriptedProvider([
    { kind: "validation", raw: broken },
    { kind: "validation", raw: broken },
    { kind: "validation", raw: broken },
  ]);
  const provider = new RepairingLLMProvider(inner, { maxRepairAttempts: 2 });

  await assert.rejects(
    () => provider.generateStructured(baseMessages, targetSchema),
    (err: unknown) => err instanceof StructuredOutputValidationError,
  );
  assert.equal(inner.callCount, 3);
});

test("does not retry on non-structured errors (e.g. 429)", async () => {
  const inner = new ScriptedProvider([{ kind: "throw", error: new Error("429 Too Many Requests") }]);
  const provider = new RepairingLLMProvider(inner);

  await assert.rejects(
    () => provider.generateStructured(baseMessages, targetSchema),
    /429 Too Many Requests/,
  );
  assert.equal(inner.callCount, 1);
});

test("custom maxRepairAttempts is honored", async () => {
  const broken = JSON.stringify({ name: "x" });
  const inner = new ScriptedProvider([
    { kind: "validation", raw: broken },
    { kind: "validation", raw: broken },
    { kind: "ok", value: { name: "x", tags: ["a"] } },
  ]);
  const provider = new RepairingLLMProvider(inner, { maxRepairAttempts: 4 });

  const result = await provider.generateStructured(baseMessages, targetSchema);
  assert.deepEqual(result, { name: "x", tags: ["a"] });
  assert.equal(inner.callCount, 3);
});

test("plain generate() is delegated unchanged", async () => {
  let captured: ChatMessage[] | undefined;
  const inner: LLMProvider = {
    async generate(messages) {
      captured = messages;
      return "hello";
    },
    async generateStructured() {
      throw new Error("not used");
    },
  };

  const provider = new RepairingLLMProvider(inner);
  const result = await provider.generate(baseMessages);

  assert.equal(result, "hello");
  assert.deepEqual(captured, baseMessages);
});
