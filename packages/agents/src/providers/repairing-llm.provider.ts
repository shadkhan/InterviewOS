import type { ZodSchema } from "zod";
import {
  type ChatMessage,
  type GenerateOptions,
  type LLMProvider,
  StructuredOutputParseError,
  StructuredOutputValidationError,
} from "./provider.types";

export interface RepairConfig {
  maxRepairAttempts?: number;
}

const DEFAULT_REPAIR: Required<RepairConfig> = {
  maxRepairAttempts: 2,
};

const buildValidationRepairMessages = (
  original: ChatMessage[],
  rawResponse: string,
  issues: StructuredOutputValidationError["issues"],
  attemptNumber: number,
  totalAttempts: number,
): ChatMessage[] => {
  const issueSummary = issues
    .map((i) => `- path "${i.path.join(".") || "(root)"}": ${i.message} (code: ${i.code})`)
    .join("\n");

  return [
    ...original,
    { role: "assistant", content: rawResponse },
    {
      role: "user",
      content:
        `[repair attempt ${attemptNumber}/${totalAttempts}] ` +
        `Your previous response failed schema validation:\n${issueSummary}\n\n` +
        `Return a corrected JSON object that strictly matches the required schema. ` +
        `Pay special attention to field types: arrays must be JSON arrays, not strings; ` +
        `keys must match exactly. Do not include any text outside the JSON.`,
    },
  ];
};

const buildParseRepairMessages = (
  original: ChatMessage[],
  rawResponse: string,
  attemptNumber: number,
  totalAttempts: number,
): ChatMessage[] => {
  return [
    ...original,
    { role: "assistant", content: rawResponse },
    {
      role: "user",
      content:
        `[repair attempt ${attemptNumber}/${totalAttempts}] ` +
        `Your previous response was not valid JSON. ` +
        `Return a single JSON object only — no markdown fences, no commentary, no trailing text.`,
    },
  ];
};

/**
 * Wraps an LLM provider so that structured-output failures (Zod validation or
 * JSON parse errors) trigger a self-heal loop: the broken response and the
 * validation issues are fed back to the same model, which is asked to produce
 * a corrected JSON object. Falls through to the underlying error after
 * `maxRepairAttempts` failed repairs.
 *
 * Place INSIDE Logged (so each attempt produces its own log entry) and
 * OUTSIDE Retrying (so transient-error backoff happens within a single
 * repair attempt without losing repair progress).
 */
export class RepairingLLMProvider implements LLMProvider {
  private readonly config: Required<RepairConfig>;

  constructor(
    private readonly inner: LLMProvider,
    config: RepairConfig = {},
  ) {
    this.config = { ...DEFAULT_REPAIR, ...config };
  }

  generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    return this.inner.generate(messages, options);
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodSchema<T>,
    options?: GenerateOptions,
  ): Promise<T> {
    const totalAttempts = this.config.maxRepairAttempts + 1;
    let currentMessages = messages;
    let lastError: unknown;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        return await this.inner.generateStructured(currentMessages, schema, options);
      } catch (error) {
        lastError = error;

        if (error instanceof StructuredOutputValidationError) {
          if (attempt === totalAttempts) throw error;
          currentMessages = buildValidationRepairMessages(
            messages,
            error.rawResponse,
            error.issues,
            attempt + 1,
            totalAttempts,
          );
          continue;
        }

        if (error instanceof StructuredOutputParseError) {
          if (attempt === totalAttempts) throw error;
          currentMessages = buildParseRepairMessages(
            messages,
            error.rawResponse,
            attempt + 1,
            totalAttempts,
          );
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }
}
