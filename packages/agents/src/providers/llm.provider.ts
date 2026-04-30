import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";
import type { ZodSchema } from "zod";
import {
  type ChatMessage,
  type GenerateOptions,
  type LLMProvider,
  ProviderConfigurationError,
  StructuredOutputParseError,
  StructuredOutputValidationError,
} from "./provider.types";

// --- message helpers ---

type SimpleChatMessage = { role: "system" | "user" | "assistant"; content: string };

function toSimpleMessages(messages: ChatMessage[]): SimpleChatMessage[] {
  return messages
    .filter(
      (m): m is ChatMessage & { role: "system" | "user" | "assistant" } =>
        m.role === "system" || m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

type AnthropicSystemBlock = { type: "text"; text: string; cache_control: { type: "ephemeral" } };
type AnthropicChatMessage = { role: "user" | "assistant"; content: string };

function splitAnthropicMessages(messages: ChatMessage[]): {
  system: AnthropicSystemBlock[];
  chatMessages: AnthropicChatMessage[];
} {
  const system: AnthropicSystemBlock[] = [];
  const chatMessages: AnthropicChatMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system.push({ type: "text", text: msg.content, cache_control: { type: "ephemeral" } });
    } else if (msg.role === "user" || msg.role === "assistant") {
      chatMessages.push({ role: msg.role, content: msg.content });
    }
  }

  return { system, chatMessages };
}

const ANTHROPIC_JSON_INSTRUCTION =
  "\n\nRespond with valid JSON only. Do not include markdown code fences, explanations, or any text outside the JSON object.";

function appendJsonInstruction(messages: AnthropicChatMessage[]): AnthropicChatMessage[] {
  const last = messages.at(-1);
  if (!last || last.role !== "user") return messages;
  return [...messages.slice(0, -1), { role: "user" as const, content: last.content + ANTHROPIC_JSON_INSTRUCTION }];
}

function stripMarkdownFences(text: string): string {
  const match = text.trim().match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return match ? (match[1] ?? "").trim() : text.trim();
}

// --- base class ---

export abstract class BaseLLMProvider implements LLMProvider {
  abstract generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;

  protected parseAndValidate<T>(rawResponse: string, schema: ZodSchema<T>): T {
    const cleaned = stripMarkdownFences(rawResponse);
    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new StructuredOutputParseError(rawResponse);
    }

    const result = schema.safeParse(parsed);

    if (!result.success) {
      throw new StructuredOutputValidationError(rawResponse, result.error);
    }

    return result.data;
  }

  async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    const rawResponse = await this.generate(messages, options);
    return this.parseAndValidate(rawResponse, schema);
  }
}

// --- shared config ---

export interface EnvBackedProviderConfig {
  apiKey?: string;
  model?: string;
}

const requireApiKey = (providerName: string, envName: string, apiKey?: string): string => {
  const resolvedApiKey = apiKey ?? process.env[envName];

  if (!resolvedApiKey) {
    throw new ProviderConfigurationError(`${providerName} requires ${envName}.`);
  }

  return resolvedApiKey;
};

// --- OpenAI ---

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export class OpenAILLMProvider extends BaseLLMProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.client = new OpenAI({
      apiKey: requireApiKey("OpenAILLMProvider", "OPENAI_API_KEY", config.apiKey),
    });
    this.model = config.model ?? DEFAULT_OPENAI_MODEL;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.model,
      messages: toSimpleMessages(messages),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
    });

    return response.choices[0]?.message.content ?? "";
  }

  override async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.model,
      messages: toSimpleMessages(messages),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      response_format: { type: "json_object" },
    });

    return this.parseAndValidate(response.choices[0]?.message.content ?? "{}", schema);
  }
}

// --- Groq ---

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export class GroqLLMProvider extends BaseLLMProvider {
  private readonly client: Groq;
  private readonly model: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.client = new Groq({
      apiKey: requireApiKey("GroqLLMProvider", "GROQ_API_KEY", config.apiKey),
    });
    this.model = config.model ?? DEFAULT_GROQ_MODEL;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.model,
      messages: toSimpleMessages(messages) as Groq.Chat.ChatCompletionMessageParam[],
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
    });

    return response.choices[0]?.message.content ?? "";
  }

  override async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    // Groq's response_format=json_object requires the word "json" to appear
    // somewhere in the messages. We append a JSON instruction to the last
    // user message if none of the messages already mention json.
    const simpleMessages = toSimpleMessages(messages);
    const messagesWithJson = ensureJsonMention(simpleMessages);

    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.model,
      messages: messagesWithJson as Groq.Chat.ChatCompletionMessageParam[],
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      response_format: { type: "json_object" },
    });

    return this.parseAndValidate(response.choices[0]?.message.content ?? "{}", schema);
  }
}

