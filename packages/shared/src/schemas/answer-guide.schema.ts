import { z } from "zod";

export const AnswerGuideSchema = z
  .object({
    questionId: z.string().describe("Identifier of the interview question this answer guide belongs to."),
    recommendedAnswerStructure: z.string().describe("Recommended structure for answering the question."),
    resumeEvidenceToUse: z.array(z.string().describe("Resume evidence item.")).describe("Resume-backed evidence the candidate can use in the answer."),
    strongSampleAnswer: z.string().describe("Natural, interview-ready sample answer based only on resume facts."),
    mistakesToAvoid: z.array(z.string().describe("Mistake to avoid.")).describe("Common answer mistakes the candidate should avoid."),
    improvementTips: z.array(z.string().describe("Improvement tip.")).describe("Specific tips for making the answer stronger."),
  })
  .strict();

export type AnswerGuide = z.infer<typeof AnswerGuideSchema>;
