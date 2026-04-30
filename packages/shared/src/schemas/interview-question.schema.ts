import { z } from "zod";
import { lenientString } from "./coerce";

const ALLOWED_CATEGORIES = [
  "recruiterScreen",
  "behavioral",
  "resumeDeepDive",
  "technical",
  "systemDesign",
  "roleSpecificScenarios",
  "companySpecific",
  "salaryAndMotivation",
  "questionsCandidateShouldAsk",
] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

export const InterviewQuestionCategorySchema: z.ZodType<Category> = z.preprocess(
  (v) => (typeof v === "string" && ALLOWED_CATEGORIES.includes(v as Category) ? v : "behavioral"),
  z.enum(ALLOWED_CATEGORIES),
) as z.ZodType<Category>;

const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof ALLOWED_DIFFICULTIES)[number];

export const QuestionDifficultySchema: z.ZodType<Difficulty> = z.preprocess(
  (v) => (typeof v === "string" && ALLOWED_DIFFICULTIES.includes(v as Difficulty) ? v : "medium"),
  z.enum(ALLOWED_DIFFICULTIES),
) as z.ZodType<Difficulty>;

export const InterviewQuestionSchema = z.object({
  category: InterviewQuestionCategorySchema,
  question: lenientString("Interview question text."),
  difficulty: QuestionDifficultySchema,
  interviewerIntent: lenientString("What the interviewer is likely testing with this question."),
  prepNotes: lenientString("Preparation notes for answering the question well."),
});

export type InterviewQuestionCategory = z.infer<typeof InterviewQuestionCategorySchema>;
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
