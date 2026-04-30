import { z } from "zod";
import { lenientString } from "./coerce";

export const CitationSourceTypeSchema = z
  .preprocess(
    (v) => {
      if (typeof v !== "string") return "inferred";
      const allowed = ["official", "candidate-reported", "inferred", "news", "salary-platform"];
      return allowed.includes(v) ? v : "inferred";
    },
    z.enum(["official", "candidate-reported", "inferred", "news", "salary-platform"]),
  ) as z.ZodType<"official" | "candidate-reported" | "inferred" | "news" | "salary-platform">;

type CitationValue = {
  url: string;
  title: string;
  sourceType: "official" | "candidate-reported" | "inferred" | "news" | "salary-platform";
  accessedAt?: string;
};

export const CitationSchema: z.ZodType<CitationValue> = z.preprocess(
  (val) => {
    // LLMs sometimes return citations as bare URLs or titles
    if (typeof val === "string") {
      const looksLikeUrl = /^https?:\/\//i.test(val);
      return {
        url: looksLikeUrl ? val : "",
        title: looksLikeUrl ? val : val,
        sourceType: "inferred",
      };
    }
    return val;
  },
  z.object({
    url: lenientString("Source URL for the cited claim."),
    title: lenientString("Human-readable title of the cited source."),
    sourceType: CitationSourceTypeSchema,
    accessedAt: z.string().optional().describe("ISO-like timestamp or date when the source was accessed."),
  }),
) as z.ZodType<CitationValue>;

export type CitationSourceType = z.infer<typeof CitationSourceTypeSchema>;
export type Citation = z.infer<typeof CitationSchema>;
