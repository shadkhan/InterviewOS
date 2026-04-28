import { prisma } from "@interviewos/database";
import {
  AnthropicLLMProvider,
  GeminiLLMProvider,
  GroqLLMProvider,
  OpenAILLMProvider,
} from "./llm.provider";
import type { LLMProvider } from "./provider.types";

type ProviderName = "gemini" | "groq" | "anthropic" | "openai";

const PROVIDER_ORDER: ProviderName[] = ["groq", "gemini", "anthropic", "openai"];

export const getActiveLLMProvider = async (): Promise<LLMProvider | undefined> => {
  const rows = await prisma.appSettings.findMany({
    where: {
      key: { in: ["LLM_PROVIDER", "GEMINI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"] },
    },
  });
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const getKey = (name: string): string | undefined => db[name] ?? process.env[name];

  const build = (name: ProviderName): LLMProvider | undefined => {
    switch (name) {
      case "gemini": {
        const k = getKey("GEMINI_API_KEY");
        return k ? new GeminiLLMProvider({ apiKey: k }) : undefined;
      }
      case "groq": {
        const k = getKey("GROQ_API_KEY");
        return k ? new GroqLLMProvider({ apiKey: k }) : undefined;
      }
      case "anthropic": {
        const k = getKey("ANTHROPIC_API_KEY");
        return k ? new AnthropicLLMProvider({ apiKey: k }) : undefined;
      }
      case "openai": {
        const k = getKey("OPENAI_API_KEY");
        return k ? new OpenAILLMProvider({ apiKey: k }) : undefined;
      }
    }
  };

  const configured = (db["LLM_PROVIDER"] ?? process.env["LLM_PROVIDER"]) as ProviderName | undefined;
  if (configured) {
    const provider = build(configured);
    if (provider) return provider;
  }

  for (const name of PROVIDER_ORDER) {
    const provider = build(name);
    if (provider) return provider;
  }

  return undefined;
};
