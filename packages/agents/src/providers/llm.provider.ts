import type { ZodSchema } from "zod";
import {
  type ChatMessage,
  type GenerateOptions,
  type LLMProvider,
  ProviderConfigurationError,
  ProviderNotImplementedError,
  StructuredOutputParseError,
  StructuredOutputValidationError,
} from "./provider.types";

export abstract class BaseLLMProvider implements LLMProvider {
  abstract generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;

  async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    const rawResponse = await this.generate(messages, options);
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw new StructuredOutputParseError(rawResponse);
    }

    const result = schema.safeParse(parsed);

    if (!result.success) {
      throw new StructuredOutputValidationError(rawResponse, result.error);
    }

    return result.data;
  }
}

export interface EnvBackedProviderConfig {
  apiKey?: string;
}

const requireApiKey = (providerName: string, envName: string, apiKey?: string): string => {
  const resolvedApiKey = apiKey ?? process.env[envName];

  if (!resolvedApiKey) {
    throw new ProviderConfigurationError(`${providerName} requires ${envName}.`);
  }

  return resolvedApiKey;
};

export class OpenAILLMProvider extends BaseLLMProvider {
  private readonly apiKey: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.apiKey = requireApiKey("OpenAILLMProvider", "OPENAI_API_KEY", config.apiKey);
  }

  async generate(_messages: ChatMessage[], _options?: GenerateOptions): Promise<string> {
    void this.apiKey;
    // TODO: implement OpenAI LLM provider.
    throw new ProviderNotImplementedError("OpenAILLMProvider");
  }
}

export class GroqLLMProvider extends BaseLLMProvider {
  private readonly apiKey: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.apiKey = requireApiKey("GroqLLMProvider", "GROQ_API_KEY", config.apiKey);
  }

  async generate(_messages: ChatMessage[], _options?: GenerateOptions): Promise<string> {
    void this.apiKey;
    // TODO: implement Groq LLM provider.
    throw new ProviderNotImplementedError("GroqLLMProvider");
  }
}

export class AnthropicLLMProvider extends BaseLLMProvider {
  private readonly apiKey: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.apiKey = requireApiKey("AnthropicLLMProvider", "ANTHROPIC_API_KEY", config.apiKey);
  }

  async generate(_messages: ChatMessage[], _options?: GenerateOptions): Promise<string> {
    void this.apiKey;
    // TODO: implement Anthropic LLM provider.
    throw new ProviderNotImplementedError("AnthropicLLMProvider");
  }
}
