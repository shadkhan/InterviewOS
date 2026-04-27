import { z } from "zod";

export const ResumeProjectSchema = z
  .object({
    name: z.string().describe("Project name as stated or clearly implied by the resume."),
    description: z.string().describe("Brief description of the project and candidate contribution."),
    techStack: z.array(z.string().describe("Technology used in the project.")).describe("Technologies used in the project."),
  })
  .strict();

export const ResumeEducationSchema = z
  .object({
    degree: z.string().describe("Degree or program name."),
    institution: z.string().describe("School, university, or training institution."),
    year: z.string().describe("Graduation, completion, or attendance year."),
  })
  .strict();

export const ResumeProfileSchema = z
  .object({
    currentTitle: z.string().describe("Candidate's current or most recent professional title."),
    totalExperience: z.string().describe("Candidate's total professional experience as stated or calculated from resume data."),
    coreSkills: z.array(z.string().describe("Core professional skill.")).describe("Primary skills that define the candidate profile."),
    technicalSkills: z.array(z.string().describe("Technical skill.")).describe("Technical tools, languages, frameworks, and platforms."),
    industries: z.array(z.string().describe("Industry domain.")).describe("Industries or business domains represented in the resume."),
    projects: z.array(ResumeProjectSchema).describe("Projects extracted from the resume."),
    achievements: z
      .array(z.string().describe("Measurable achievement preserved from the resume."))
      .describe("Quantified or otherwise measurable achievements from the resume."),
    leadershipSignals: z.array(z.string().describe("Leadership signal.")).describe("Evidence of ownership, mentoring, leadership, or cross-functional influence."),
    education: z.array(ResumeEducationSchema).describe("Education entries from the resume."),
    certifications: z.array(z.string().describe("Certification name.")).describe("Certifications extracted from the resume."),
    gapsOrWeaknesses: z.array(z.string().describe("Potential resume gap or weakness.")).describe("Potential gaps, weaknesses, or unclear areas visible in the resume."),
  })
  .strict();

export type ResumeProject = z.infer<typeof ResumeProjectSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
