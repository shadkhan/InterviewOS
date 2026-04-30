import { z } from "zod";
import { CitationSchema } from "./citation.schema";
import { lenientArray, lenientString, lenientStringArray } from "./coerce";

type CompanyCompetitorValue = { name: string; differentiator: string };

export const CompanyCompetitorSchema: z.ZodType<CompanyCompetitorValue> = z.preprocess(
  (val) => (typeof val === "string" ? { name: val, differentiator: "" } : val),
  z.object({
    name: lenientString("Competitor company or product name."),
    differentiator: lenientString("How this competitor differs from the target company."),
  }),
) as z.ZodType<CompanyCompetitorValue>;

type CompanyRecentNewsValue = { headline: string; date: string; url: string };

export const CompanyRecentNewsSchema: z.ZodType<CompanyRecentNewsValue> = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const looksLikeUrl = /^https?:\/\//i.test(val);
      return {
        headline: looksLikeUrl ? val : val,
        date: "",
        url: looksLikeUrl ? val : "",
      };
    }
    return val;
  },
  z.object({
    headline: lenientString("Headline or concise summary of the news item."),
    date: lenientString("Publication or event date for the news item."),
    url: lenientString("URL of the news source."),
  }),
) as z.ZodType<CompanyRecentNewsValue>;

export const CompanyResearchSchema = z
  .object({
    companySummary: lenientString("Practical summary of the target company for interview preparation."),
    businessModel: lenientString("How the company appears to make money or deliver value."),
    products: lenientStringArray("Company products or services."),
    competitors: lenientArray(CompanyCompetitorSchema, "Relevant competitors and differentiators."),
    recentNews: lenientArray(CompanyRecentNewsSchema, "Recent cited news items about the company."),
    cultureSignals: lenientStringArray("Cited culture-related signals without overstating weak evidence."),
    techStackSignals: lenientStringArray("Cited or clearly sourced technology signals relevant to the role."),
    roleRelevance: lenientString("Why the target role appears relevant to the company context."),
    interviewTalkingPoints: lenientStringArray("Company-specific talking points the candidate can use."),
    risksOrUncertainties: lenientStringArray("Uncertain, conflicting, or weakly evidenced areas."),
    citations: lenientArray(CitationSchema, "Citations supporting external research claims."),
  });

export type CompanyCompetitor = z.infer<typeof CompanyCompetitorSchema>;
export type CompanyRecentNews = z.infer<typeof CompanyRecentNewsSchema>;
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;
