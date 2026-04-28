import { z } from "zod";

export const MAX_RESUME_TEXT_LENGTH = 50_000;
export const MAX_JOB_DESCRIPTION_LENGTH = 20_000;

export const CreateJobTargetSchema = z
  .object({
    companyName: z.string().trim().min(1).max(200),
    roleTitle: z.string().trim().min(1).max(200),
    jobDescription: z.string().trim().min(1).max(MAX_JOB_DESCRIPTION_LENGTH),
    resumeText: z.string().trim().min(1).max(MAX_RESUME_TEXT_LENGTH),
    location: z.string().trim().max(200).optional(),
    seniority: z.string().trim().max(100).optional(),
    interviewDate: z.string().trim().max(50).optional(),
  })
  .strict();

export type CreateJobTargetDto = z.infer<typeof CreateJobTargetSchema>;
