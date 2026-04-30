import { z } from "zod";
import { lenientArray, lenientString, lenientStringArray } from "./coerce";

type PrepPriorityTopicValue = { topic: string; reason: string; urgency: string };

export const PrepPriorityTopicSchema: z.ZodType<PrepPriorityTopicValue> = z.preprocess(
  (val) => (typeof val === "string" ? { topic: val, reason: "", urgency: "medium" } : val),
  z.object({
    topic: lenientString("Preparation topic."),
    reason: lenientString("Why this topic matters for the target interview."),
    urgency: lenientString("Urgency or priority level for this topic."),
  }),
) as z.ZodType<PrepPriorityTopicValue>;

export const SevenDayPlanItemSchema = z
  .object({
    day: z.preprocess(
      (v) => (typeof v === "string" ? Number(v.replace(/\D/g, "")) || 0 : v),
      z.number().describe("Day number in the seven-day preparation plan."),
    ),
    focus: lenientString("Main focus for this preparation day."),
    tasks: lenientStringArray("Concrete tasks for this day."),
    practiceQuestions: lenientStringArray("Questions to practice on this day."),
  });

export const PrepPlanSchema = z
  .object({
    priorityTopics: lenientArray(PrepPriorityTopicSchema, "Prioritized preparation topics."),
    sevenDayPlan: lenientArray(SevenDayPlanItemSchema, "Seven-day preparation schedule."),
    mockInterviewPlan: lenientString("Recommended mock interview plan."),
    companyResearchTasks: lenientStringArray("Company-specific research tasks."),
    salaryNegotiationPrep: lenientStringArray("Salary negotiation preparation items."),
    finalDayChecklist: lenientStringArray("Checklist for the final day before the interview."),
  });

export type PrepPriorityTopic = z.infer<typeof PrepPriorityTopicSchema>;
export type SevenDayPlanItem = z.infer<typeof SevenDayPlanItemSchema>;
export type PrepPlan = z.infer<typeof PrepPlanSchema>;
