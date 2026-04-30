import { z } from "zod";
import { CitationSchema } from "./citation.schema";
import { lenientArray, lenientStringArray } from "./coerce";

export const ConfidenceLevelSchema = z.enum(["low", "medium", "high"]).describe("Confidence level for an estimate or inference.");

// Parses string compensation ranges like "$150k - $200k USD" into the object shape.
const parseRangeString = (input: string): { low: number; high: number; currency: string } => {
  const lowered = input.toLowerCase();
  let currency = "USD";
  if (lowered.includes("eur") || lowered.includes("€")) currency = "EUR";
  else if (lowered.includes("gbp") || lowered.includes("£")) currency = "GBP";
  else if (lowered.includes("inr") || lowered.includes("₹")) currency = "INR";

  const numbers = (input.match(/(\d+(?:[.,]\d+)?)\s*(k|m)?/gi) ?? [])
    .map((token) => {
      const m = token.match(/(\d+(?:[.,]\d+)?)\s*(k|m)?/i);
      if (!m) return 0;
      const value = Number(m[1]!.replace(",", ""));
      const suffix = m[2]?.toLowerCase();
      if (suffix === "k") return value * 1_000;
      if (suffix === "m") return value * 1_000_000;
      return value;
    })
    .filter((n) => n > 0);

  const low = numbers[0] ?? 0;
  const high = numbers[1] ?? low;
  return { low, high, currency };
};

type CompensationRangeValue = { low: number; high: number; currency: string };

const lenientRange = (description: string): z.ZodType<CompensationRangeValue> =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") return parseRangeString(val);
      if (val && typeof val === "object") return val;
      return { low: 0, high: 0, currency: "USD" };
    },
    z
      .object({
        low: z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) || 0 : v), z.number()),
        high: z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) || 0 : v), z.number()),
        currency: z.preprocess((v) => (v == null ? "USD" : String(v)), z.string()),
      })
      .describe(description),
  ) as z.ZodType<CompensationRangeValue>;

export const CompensationRangeSchema = lenientRange("Estimated compensation range with low, high, and currency.");

export const SalaryInsightSchema = z
  .object({
    estimatedBaseSalaryRange: lenientRange("Estimated base salary range for the role, location, and seniority."),
    estimatedTotalCompRange: lenientRange("Estimated total compensation range for the role, location, and seniority."),
    sourceBreakdown: lenientStringArray("Summary of sources used to estimate compensation."),
    negotiationAdvice: lenientStringArray("Practical salary negotiation guidance without guarantees."),
    confidenceLevel: ConfidenceLevelSchema,
    caveats: lenientStringArray("Limitations, assumptions, or caveats affecting the salary estimate."),
    citations: lenientArray(CitationSchema, "Citations supporting salary research claims."),
  });

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type CompensationRange = z.infer<typeof CompensationRangeSchema>;
export type SalaryInsight = z.infer<typeof SalaryInsightSchema>;
