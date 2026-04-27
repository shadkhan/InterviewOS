import { z } from "zod";

export const InterviewQuestionCategorySchema = z
  .enum([
    "recruiterScreen",
    "behavioral",
    "resumeDeepDive",
    "technical",
    "systemDesign",
    "roleSpecificScenarios",
    "companySpecific",
    "salaryAndMotivation",
    "questionsCandidateShouldAsk",
  ])
  .describe("Interview question category.");

export const QuestionDifficultySchema = z.enum(["easy", "medium", "hard"]).describe("Question difficulty level.");

export const InterviewQuestionSchema = z
  .object({
    category: InterviewQuestionCategorySchema.describe("Category for the interview question."),
    question: z.string().describe("Interview question text."),
    difficulty: QuestionDifficultySchema.describe("Difficulty level for the question."),
    interviewerIntent: z.string().describe("What the interviewer is likely testing with this question."),
    prepNotes: z.string().describe("Preparation notes for answering the question well."),
  })
  .strict();

export type InterviewQuestionCategory = z.infer<typeof InterviewQuestionCategorySchema>;
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
