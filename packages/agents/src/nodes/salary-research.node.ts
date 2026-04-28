import { SalaryInsightSchema, type Citation, type SalaryInsight } from "@interviewos/shared";
import { promptLoader, type PromptLoader } from "../prompts";
import type { LLMProvider, SearchProvider, SearchResult } from "../providers";
import type { InterviewPrepNode, InterviewPrepState } from "../state/interview-prep.state";
import { appendNodeError } from "./node-error";

const NO_RESULTS_WARNING = "No search results for salary research";
const MISSING_LOCATION_NOTE = "Location not specified; salary estimate may be inaccurate";
const VALIDATION_WARNING = "Salary research returned invalid structured output";
const UNCONFIGURED_PROVIDER_WARNING = "Salary research providers are not configured";
const DEFAULT_CAVEAT = "Salary data is an estimate based on available sources and may vary by location, seniority, company policy, equity, bonus, and market conditions.";

export interface SalaryResearchNodeOptions {
  llmProvider?: LLMProvider;
  searchProvider?: SearchProvider;
  loader?: PromptLoader;
  logger?: Pick<Console, "log">;
}

export const createSalaryResearchNode = (options: SalaryResearchNodeOptions): InterviewPrepNode => {
  return async (state) => researchSalary(state, options);
};

export const salaryResearchNode: InterviewPrepNode = async (state) =>
  researchSalary(state, {
    loader: promptLoader,
    logger: console,
  });

const researchSalary = async (
  state: InterviewPrepState,
  options: SalaryResearchNodeOptions,
): Promise<Partial<InterviewPrepState>> => {
  const startedAt = Date.now();
  const logger = options.logger ?? console;

  console.log("[SalaryResearch] starting");

  try {
    const locationWarnings = state.location ? state.warnings : appendWarning(state.warnings, MISSING_LOCATION_NOTE);

    if (!options.llmProvider || !options.searchProvider) {
      const nextState = {
        salaryInsight: createMinimalSalaryInsight("Salary research requires configured LLM and search providers."),
        warnings: appendWarning(locationWarnings, UNCONFIGURED_PROVIDER_WARNING),
      };

      logNodeStatus(logger, "failed", startedAt);
      console.log("[SalaryResearch] done");

      return nextState;
    }

    const searchQueries = buildSalarySearchQueries(state);
    const searchResults = await collectSearchResults(options.searchProvider, searchQueries);
    const salaryCitations = searchResults.map(searchResultToCitation);

    if (searchResults.length === 0) {
      const nextState = {
        salaryInsight: createMinimalSalaryInsight("No cited salary sources were available, so confidence is low."),
        warnings: appendWarning(locationWarnings, NO_RESULTS_WARNING),
      };

      logNodeStatus(logger, "success", startedAt);
      console.log("[SalaryResearch] done");

      return nextState;
    }

    const loader = options.loader ?? promptLoader;
    const [basePrompt, researchPolicy, agentPrompt] = await Promise.all([
      loader.loadSystemPrompt("base-agent"),
      loader.loadSystemPrompt("research-policy"),
      loader.loadAgentPrompt("salary-research-agent"),
    ]);

    const salaryInsight = await options.llmProvider.generateStructured(
      [
        {
          role: "system",
          content: `${basePrompt}\n\n${researchPolicy}\n\n${agentPrompt}`,
        },
        {
          role: "user",
          content: buildSalaryResearchUserMessage(state, searchQueries, searchResults),
        },
      ],
      SalaryInsightSchema,
    );
    const normalizedSalaryInsight = normalizeSalaryInsight(salaryInsight, searchResults.length);

    logNodeStatus(logger, "success", startedAt);
    console.log("[SalaryResearch] done");

    return {
      salaryInsight: normalizedSalaryInsight,
      citations: mergeCitations(state.citations, salaryCitations, normalizedSalaryInsight.citations),
      ...(locationWarnings.length !== state.warnings.length ? { warnings: locationWarnings } : {}),
    };
  } catch (error) {
    logNodeStatus(logger, "failed", startedAt);
    console.log("[SalaryResearch] done");

    return {
      salaryInsight: createMinimalSalaryInsight("Salary research failed before producing cited evidence."),
      warnings: appendWarning(state.warnings, formatValidationWarning(error)),
      errors: appendNodeError(state.errors, "salaryResearch", error),
    };
  }
};

const buildSalarySearchQueries = (state: InterviewPrepState): string[] => {
  const location = state.location ?? "";
  const seniority = state.seniority ?? "";
  const coreQuery = `${state.roleTitle} salary ${location} ${seniority} site:levels.fyi OR site:glassdoor.com OR site:linkedin.com`
    .replace(/\s+/g, " ")
    .trim();

  return [
    coreQuery,
    `${state.companyName} ${coreQuery}`,
    `${state.roleTitle} total compensation ${location} ${seniority} salary-platform`.replace(/\s+/g, " ").trim(),
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
        sourceTypes: ["salary-platform", "candidate-reported", "official", "news"],
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

const buildSalaryResearchUserMessage = (
  state: InterviewPrepState,
  queries: string[],
  searchResults: SearchResult[],
): string => {
  return [
    "Estimate compensation using only the salary search results below. Never guarantee salary amounts.",
    "Always frame salary numbers as estimated ranges, and include caveats explaining data limitations.",
    "If fewer than three distinct sources are provided, set confidenceLevel to low.",
    "",
    `companyName: ${state.companyName}`,
    `roleTitle: ${state.roleTitle}`,
    `location: ${state.location ?? "not specified"}`,
    `seniority: ${state.seniority ?? ""}`,
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

const normalizeSalaryInsight = (salaryInsight: SalaryInsight, sourceCount: number): SalaryInsight => {
  const caveats = salaryInsight.caveats.length > 0 ? salaryInsight.caveats : [DEFAULT_CAVEAT];

  return {
    ...salaryInsight,
    confidenceLevel: sourceCount < 3 ? "low" : salaryInsight.confidenceLevel,
    caveats,
  };
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

const createMinimalSalaryInsight = (caveat: string): SalaryInsight => ({
  estimatedBaseSalaryRange: {
    low: 0,
    high: 0,
    currency: "USD",
  },
  estimatedTotalCompRange: {
    low: 0,
    high: 0,
    currency: "USD",
  },
  sourceBreakdown: [],
  negotiationAdvice: [],
  confidenceLevel: "low",
  caveats: [caveat, DEFAULT_CAVEAT],
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
    node: "salaryResearch",
    status,
    duration: Date.now() - startedAt,
  });
};
