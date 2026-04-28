import assert from "node:assert/strict";
import test from "node:test";
import type { ZodSchema } from "zod";
import {
  AgentErrorSchema,
  AgentStateSchema,
  AnswerGuideSchema,
  CitationSchema,
  CompanyResearchSchema,
  InterviewQuestionSchema,
  JDAnalysisSchema,
  PainPointSchema,
  PrepPlanSchema,
  ResumeProfileSchema,
  SalaryInsightSchema,
} from "../index";

const citation = {
  title: "Example Co about",
  url: "https://example.com/about",
  sourceType: "official" as const,
};

const resumeProfile = {
  currentTitle: "Senior Backend Engineer",
  totalExperience: "8 years",
  coreSkills: ["Backend engineering"],
  technicalSkills: ["TypeScript"],
  industries: ["SaaS"],
  projects: [{ name: "Reliability", description: "Improved API uptime.", techStack: ["TypeScript"] }],
  achievements: ["Reduced API incident rate by 30%"],
  leadershipSignals: ["Led reliability reviews"],
  education: [],
  certifications: [],
  gapsOrWeaknesses: [],
};

const jdAnalysis = {
  roleSummary: "Backend reliability role.",
  mustHaveSkills: ["API design"],
  niceToHaveSkills: [],
  responsibilities: ["Improve reliability"],
  toolsAndTechnologies: ["APIs"],
  domainKnowledge: ["SaaS"],
  senioritySignals: ["Senior ownership"],
  hiddenExpectations: ["Inferred: improve cross-team reliability"],
  screeningKeywords: ["reliability"],
  interviewFocusAreas: ["Observability"],
};

const companyResearch = {
  companySummary: "Example Co builds workflow software.",
  businessModel: "SaaS.",
  products: ["Workflow platform"],
  competitors: [{ name: "Workflow Rival", differentiator: "Enterprise focus." }],
  recentNews: [{ headline: "Example Co launches feature", date: "2026-04-01", url: "https://example.com/news" }],
  cultureSignals: ["Product collaboration"],
  techStackSignals: ["APIs"],
  roleRelevance: "Role supports platform reliability.",
  interviewTalkingPoints: ["Ask about reliability goals."],
  risksOrUncertainties: [],
  citations: [citation],
};

const salaryInsight = {
  estimatedBaseSalaryRange: { low: 180000, high: 230000, currency: "USD" },
  estimatedTotalCompRange: { low: 220000, high: 310000, currency: "USD" },
  sourceBreakdown: ["Salary sources reviewed."],
  negotiationAdvice: ["Treat range as an estimate."],
  confidenceLevel: "medium" as const,
  caveats: ["Compensation varies."],
  citations: [{ ...citation, sourceType: "salary-platform" as const, url: "https://salary.example.com/role" }],
};

const painPoint = {
  likelyPainPoints: [{ painPoint: "API reliability", evidence: "JD emphasizes reliability.", confidenceLevel: "medium" as const }],
  howCandidateCanPositionThemself: ["Emphasize reliability results."],
  smartQuestionsToAsk: ["How is reliability measured?"],
  confidenceLevel: "medium" as const,
  citations: [citation],
};

const interviewQuestion = {
  category: "technical" as const,
  question: "How would you improve API reliability?",
  difficulty: "hard" as const,
  interviewerIntent: "Assess reliability depth.",
  prepNotes: "Discuss SLOs and observability.",
};

const answerGuide = {
  questionId: "technical-1",
  recommendedAnswerStructure: "Problem, approach, tradeoffs, result.",
  resumeEvidenceToUse: ["Reduced API incident rate by 30%"],
  strongSampleAnswer: "I improved API uptime and incident response, reducing incident rate by 30%.",
  mistakesToAvoid: ["Do not overclaim."],
  improvementTips: ["Tie the answer to the JD."],
};

const prepPlan = {
  priorityTopics: [{ topic: "API reliability", reason: "Directly tied to the JD.", urgency: "high" }],
  sevenDayPlan: Array.from({ length: 7 }, (_value, index) => ({
    day: index + 1,
    focus: `Day ${index + 1}`,
    tasks: ["Practice reliability answer."],
    practiceQuestions: ["How would you improve API reliability?"],
  })),
  mockInterviewPlan: "Run one technical mock.",
  companyResearchTasks: ["Review company context."],
  salaryNegotiationPrep: ["Prepare salary range."],
  finalDayChecklist: ["Review top questions."],
};

const cases: Array<{ name: string; schema: ZodSchema; valid: Record<string, unknown>; invalid: Record<string, unknown> }> = [
  { name: "AgentErrorSchema", schema: AgentErrorSchema, valid: { agent: "node", message: "failed" }, invalid: { agent: 1 } },
  { name: "CitationSchema", schema: CitationSchema, valid: citation, invalid: { ...citation, url: "not-a-url" } },
  { name: "ResumeProfileSchema", schema: ResumeProfileSchema, valid: resumeProfile, invalid: { ...resumeProfile, projects: [{ name: "x" }] } },
  { name: "JDAnalysisSchema", schema: JDAnalysisSchema, valid: jdAnalysis, invalid: { ...jdAnalysis, mustHaveSkills: "API design" } },
  { name: "CompanyResearchSchema", schema: CompanyResearchSchema, valid: companyResearch, invalid: { ...companyResearch, citations: [{ ...citation, url: "bad" }] } },
  { name: "SalaryInsightSchema", schema: SalaryInsightSchema, valid: salaryInsight, invalid: { ...salaryInsight, confidenceLevel: "certain" } },
  { name: "PainPointSchema", schema: PainPointSchema, valid: painPoint, invalid: { ...painPoint, confidenceLevel: "certain" } },
  { name: "InterviewQuestionSchema", schema: InterviewQuestionSchema, valid: interviewQuestion, invalid: { ...interviewQuestion, category: "random" } },
  { name: "AnswerGuideSchema", schema: AnswerGuideSchema, valid: answerGuide, invalid: { ...answerGuide, resumeEvidenceToUse: "none" } },
  { name: "PrepPlanSchema", schema: PrepPlanSchema, valid: prepPlan, invalid: { ...prepPlan, sevenDayPlan: [{ day: "one" }] } },
  {
    name: "AgentStateSchema",
    schema: AgentStateSchema,
    valid: {
      userId: "user_1",
      projectId: "job_1",
      companyName: "Example Co",
      roleTitle: "Senior Backend Engineer",
      jobDescription: "Improve API reliability.",
      resumeText: "Senior backend engineer.",
      resumeProfile,
      jdAnalysis,
      companyResearch,
      salaryInsight,
      painPointReport: painPoint,
      interviewQuestions: [interviewQuestion],
      answerGuides: [answerGuide],
      prepPlan,
      citations: [citation],
      warnings: [],
      errors: [],
    },
    invalid: { userId: "user_1" },
  },
];

for (const { name, schema, valid, invalid } of cases) {
  test(`${name}: valid input passes`, () => {
    assert.deepEqual(schema.parse(valid), valid);
  });

  test(`${name}: invalid input throws`, () => {
    assert.throws(() => schema.parse(invalid));
  });

  test(`${name}: unknown fields are rejected`, () => {
    assert.throws(() => schema.parse({ ...valid, unexpectedField: true }));
  });
}
