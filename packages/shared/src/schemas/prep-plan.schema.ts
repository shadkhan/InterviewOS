import { z } from "zod";

export const PrepPriorityTopicSchema = z
  .object({
    topic: z.string().describe("Preparation topic."),
    reason: z.string().describe("Why this topic matters for the target interview."),
    urgency: z.string().describe("Urgency or priority level for this topic."),
  })
  .strict();

export const SevenDayPlanItemSchema = z
  .object({
    day: z.number().describe("Day number in the seven-day preparation plan."),
    focus: z.string().describe("Main focus for this preparation day."),
    tasks: z.array(z.string().describe("Preparation task.")).describe("Concrete tasks for this day."),
    practiceQuestions: z.array(z.string().describe("Practice question.")).describe("Questions to practice on this day."),
  })
  .strict();

export const PrepPlanSchema = z
  .object({
    priorityTopics: z.array(PrepPriorityTopicSchema).describe("Prioritized preparation topics."),
    sevenDayPlan: z.array(SevenDayPlanItemSchema).describe("Seven-day preparation schedule."),
    mockInterviewPlan: z.string().describe("Recommended mock interview plan."),
    companyResearchTasks: z.array(z.string().describe("Company research task.")).describe("Company-specific research tasks."),
    salaryNegotiationPrep: z.array(z.string().describe("Salary negotiation preparation task.")).describe("Salary negotiation preparation items."),
    finalDayChecklist: z.array(z.string().describe("Final-day checklist item.")).describe("Checklist for the final day before the interview."),
  })
  .strict();

export type PrepPriorityTopic = z.infer<typeof PrepPriorityTopicSchema>;
export type SevenDayPlanItem = z.infer<typeof SevenDayPlanItemSchema>;
export type PrepPlan = z.infer<typeof PrepPlanSchema>;
