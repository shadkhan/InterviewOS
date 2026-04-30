import {
  ProviderConfigurationError,
  ProviderNotImplementedError,
  type SearchOptions,
  type SearchProvider,
  type SearchResult,
  type SearchSourceType,
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

const SALARY_DOMAINS = ["levels.fyi", "glassdoor.com", "payscale.com", "salary.com", "indeed.com/career"];
const CANDIDATE_DOMAINS = ["reddit.com", "blind", "teamblind.com", "leetcode.com/discuss", "github.com"];
const NEWS_DOMAINS = ["techcrunch.com", "bloomberg.com", "reuters.com", "wsj.com", "nytimes.com", "ft.com", "theverge.com", "wired.com", "businessinsider.com", "forbes.com"];

const inferSourceType = (url: string): SearchSourceType => {
  const lowered = url.toLowerCase();
  if (SALARY_DOMAINS.some((d) => lowered.includes(d))) return "salary-platform";
  if (CANDIDATE_DOMAINS.some((d) => lowered.includes(d))) return "candidate-reported";
  if (NEWS_DOMAINS.some((d) => lowered.includes(d))) return "news";
  // Heuristic: company official domains tend to be the company's own site
  // We can't reliably infer "official" from URL alone, so default to "inferred"
  return "inferred";
};

interface TavilyApiResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilyApiResponse {
  results: TavilyApiResult[];
}

export class TavilySearchProvider implements SearchProvider {
  private readonly apiKey: string;
  private readonly endpoint = "https://api.tavily.com/search";

  constructor(config: EnvBackedSearchProviderConfig = {}) {
    this.apiKey = requireApiKey("TavilySearchProvider", "TAVILY_API_KEY", config.apiKey);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const body: Record<string, unknown> = {
      api_key: this.apiKey,
      query,
      search_depth: "basic",
      max_results: options?.maxResults ?? 5,
      include_answer: false,
      include_raw_content: false,
    };

    if (options?.includeDomains?.length) body.include_domains = options.includeDomains;
    if (options?.excludeDomains?.length) body.exclude_domains = options.excludeDomains;
    if (options?.freshnessDays) body.days = options.freshnessDays;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Tavily search failed: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = (await response.json()) as TavilyApiResponse;

    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      sourceType: inferSourceType(r.url),
    }));
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
