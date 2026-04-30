import type { ZodSchema } from "zod";
import type { ChatMessage, GenerateOptions, LLMProvider } from "./provider.types";
import { StructuredOutputParseError, StructuredOutputValidationError } from "./provider.types";

const isTransientError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error instanceof StructuredOutputValidationError) return false;
  if (error instanceof StructuredOutputParseError) return false;

  const message = error.message.toLowerCase();
  if (message.includes("503")) return true;
  if (message.includes("502")) return true;
  if (message.includes("504")) return true;
  if (message.includes("429")) return true;
  if (message.includes("overloaded")) return true;
  if (message.includes("high demand")) return true;
  if (message.includes("service unavailable")) return true;
  if (message.includes("etimedout")) return true;
  if (message.includes("econnreset")) return true;
  if (message.includes("network")) return true;
  return false;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

const DEFAULT_RETRY: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1500,
  maxDelayMs: 10000,
  backoffFactor: 2,
};

export class RetryingLLMProvider implements LLMProvider {
  private readonly config: Required<RetryConfig>;

  constructor(
    private readonly inner: LLMProvider,
    config: RetryConfig = {},
  ) {
    this.config = { ...DEFAULT_RETRY, ...config };
  }

  private async withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown;
    let delay = this.config.initialDelayMs;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isTransientError(error) || attempt === this.config.maxAttempts) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[Retry] ${label} attempt ${attempt} failed (${message.substring(0, 100)}). Retrying in ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * this.config.backoffFactor, this.config.maxDelayMs);
      }
    }
    throw lastError;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    return this.withRetry(() => this.inner.generate(messages, options), "generate");
  }

  async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    return this.withRetry(() => this.inner.generateStructured(messages, schema, options), "generateStructured");
  }
}
