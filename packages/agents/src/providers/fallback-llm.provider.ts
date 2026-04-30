import type { ZodSchema } from "zod";
import type { ChatMessage, GenerateOptions, LLMProvider } from "./provider.types";
import { StructuredOutputParseError, StructuredOutputValidationError } from "./provider.types";

export interface NamedLLMProvider {
  name: string;
  provider: LLMProvider;
}

const shouldFallback = (error: unknown): boolean => {
  // Don't fallback on validation/parse errors — they're a model-output problem,
  // not an availability problem. Fallback on everything else (auth, rate limit,
  // network, server errors).
  if (error instanceof StructuredOutputValidationError) return false;
  if (error instanceof StructuredOutputParseError) return false;
  return true;
};

export class FallbackLLMProvider implements LLMProvider {
  constructor(private readonly providers: NamedLLMProvider[]) {
    if (providers.length === 0) {
      throw new Error("FallbackLLMProvider requires at least one provider.");
    }
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    return this.tryProviders((p) => p.generate(messages, options), "generate");
  }

  async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    return this.tryProviders((p) => p.generateStructured(messages, schema, options), "generateStructured");
  }

  private async tryProviders<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    label: string,
  ): Promise<T> {
    let lastError: unknown;
    for (const { name, provider } of this.providers) {
      try {
        return await operation(provider);
      } catch (error) {
        lastError = error;
        if (!shouldFallback(error)) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[Fallback] ${name}.${label} failed (${message.substring(0, 100)}). Trying next provider...`);
      }
    }
    throw lastError;
  }
}
