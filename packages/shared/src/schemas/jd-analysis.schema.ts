import { z } from "zod";

export const JDAnalysisSchema = z
  .object({
    roleSummary: z.string().describe("Concise summary of the target role based only on the job description."),
    mustHaveSkills: z.array(z.string().describe("Must-have skill.")).describe("Skills explicitly required or strongly emphasized in the job description."),
    niceToHaveSkills: z.array(z.string().describe("Nice-to-have skill.")).describe("Preferred or optional skills listed in the job description."),
    responsibilities: z.array(z.string().describe("Role responsibility.")).describe("Responsibilities expected from the role."),
    toolsAndTechnologies: z.array(z.string().describe("Tool or technology.")).describe("Tools, technologies, languages, platforms, or frameworks mentioned in the job description."),
    domainKnowledge: z.array(z.string().describe("Domain knowledge area.")).describe("Business, product, or domain knowledge expected for the role."),
    senioritySignals: z.array(z.string().describe("Seniority signal.")).describe("Signals that indicate expected seniority, autonomy, or leadership level."),
    hiddenExpectations: z.array(z.string().describe("Inferred hidden expectation.")).describe("Reasonable expectations strongly implied by the job description."),
    screeningKeywords: z.array(z.string().describe("Screening keyword.")).describe("Keywords likely to matter in recruiter or ATS screening."),
    interviewFocusAreas: z.array(z.string().describe("Interview focus area.")).describe("Areas likely to be evaluated during interviews."),
  })
  .strict();

export type JDAnalysis = z.infer<typeof JDAnalysisSchema>;
