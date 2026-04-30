import type { ZodSchema } from "zod";
import { buildLogEntry, logApiCall } from "./call-logger";
import {
  StructuredOutputParseError,
  StructuredOutputValidationError,
  type ChatMessage,
  type GenerateOptions,
  type LLMProvider,
  type SearchOptions,
  type SearchProvider,
  type SearchResult,
} from "./provider.types";

const enrichErrorWithRawResponse = (error: unknown): unknown => {
  if (error instanceof StructuredOutputValidationError) {
    const enriched = new Error(
      `${error.message} | issues=${JSON.stringify(error.issues)} | rawResponse=${error.rawResponse.substring(0, 1500)}`,
    );
    enriched.name = error.name;
    return enriched;
  }
  if (error instanceof StructuredOutputParseError) {
    const enriched = new Error(`${error.message} | rawResponse=${error.rawResponse.substring(0, 1500)}`);
    enriched.name = error.name;
    return enriched;
  }
  return error;
};

const summarizeMessages = (messages: ChatMessage[]): string => {
  return messages
    .map((m) => `[${m.role}] ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
    .join("\n---\n");
};

export class LoggedLLMProvider implements LLMProvider {
  constructor(
    private readonly inner: LLMProvider,
    private readonly providerName: string,
  ) {}

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    const startedAt = Date.now();
    try {
      const result = await this.inner.generate(messages, options);
      logApiCall(
        buildLogEntry({
          type: "llm",
          provider: this.providerName,
          model: options?.model,
          startedAt,
          request: summarizeMessages(messages),
          response: result,
        }),
      );
      return result;
    } catch (error) {
      logApiCall(
        buildLogEntry({
          type: "llm",
          provider: this.providerName,
          model: options?.model,
          startedAt,
          request: summarizeMessages(messages),
          error: enrichErrorWithRawResponse(error),
        }),
      );
      throw error;
    }
  }

  async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await this.inner.generateStructured(messages, schema, options);
      logApiCall(
        buildLogEntry({
          type: "llm",
          provider: `${this.providerName} (structured)`,
          model: options?.model,
          startedAt,
          request: summarizeMessages(messages),
          response: result as object,
        }),
      );
      return result;
    } catch (error) {
      logApiCall(
        buildLogEntry({
          type: "llm",
          provider: `${this.providerName} (structured)`,
          model: options?.model,
          startedAt,
          request: summarizeMessages(messages),
          error: enrichErrorWithRawResponse(error),
        }),
      );
      throw error;
    }
  }
}

export class LoggedSearchProvider implements SearchProvider {
  constructor(
    private readonly inner: SearchProvider,
    private readonly providerName: string,
  ) {}

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const startedAt = Date.now();
    try {
      const results = await this.inner.search(query, options);
      logApiCall(
        buildLogEntry({
          type: "search",
          provider: this.providerName,
          startedAt,
          request: { query, options },
          response: { resultCount: results.length, results },
        }),
      );
      return results;
    } catch (error) {
      logApiCall(
        buildLogEntry({
          type: "search",
          provider: this.providerName,
          startedAt,
          request: { query, options },
          error,
        }),
      );
      throw error;
    }
  }
}
