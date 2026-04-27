import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

export type PromptVariables = Record<string, string | number | boolean | null | undefined>;

type PromptKind = "system" | "agents";

export class PromptNotFoundError extends Error {
  constructor(promptName: string, relativePath: string) {
    super(`PromptNotFoundError: prompt '${promptName}' not found at ${relativePath}`);
    this.name = "PromptNotFoundError";
  }
}

export class PromptLoader {
  private readonly cache = new Map<string, string>();

  constructor(private readonly monorepoRoot = process.cwd()) {}

  async loadSystemPrompt(name: string, variables: PromptVariables = {}): Promise<string> {
    return this.loadPrompt("system", name, variables);
  }

  async loadAgentPrompt(name: string, variables: PromptVariables = {}): Promise<string> {
    return this.loadPrompt("agents", name, variables);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async loadPrompt(kind: PromptKind, name: string, variables: PromptVariables): Promise<string> {
    const promptName = this.normalizePromptName(name);
    const relativePath = path.posix.join("prompts", kind, `${promptName}.md`);
    const cacheKey = relativePath;
    const cachedPrompt = this.cache.get(cacheKey);

    if (cachedPrompt !== undefined) {
      return this.interpolate(cachedPrompt, variables);
    }

    const promptPath = path.resolve(this.monorepoRoot, relativePath);

    try {
      await access(promptPath, constants.R_OK);
    } catch {
      throw new PromptNotFoundError(promptName, relativePath);
    }

    const prompt = await readFile(promptPath, "utf8");
    this.cache.set(cacheKey, prompt);

    return this.interpolate(prompt, variables);
  }

  private normalizePromptName(name: string): string {
    const trimmedName = name.trim();
    const promptName = trimmedName.endsWith(".md") ? trimmedName.slice(0, -3) : trimmedName;

    if (!promptName || path.isAbsolute(promptName) || promptName.includes("..") || promptName.includes("\\") || promptName.includes("/")) {
      throw new PromptNotFoundError(promptName || name, path.posix.join("prompts", "<type>", `${promptName}.md`));
    }

    return promptName;
  }

  private interpolate(prompt: string, variables: PromptVariables): string {
    return prompt.replaceAll(/\{\{\s*([a-zA-Z_$][\w$]*)\s*\}\}/g, (_placeholder, variableName: string) => {
      const value = variables[variableName];
      return value === undefined || value === null ? "" : String(value);
    });
  }
}

export const promptLoader = new PromptLoader();
