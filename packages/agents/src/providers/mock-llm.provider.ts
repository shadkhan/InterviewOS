import type { ZodSchema } from "zod";
import { BaseLLMProvider } from "./llm.provider";
import {
  type ChatMessage,
  type GenerateOptions,
  StructuredOutputValidationError,
} from "./provider.types";

export interface MockLLMProviderConfig {
  textResponse?: string;
  structuredResponse?: unknown;
  responses?: string[];
}

export class MockLLMProvider extends BaseLLMProvider {
  private readonly textResponse: string;
  private readonly structuredResponse?: unknown;
  private readonly responses: string[];
  private responseIndex = 0;

  constructor(config: MockLLMProviderConfig = {}) {
    super();
    this.textResponse = config.textResponse ?? "{}";
    this.structuredResponse = config.structuredResponse;
    this.responses = config.responses ?? [];
  }

  async generate(_messages: ChatMessage[], _options?: GenerateOptions): Promise<string> {
    const queuedResponse = this.responses[this.responseIndex];

    if (queuedResponse !== undefined) {
      this.responseIndex += 1;
      return queuedResponse;
    }

    if (this.structuredResponse !== undefined) {
      return JSON.stringify(this.structuredResponse);
    }

    return this.textResponse;
  }

  override async generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodSchema<T>,
    options?: GenerateOptions,
  ): Promise<T> {
    if (this.structuredResponse !== undefined && this.responses.length === 0) {
      const result = schema.safeParse(this.structuredResponse);

      if (!result.success) {
        throw new StructuredOutputValidationError(JSON.stringify(this.structuredResponse), result.error);
      }

      return result.data;
    }

    return super.generateStructured(messages, schema, options);
  }
}
