import { z } from "zod";

export const CitationSourceTypeSchema = z
  .enum(["official", "candidate-reported", "inferred", "news", "salary-platform"])
  .describe("Type of source used for a cited claim.");

export const CitationSchema = z
  .object({
    url: z.string().url().describe("Source URL for the cited claim."),
    title: z.string().describe("Human-readable title of the cited source."),
    sourceType: CitationSourceTypeSchema.describe("Classification of the cited source."),
    accessedAt: z.string().optional().describe("ISO-like timestamp or date when the source was accessed."),
  })
  .strict();

export type CitationSourceType = z.infer<typeof CitationSourceTypeSchema>;
export type Citation = z.infer<typeof CitationSchema>;
