import { prisma } from "@interviewos/database";
import {
  AnthropicLLMProvider,
  GeminiLLMProvider,
  GroqLLMProvider,
  OpenAILLMProvider,
} from "./llm.provider";
import { FallbackLLMProvider, type NamedLLMProvider } from "./fallback-llm.provider";
import { LoggedLLMProvider, LoggedSearchProvider } from "./logged-providers";
import { RetryingLLMProvider } from "./retrying-llm.provider";
import { ExaSearchProvider, SerpApiSearchProvider, TavilySearchProvider } from "./search.provider";
import type { LLMProvider, SearchProvider } from "./provider.types";

const wrapLLM = (inner: LLMProvider, name: string): LLMProvider =>
  new LoggedLLMProvider(new RetryingLLMProvider(inner), name);

type ProviderName = "gemini" | "groq" | "anthropic" | "openai";

const PROVIDER_ORDER: ProviderName[] = ["groq", "gemini", "anthropic", "openai"];

// When the active provider fails, try these next (in order). Anthropic is paid,
// so it's intentionally NOT in the auto-fallback chain — users opt in by
// setting LLM_PROVIDER="anthropic" explicitly.
const FALLBACK_CHAIN: Record<ProviderName, ProviderName[]> = {
  gemini: ["groq"],
  groq: ["gemini"],
  anthropic: [],
  openai: [],
};

export const getActiveLLMProvider = async (): Promise<LLMProvider | undefined> => {
  const rows = await prisma.appSettings.findMany({
    where: {
      key: { in: ["LLM_PROVIDER", "GEMINI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"] },
    },
  });
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const getKey = (name: string): string | undefined => db[name] ?? process.env[name];

  const buildRaw = (name: ProviderName): LLMProvider | undefined => {
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

  const buildChain = (primary: ProviderName): LLMProvider | undefined => {
    const built: NamedLLMProvider[] = [];
    const tryAdd = (name: ProviderName) => {
      const raw = buildRaw(name);
      if (raw) built.push({ name, provider: wrapLLM(raw, name) });
    };
    tryAdd(primary);
    for (const fallback of FALLBACK_CHAIN[primary]) {
      tryAdd(fallback);
    }
    if (built.length === 0) return undefined;
    if (built.length === 1) return built[0]!.provider;
    return new FallbackLLMProvider(built);
  };

  const configured = (db["LLM_PROVIDER"] ?? process.env["LLM_PROVIDER"]) as ProviderName | undefined;
  if (configured) {
    const provider = buildChain(configured);
    if (provider) return provider;
  }

  for (const name of PROVIDER_ORDER) {
    const provider = buildChain(name);
    if (provider) return provider;
  }

  return undefined;
};

/**
 * Builds an LLM provider for one specific provider name with NO fallback.
 * Used by per-agent retry to force the user's selected provider.
 */
export const getLLMProviderByName = async (
  name: "gemini" | "groq" | "anthropic" | "openai",
): Promise<LLMProvider | undefined> => {
  const rows = await prisma.appSettings.findMany({
    where: { key: { in: ["GEMINI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"] } },
  });
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const getKey = (envName: string): string | undefined => db[envName] ?? process.env[envName];

  switch (name) {
    case "gemini": {
      const k = getKey("GEMINI_API_KEY");
      return k ? wrapLLM(new GeminiLLMProvider({ apiKey: k }), "gemini") : undefined;
    }
    case "groq": {
      const k = getKey("GROQ_API_KEY");
      return k ? wrapLLM(new GroqLLMProvider({ apiKey: k }), "groq") : undefined;
    }
    case "anthropic": {
      const k = getKey("ANTHROPIC_API_KEY");
      return k ? wrapLLM(new AnthropicLLMProvider({ apiKey: k }), "anthropic") : undefined;
    }
    case "openai": {
      const k = getKey("OPENAI_API_KEY");
      return k ? wrapLLM(new OpenAILLMProvider({ apiKey: k }), "openai") : undefined;
    }
  }
};

type SearchProviderName = "tavily" | "exa" | "serpapi";

const SEARCH_PROVIDER_ORDER: SearchProviderName[] = ["tavily", "exa", "serpapi"];

export const getActiveSearchProvider = (): SearchProvider | undefined => {
  const buildSearch = (name: SearchProviderName): SearchProvider | undefined => {
    switch (name) {
      case "tavily": {
        const k = process.env.TAVILY_API_KEY;
        return k ? new LoggedSearchProvider(new TavilySearchProvider({ apiKey: k }), "tavily") : undefined;
      }
      case "exa": {
        const k = process.env.EXA_API_KEY;
        return k ? new LoggedSearchProvider(new ExaSearchProvider({ apiKey: k }), "exa") : undefined;
      }
      case "serpapi": {
        const k = process.env.SERPAPI_KEY;
        return k ? new LoggedSearchProvider(new SerpApiSearchProvider({ apiKey: k }), "serpapi") : undefined;
      }
    }
  };

  for (const name of SEARCH_PROVIDER_ORDER) {
    const provider = buildSearch(name);
    if (provider) return provider;
  }
  return undefined;
};
