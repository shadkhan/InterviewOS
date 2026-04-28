import { prisma } from "@interviewos/database";

export type ProviderName = "gemini" | "groq" | "anthropic" | "openai";

const PROVIDER_NAMES: ProviderName[] = ["gemini", "groq", "anthropic", "openai"];
const KEY_ENV_MAP: Record<ProviderName, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

export interface ProviderInfo {
  name: ProviderName;
  label: string;
  model: string;
  free: boolean;
  docsUrl: string;
  configured: boolean;
  active: boolean;
}

export interface SettingsResponse {
  activeLLMProvider: ProviderName | null;
  providers: ProviderInfo[];
}

export interface UpdateSettingsInput {
  llmProvider?: string;
  apiKeys?: Partial<Record<string, string>>;
}

const PROVIDER_META: Record<ProviderName, Pick<ProviderInfo, "label" | "model" | "free" | "docsUrl">> = {
  groq: {
    label: "Groq",
    model: "Llama 3.3 70B (Free)",
    free: true,
    docsUrl: "https://console.groq.com/keys",
  },
  gemini: {
    label: "Google Gemini",
    model: "Gemini 2.5 Flash (Free)",
    free: true,
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  anthropic: {
    label: "Anthropic",
    model: "Claude Haiku 4.5",
    free: false,
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "OpenAI",
    model: "GPT-4o Mini",
    free: false,
    docsUrl: "https://platform.openai.com/api-keys",
  },
};

export class SettingsService {
  async getSettings(): Promise<SettingsResponse> {
    const rows = await prisma.appSettings.findMany({
      where: { key: { in: ["LLM_PROVIDER", ...Object.values(KEY_ENV_MAP)] } },
    });
    const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const hasKey = (envName: string) => !!(db[envName] ?? process.env[envName]);
    const active = (db["LLM_PROVIDER"] ?? process.env["LLM_PROVIDER"] ?? null) as ProviderName | null;

    return {
      activeLLMProvider: active,
      providers: PROVIDER_NAMES.map((name) => ({
        name,
        ...PROVIDER_META[name],
        configured: hasKey(KEY_ENV_MAP[name]),
        active: active === name,
      })),
    };
  }

  async updateSettings(input: UpdateSettingsInput): Promise<void> {
    const upserts: Promise<unknown>[] = [];

    if (input.llmProvider && PROVIDER_NAMES.includes(input.llmProvider as ProviderName)) {
      upserts.push(
        prisma.appSettings.upsert({
          where: { key: "LLM_PROVIDER" },
          update: { value: input.llmProvider },
          create: { key: "LLM_PROVIDER", value: input.llmProvider },
        }),
      );
    }

    for (const [envName, value] of Object.entries(input.apiKeys ?? {})) {
      if (value && Object.values(KEY_ENV_MAP).includes(envName)) {
        upserts.push(
          prisma.appSettings.upsert({
            where: { key: envName },
            update: { value },
            create: { key: envName, value },
          }),
        );
      }
    }

    await Promise.all(upserts);
  }
}
