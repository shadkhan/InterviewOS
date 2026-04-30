import assert from "node:assert/strict";
import test from "node:test";
import { extractJson } from "./llm.provider";

test("returns pure JSON object unchanged", () => {
  assert.equal(extractJson('{"a":1}'), '{"a":1}');
});

test("returns pure JSON array unchanged", () => {
  assert.equal(extractJson('[{"a":1}]'), '[{"a":1}]');
});

test("trims surrounding whitespace", () => {
  assert.equal(extractJson('  \n{"a":1}\n  '), '{"a":1}');
});

test("strips ```json fenced block", () => {
  assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
});

test("strips ``` fenced block without json tag", () => {
  assert.equal(extractJson('```\n{"a":1}\n```'), '{"a":1}');
});

test("strips fence even when closing fence is missing (truncated response)", () => {
  // Simulates Anthropic max_tokens truncation: opening fence, no closing fence
  const input = '```json\n{"a":1,"b":2,"c":';
  const result = extractJson(input);
  // We don't expect this to be valid JSON — but the leading fence MUST be gone
  // so JSON.parse gives a meaningful "unexpected end of input" error rather
  // than choking on the backticks.
  assert.ok(!result.startsWith("```"), `Expected fence stripped, got: ${result}`);
  assert.ok(result.startsWith('{"a":1'), `Expected JSON content, got: ${result}`);
});

test("extracts JSON object embedded in prose", () => {
  const input = 'Here is the JSON:\n{"a":1}\n\nLet me know if you need more.';
  assert.equal(extractJson(input), '{"a":1}');
});

test("extracts JSON array embedded in prose", () => {
  const input = 'The result is: [1,2,3]. End.';
  assert.equal(extractJson(input), '[1,2,3]');
});

test("returns input unchanged when no JSON detected", () => {
  assert.equal(extractJson("not json at all"), "not json at all");
});

test("handles uppercase JSON tag", () => {
  assert.equal(extractJson('```JSON\n{"a":1}\n```'), '{"a":1}');
});

test("handles trailing whitespace after closing fence", () => {
  assert.equal(extractJson('```json\n{"a":1}\n```   \n'), '{"a":1}');
});
