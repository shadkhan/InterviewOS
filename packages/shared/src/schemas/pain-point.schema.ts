import { z } from "zod";
import { CitationSchema } from "./citation.schema";
import { ConfidenceLevelSchema } from "./salary-insight.schema";

export const LikelyPainPointSchema = z
  .object({
    painPoint: z.string().describe("Inferred business or technical pain point."),
    evidence: z.string().describe("Evidence from company research or the job description supporting the inference."),
    confidenceLevel: ConfidenceLevelSchema.describe("Confidence level for this pain point inference."),
  })
  .strict();

export const PainPointSchema = z
  .object({
    likelyPainPoints: z.array(LikelyPainPointSchema).describe("Likely company or role pain points, with evidence and confidence."),
    howCandidateCanPositionThemself: z.array(z.string().describe("Candidate positioning recommendation.")).describe("Ways the candidate can position relevant experience against the inferred pain points."),
    smartQuestionsToAsk: z.array(z.string().describe("Smart interview question.")).describe("Questions the candidate can ask to test or explore the inferred pain points."),
    confidenceLevel: ConfidenceLevelSchema.describe("Overall confidence level for the pain point report."),
    citations: z.array(CitationSchema).describe("Citations supporting research-based evidence in the pain point report."),
  })
  .strict();

export type LikelyPainPoint = z.infer<typeof LikelyPainPointSchema>;
export type PainPoint = z.infer<typeof PainPointSchema>;
