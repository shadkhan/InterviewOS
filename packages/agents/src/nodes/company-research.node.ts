import { CompanyResearchSchema, type Citation, type CompanyResearch } from "@interviewos/shared";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider, SearchProvider, SearchResult } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import { appendNodeError } from "./node-error";

const NO_RESULTS_WARNING = "No search results for company research";
const VALIDATION_WARNING = "Company research returned invalid structured output";
const UNCONFIGURED_PROVIDER_WARNING = "Company research providers are not configured";

export interface CompanyResearchNodeOptions {
  llmProvider?: LLMProvider;
  searchProvider?: SearchProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createCompanyResearchNode = (options: CompanyResearchNodeOptions): InterviewPrepNode => {
  return async (state) => researchCompany(state, options);
};

export const companyResearchNode: InterviewPrepNode = async (state) =>
  researchCompany(state, {
    loader: promptLoader,
    logger: console,
  });

const researchCompany = async (
  state: InterviewPrepState,
  options: CompanyResearchNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[CompanyResearch] starting");

  try {
    if (!options.llmProvider || !options.searchProvider) {
      const nextState = {
        companyResearch: createMinimalCompanyResearch(state, "Company research requires configured LLM and search providers."),
        warnings: appendWarning(state.warnings, UNCONFIGURED_PROVIDER_WARNING),
      };

      logNodeStatus(logger, "failed", startedAt);
      console.log("[CompanyResearch] done");

      return nextState;
    }

    const searchQueries = buildCompanyResearchQueries(state);
    const searchResults = await collectSearchResults(options.searchProvider, searchQueries);
    const citations = searchResults.map(searchResultToCitation);

    if (searchResults.length === 0) {
      const nextState = {
        companyResearch: createMinimalCompanyResearch(
          state,
          "No cited search evidence was available, so company research confidence is low.",
        ),
        warnings: appendWarning(state.warnings, NO_RESULTS_WARNING),
      };

      logNodeStatus(logger, "success", startedAt);
      console.log("[CompanyResearch] done");

      return nextState;
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, researchPolicy, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadSystemPrompt("research-policy"),
      loader.loadAgentPrompt("company-research-agent"),
    ]);

    const companyResearch = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${researchPolicy}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildCompanyResearchUserMessage(state, searchQueries, searchResults),
        },
      ],
      CompanyResearchSchema,
    );

    const mergedCitations = mergeCitations(state.citations, citations, companyResearch.citations);

    logNodeStatus(logger, "success", startedAt);
    console.log("[CompanyResearch] done");

    return {
      companyResearch,
      citations: mergedCitations,
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[CompanyResearch] done");

    return {
      companyResearch: createMinimalCompanyResearch(state, "Company research failed before producing cited evidence."),
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
      errors: appendNodeError(state.errors, "companyResearch", error),
    };
  }
};

const buildCompanyResearchQueries = (state: InterviewPrepState): string[] => {
  const compactJDTerms = state.jobDescription
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 8)
    .join(" ");

  return [
    `${state.companyName} official company overview products`,
    `${state.companyName} careers ${state.roleTitle} engineering culture`,
    `${state.companyName} recent news`,
    `${state.companyName} competitors business model`,
    `${state.companyName} ${state.roleTitle} ${compactJDTerms}`,
  ];
};

const collectSearchResults = async (
  searchProvider: SearchProvider,
  queries: string[],
): Promise<SearchResult[]> => {
  const results = await Promise.all(
    queries.map((query) =>
      searchProvider.search(query, {
        maxResults: 5,
      }),
    ),
  );

  return dedupeSearchResults(results.flat());
};

const dedupeSearchResults = (results: SearchResult[]): SearchResult[] => {
  const seenUrls = new Set<string>();
  const dedupedResults: SearchResult[] = [];

  for (const result of results) {
    if (seenUrls.has(result.url)) {
      continue;
    }

    seenUrls.add(result.url);
    dedupedResults.push(result);
  }

  return dedupedResults;
};

const buildCompanyResearchUserMessage = (
  state: InterviewPrepState,
  queries: string[],
  searchResults: SearchResult[],
): string => {
  return [
    "Create company research using only the search results below. Do not invent news, culture details, competitors, products, or tech stack signals.",
    "Every external claim must be traceable to one of the provided URLs and include a citation with sourceType.",
    "Prefer sources in this order: official sources, regulatory filings, reputable news, salary platforms, candidate-reported sources.",
    "If evidence is weak or absent, put it in risksOrUncertainties instead of presenting it as fact.",
    "",
    `companyName: ${state.companyName}`,
    `roleTitle: ${state.roleTitle}`,
    `location: ${state.location ?? ""}`,
    "",
    "<jobDescription>",
    state.jobDescription,
    "</jobDescription>",
    "",
    "<searchQueries>",
    ...queries.map((query) => `- ${query}`),
    "</searchQueries>",
    "",
    "<searchResults>",
    ...searchResults.map(formatSearchResultForPrompt),
    "</searchResults>",
  ].join("\n");
};

const formatSearchResultForPrompt = (result: SearchResult, index: number): string => {
  return [
    `Result ${index + 1}:`,
    `title: ${result.title}`,
    `url: ${result.url}`,
    `sourceType: ${result.sourceType}`,
    `snippet: ${result.snippet}`,
  ].join("\n");
};

const searchResultToCitation = (result: SearchResult): Citation => ({
  url: result.url,
  title: result.title,
  sourceType: result.sourceType,
  accessedAt: new Date().toISOString(),
});

const mergeCitations = (...citationGroups: Citation[][]): Citation[] => {
  const seenUrls = new Set<string>();
  const citations: Citation[] = [];

  for (const citation of citationGroups.flat()) {
    if (seenUrls.has(citation.url)) {
      continue;
    }

    seenUrls.add(citation.url);
    citations.push(citation);
  }

  return citations;
};

const createMinimalCompanyResearch = (state: InterviewPrepState, uncertainty: string): CompanyResearch => ({
  companySummary: "",
  businessModel: "",
  products: [],
  competitors: [],
  recentNews: [],
  cultureSignals: [],
  techStackSignals: [],
  roleRelevance: state.roleTitle ? `Insufficient cited evidence to assess relevance for ${state.roleTitle}.` : "",
  interviewTalkingPoints: [],
  risksOrUncertainties: [uncertainty],
  citations: [],
});

const appendWarning = (warnings: string[], warning: string): string[] => [...warnings, warning];

const formatValidationWarning = (error: unknown): string => {
  if (error instanceof Error) {
    return `${VALIDATION_WARNING}: ${error.message}`;
  }

  return VALIDATION_WARNING;
};

const logNodeStatus = (logger: Pick<Console, "log">, status: "success" | "failed", startedAt: number): void => {
  logger.log({
    node: "companyResearch",
    status,
    duration: Date.now() - startedAt,
  });
};
