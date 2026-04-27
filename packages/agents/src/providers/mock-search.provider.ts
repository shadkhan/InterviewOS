import type { SearchOptions, SearchProvider, SearchResult } from "./provider.types";

export interface MockSearchProviderConfig {
  resultsByQuery?: Record<string, SearchResult[]>;
  defaultResults?: SearchResult[];
}

const defaultResultsForQuery = (query: string): SearchResult[] => [
  {
    title: `Official result for ${query}`,
    url: "https://example.com/company",
    snippet: `Official company information matching "${query}".`,
    sourceType: "official",
  },
  {
    title: `News result for ${query}`,
    url: "https://news.example.com/company-update",
    snippet: `Recent news context matching "${query}".`,
    sourceType: "news",
  },
  {
    title: `Salary result for ${query}`,
    url: "https://salary.example.com/role",
    snippet: `Compensation context matching "${query}".`,
    sourceType: "salary-platform",
  },
];

export class MockSearchProvider implements SearchProvider {
  private readonly resultsByQuery: Record<string, SearchResult[]>;
  private readonly defaultResults?: SearchResult[];

  constructor(config: MockSearchProviderConfig = {}) {
    this.resultsByQuery = config.resultsByQuery ?? {};
    this.defaultResults = config.defaultResults;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const configuredResults = this.resultsByQuery[query] ?? this.defaultResults ?? defaultResultsForQuery(query);
    const sourceFilteredResults = options.sourceTypes
      ? configuredResults.filter((result) => options.sourceTypes?.includes(result.sourceType))
      : configuredResults;

    return sourceFilteredResults.slice(0, options.maxResults ?? sourceFilteredResults.length);
  }
}
