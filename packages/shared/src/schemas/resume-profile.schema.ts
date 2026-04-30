import { z } from "zod";
import { lenientString, lenientStringArray, lenientArray } from "./coerce";

export const ResumeProjectSchema = z
  .object({
    name: lenientString("Project name as stated or clearly implied by the resume."),
    description: lenientString("Brief description of the project and candidate contribution."),
    techStack: lenientStringArray("Technologies used in the project."),
  });

type ResumeEducationValue = { degree: string; institution: string; year: string };

export const ResumeEducationSchema: z.ZodType<ResumeEducationValue> = z.preprocess(
  (val) => {
    // LLMs sometimes return education as a single string like "BS CS, MIT, 2018"
    if (typeof val === "string") {
      const parts = val.split(",").map((p) => p.trim());
      return {
        degree: parts[0] ?? val,
        institution: parts[1] ?? "",
        year: parts[2] ?? "",
      };
    }
    return val;
  },
  z.object({
    degree: lenientString("Degree or program name."),
    institution: lenientString("School, university, or training institution."),
    year: lenientString("Graduation, completion, or attendance year."),
  }),
) as z.ZodType<ResumeEducationValue>;

export const ResumeProfileSchema = z
  .object({
    currentTitle: lenientString("Candidate's current or most recent professional title."),
    totalExperience: lenientString("Candidate's total professional experience as stated or calculated from resume data."),
    coreSkills: lenientStringArray("Primary skills that define the candidate profile."),
    technicalSkills: lenientStringArray("Technical tools, languages, frameworks, and platforms."),
    industries: lenientStringArray("Industries or business domains represented in the resume."),
    projects: lenientArray(ResumeProjectSchema, "Projects extracted from the resume."),
    achievements: lenientStringArray("Quantified or otherwise measurable achievements from the resume."),
    leadershipSignals: lenientStringArray("Evidence of ownership, mentoring, leadership, or cross-functional influence."),
    education: lenientArray(ResumeEducationSchema, "Education entries from the resume."),
    certifications: lenientStringArray("Certifications extracted from the resume."),
    gapsOrWeaknesses: lenientStringArray("Potential gaps, weaknesses, or unclear areas visible in the resume."),
  });

export type ResumeProject = z.infer<typeof ResumeProjectSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
