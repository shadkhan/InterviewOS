import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { PromptLoader } from "./prompt-loader";

test("loads the base system prompt", async () => {
  const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
  const prompt = await loader.loadSystemPrompt("base-agent");

  assert.ok(prompt.trim().length > 0);
});
