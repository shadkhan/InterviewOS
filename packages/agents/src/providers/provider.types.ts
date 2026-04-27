import type { ZodError, ZodSchema } from "zod";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export type SearchSourceType = "official" | "news" | "salary-platform" | "candidate-reported" | "inferred";

export interface SearchOptions {
  maxResults?: number;
  sourceTypes?: SearchSourceType[];
  includeDomains?: string[];
  excludeDomains?: string[];
  freshnessDays?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceType: SearchSourceType;
}

export interface LLMProvider {
  generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;
  generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T>;
}

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

export class ProviderNotImplementedError extends Error {
  constructor(providerName: string) {
    super(`${providerName} is not implemented yet.`);
    this.name = "ProviderNotImplementedError";
  }
}

export class StructuredOutputValidationError extends Error {
  readonly issues: ZodError["issues"];
  readonly rawResponse: string;

  constructor(rawResponse: string, error: ZodError) {
    super("LLM structured response failed schema validation.");
    this.name = "StructuredOutputValidationError";
    this.issues = error.issues;
    this.rawResponse = rawResponse;
  }
}

export class StructuredOutputParseError extends Error {
  readonly rawResponse: string;

  constructor(rawResponse: string) {
    super("LLM structured response was not valid JSON.");
    this.name = "StructuredOutputParseError";
    this.rawResponse = rawResponse;
  }
}
