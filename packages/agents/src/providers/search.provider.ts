import {
  ProviderConfigurationError,
  ProviderNotImplementedError,
  type SearchOptions,
  type SearchProvider,
  type SearchResult,
} from "./provider.types";

export interface EnvBackedSearchProviderConfig {
  apiKey?: string;
}

const requireApiKey = (providerName: string, envName: string, apiKey?: string): string => {
  const resolvedApiKey = apiKey ?? process.env[envName];

  if (!resolvedApiKey) {
    throw new ProviderConfigurationError(`${providerName} requires ${envName}.`);
  }

  return resolvedApiKey;
};

export class TavilySearchProvider implements SearchProvider {
  private readonly apiKey: string;

  constructor(config: EnvBackedSearchProviderConfig = {}) {
    this.apiKey = requireApiKey("TavilySearchProvider", "TAVILY_API_KEY", config.apiKey);
  }

  async search(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    void this.apiKey;
    // TODO: implement Tavily search provider.
    throw new ProviderNotImplementedError("TavilySearchProvider");
  }
}

export class ExaSearchProvider implements SearchProvider {
  private readonly apiKey: string;

  constructor(config: EnvBackedSearchProviderConfig = {}) {
    this.apiKey = requireApiKey("ExaSearchProvider", "EXA_API_KEY", config.apiKey);
  }

  async search(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    void this.apiKey;
    // TODO: implement Exa search provider.
    throw new ProviderNotImplementedError("ExaSearchProvider");
  }
}

export class SerpApiSearchProvider implements SearchProvider {
  private readonly apiKey: string;

  constructor(config: EnvBackedSearchProviderConfig = {}) {
    this.apiKey = requireApiKey("SerpApiSearchProvider", "SERPAPI_KEY", config.apiKey);
  }

  async search(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    void this.apiKey;
    // TODO: implement SerpAPI search provider.
    throw new ProviderNotImplementedError("SerpApiSearchProvider");
  }
}