const JSON_INSTRUCTION =
  "\n\nRespond with valid JSON only. Do not include markdown code fences, explanations, or any text outside the JSON object.";

function ensureJsonMention(messages: SimpleChatMessage[]): SimpleChatMessage[] {
  if (messages.some((m) => m.content.toLowerCase().includes("json"))) {
    return messages;
  }
  const last = messages.at(-1);
  if (!last || last.role !== "user") return messages;
  return [...messages.slice(0, -1), { role: "user" as const, content: last.content + JSON_INSTRUCTION }];
}

// --- Gemini ---

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

type GeminiContent = { role: "user" | "model"; parts: [{ text: string }] };

function toGeminiMessages(messages: ChatMessage[]): {
  systemText: string | null;
  history: GeminiContent[];
  lastUserMessage: string;
} {
  const systemText =
    messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n") || null;

  const nonSystem = messages.filter((m) => m.role !== "system");
  const last = nonSystem.at(-1);
  const history: GeminiContent[] = nonSystem.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return { systemText, history, lastUserMessage: last?.content ?? "" };
}

export class GeminiLLMProvider extends BaseLLMProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.client = new GoogleGenerativeAI(
      requireApiKey("GeminiLLMProvider", "GEMINI_API_KEY", config.apiKey),
    );
    this.model = config.model ?? DEFAULT_GEMINI_MODEL;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    const { systemText, history, lastUserMessage } = toGeminiMessages(messages);
    const model = this.client.getGenerativeModel({
      model: options?.model ?? this.model,
      ...(systemText && { systemInstruction: systemText }),
      ...(options?.temperature !== undefined && { generationConfig: { temperature: options.temperature } }),
    });

    if (history.length === 0) {
      const result = await model.generateContent(lastUserMessage);
      return result.response.text();
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastUserMessage);
    return result.response.text();
  }

  override async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    const { systemText, history, lastUserMessage } = toGeminiMessages(messages);
    const model = this.client.getGenerativeModel({
      model: options?.model ?? this.model,
      ...(systemText && { systemInstruction: systemText }),
      generationConfig: {
        responseMimeType: "application/json",
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      },
    });

    if (history.length === 0) {
      const result = await model.generateContent(lastUserMessage);
      return this.parseAndValidate(result.response.text(), schema);
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastUserMessage);
    return this.parseAndValidate(result.response.text(), schema);
  }
}

// --- Anthropic ---

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";

export class AnthropicLLMProvider extends BaseLLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: EnvBackedProviderConfig = {}) {
    super();
    this.client = new Anthropic({
      apiKey: requireApiKey("AnthropicLLMProvider", "ANTHROPIC_API_KEY", config.apiKey),
    });
    this.model = config.model ?? DEFAULT_ANTHROPIC_MODEL;
  }

  private isOpus47(model: string): boolean {
    return model.includes("opus-4-7");
  }

  private extractText(content: Array<{ type: string; text?: string }>): string {
    return content
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    const model = options?.model ?? this.model;
    const { system, chatMessages } = splitAnthropicMessages(messages);

    const response = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      ...(system.length > 0 && { system }),
      messages: chatMessages,
      ...(!this.isOpus47(model) && options?.temperature !== undefined && { temperature: options.temperature }),
    });

    return this.extractText(response.content);
  }

  override async generateStructured<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: GenerateOptions): Promise<T> {
    const model = options?.model ?? this.model;
    const { system, chatMessages } = splitAnthropicMessages(messages);
    const messagesWithJson = appendJsonInstruction(chatMessages);

    const response = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      ...(system.length > 0 && { system }),
      messages: messagesWithJson,
      ...(!this.isOpus47(model) && options?.temperature !== undefined && { temperature: options.temperature }),
    });

    return this.parseAndValidate(this.extractText(response.content), schema);
  }
}
