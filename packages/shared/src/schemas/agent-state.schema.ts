import { z } from "zod";
import { AnswerGuideSchema } from "./answer-guide.schema";
import { CitationSchema } from "./citation.schema";
import { CompanyResearchSchema } from "./company-research.schema";
import { InterviewQuestionSchema } from "./interview-question.schema";
import { JDAnalysisSchema } from "./jd-analysis.schema";
import { PainPointSchema } from "./pain-point.schema";
import { PrepPlanSchema } from "./prep-plan.schema";
import { ResumeProfileSchema } from "./resume-profile.schema";
import { SalaryInsightSchema } from "./salary-insight.schema";

export const AgentErrorSchema = z
  .object({
    agent: z.string().describe("Agent or workflow node where the error occurred."),
    message: z.string().describe("Human-readable error message."),
    code: z.string().optional().describe("Optional machine-readable error code."),
    retryable: z.boolean().optional().describe("Whether the error may be retried safely."),
  })
  .strict();

export const AgentStateSchema = z
  .object({
    userId: z.string().describe("Identifier of the user who owns the interview prep project."),
    projectId: z.string().describe("Identifier of the interview prep project or job target."),
    companyName: z.string().describe("Target company name."),
    roleTitle: z.string().describe("Target role title."),
    location: z.string().optional().describe("Target role location."),
    seniority: z.string().optional().describe("Target role seniority level."),
    jobDescription: z.string().describe("Target job description text."),
    resumeText: z.string().describe("Raw resume text supplied by the user."),
    resumeProfile: ResumeProfileSchema.optional().describe("Structured profile extracted from the resume."),
    jdAnalysis: JDAnalysisSchema.optional().describe("Structured analysis of the job description."),
    companyResearch: CompanyResearchSchema.optional().describe("Company research report for the target company and role."),
    salaryInsight: SalaryInsightSchema.optional().describe("Estimated salary insight for the target role."),
    painPointReport: PainPointSchema.optional().describe("Inferred company or role pain point report."),
    interviewQuestions: z.array(InterviewQuestionSchema).optional().describe("Generated interview questions."),
    answerGuides: z.array(AnswerGuideSchema).optional().describe("Resume-based answer guidance."),
    prepPlan: PrepPlanSchema.optional().describe("Personalized preparation plan."),
    citations: z.array(CitationSchema).optional().describe("Citations collected across research-based agent outputs."),
    warnings: z.array(z.string().describe("Workflow warning.")).optional().describe("Warnings collected during agent execution."),
    errors: z.array(AgentErrorSchema).optional().describe("Errors collected during agent execution."),
  })
  .strict();

export type AgentError = z.infer<typeof AgentErrorSchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
