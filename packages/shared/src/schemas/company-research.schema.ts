import { z } from "zod";
import { CitationSchema } from "./citation.schema";

export const CompanyCompetitorSchema = z
  .object({
    name: z.string().describe("Competitor company or product name."),
    differentiator: z.string().describe("How this competitor differs from the target company."),
  })
  .strict();

export const CompanyRecentNewsSchema = z
  .object({
    headline: z.string().describe("Headline or concise summary of the news item."),
    date: z.string().describe("Publication or event date for the news item."),
    url: z.string().url().describe("URL of the news source."),
  })
  .strict();

export const CompanyResearchSchema = z
  .object({
    companySummary: z.string().describe("Practical summary of the target company for interview preparation."),
    businessModel: z.string().describe("How the company appears to make money or deliver value."),
    products: z.array(z.string().describe("Product or service.")).describe("Company products or services."),
    competitors: z.array(CompanyCompetitorSchema).describe("Relevant competitors and differentiators."),
    recentNews: z.array(CompanyRecentNewsSchema).describe("Recent cited news items about the company."),
    cultureSignals: z.array(z.string().describe("Culture signal.")).describe("Cited culture-related signals without overstating weak evidence."),
    techStackSignals: z.array(z.string().describe("Technology stack signal.")).describe("Cited or clearly sourced technology signals relevant to the role."),
    roleRelevance: z.string().describe("Why the target role appears relevant to the company context."),
    interviewTalkingPoints: z.array(z.string().describe("Interview talking point.")).describe("Company-specific talking points the candidate can use."),
    risksOrUncertainties: z.array(z.string().describe("Risk or uncertainty.")).describe("Uncertain, conflicting, or weakly evidenced areas."),
    citations: z.array(CitationSchema).describe("Citations supporting external research claims."),
  })
  .strict();

export type CompanyCompetitor = z.infer<typeof CompanyCompetitorSchema>;
export type CompanyRecentNews = z.infer<typeof CompanyRecentNewsSchema>;
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;
