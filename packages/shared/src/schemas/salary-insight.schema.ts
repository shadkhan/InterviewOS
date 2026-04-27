import { z } from "zod";
import { CitationSchema } from "./citation.schema";

export const ConfidenceLevelSchema = z.enum(["low", "medium", "high"]).describe("Confidence level for an estimate or inference.");

export const CompensationRangeSchema = z
  .object({
    low: z.number().describe("Lower bound of the estimated compensation range."),
    high: z.number().describe("Upper bound of the estimated compensation range."),
    currency: z.string().describe("Currency code or label for the compensation range."),
  })
  .strict();

export const SalaryInsightSchema = z
  .object({
    estimatedBaseSalaryRange: CompensationRangeSchema.describe("Estimated base salary range for the role, location, and seniority."),
    estimatedTotalCompRange: CompensationRangeSchema.describe("Estimated total compensation range for the role, location, and seniority."),
    sourceBreakdown: z.array(z.string().describe("Salary source summary.")).describe("Summary of sources used to estimate compensation."),
    negotiationAdvice: z.array(z.string().describe("Negotiation advice item.")).describe("Practical salary negotiation guidance without guarantees."),
    confidenceLevel: ConfidenceLevelSchema.describe("Confidence level for the salary estimate."),
    caveats: z.array(z.string().describe("Salary caveat.")).describe("Limitations, assumptions, or caveats affecting the salary estimate."),
    citations: z.array(CitationSchema).describe("Citations supporting salary research claims."),
  })
  .strict();

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type CompensationRange = z.infer<typeof CompensationRangeSchema>;
export type SalaryInsight = z.infer<typeof SalaryInsightSchema>;
