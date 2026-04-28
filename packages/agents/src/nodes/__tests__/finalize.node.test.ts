import assert from "node:assert/strict";
import test from "node:test";
import { createInitialInterviewPrepState, type InterviewPrepState } from "../../state";
import { createFinalizeNode } from "../finalize.node";

const silentLogger = { log: () => undefined };

const createCompleteState = (): InterviewPrepState => ({
  ...createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    seniority: "Senior",
    resumeText: "Senior backend engineer with reliability experience.",
    jobDescription: "Improve API reliability and observability.",
  }),
  resumeProfile: {
    currentTitle: "Senior Backend Engineer",
    totalExperience: "8 years",
    coreSkills: ["Backend engineering"],
    technicalSkills: ["TypeScript"],
    industries: ["SaaS"],
    projects: [],
    achievements: ["Reduced API incident rate by 30%"],
    leadershipSignals: [],
    education: [],
    certifications: [],
    gapsOrWeaknesses: [],
  },
  jdAnalysis: {
    roleSummary: "Backend reliability role.",
    mustHaveSkills: ["API design"],
    niceToHaveSkills: [],
    responsibilities: ["Improve reliability"],
    toolsAndTechnologies: ["APIs"],
    domainKnowledge: ["SaaS"],
    senioritySignals: ["Senior ownership"],
    hiddenExpectations: [],
    screeningKeywords: ["reliability"],
    interviewFocusAreas: ["Reliability"],
  },
  companyResearch: {
    companySummary: "Example Co builds workflow software.",
    businessModel: "SaaS.",
    products: ["Workflow platform"],
    competitors: [],
    recentNews: [],
    cultureSignals: [],
    techStackSignals: [],
    roleRelevance: "Role supports platform reliability.",
    interviewTalkingPoints: [],
    risksOrUncertainties: [],
    citations: [],
  },
  salaryInsight: {
    estimatedBaseSalaryRange: {
      low: 180000,
      high: 230000,
      currency: "USD",
    },
    estimatedTotalCompRange: {
      low: 220000,
      high: 310000,
      currency: "USD",
    },
    sourceBreakdown: ["Salary sources reviewed."],
    negotiationAdvice: ["Treat ranges as estimates."],
    confidenceLevel: "medium",
    caveats: ["Compensation varies."],
    citations: [],
  },
  painPointReport: {
    likelyPainPoints: [
      {
        painPoint: "Inferred: API reliability matters.",
        evidence: "JD emphasizes reliability.",
        confidenceLevel: "medium",
      },
    ],
    howCandidateCanPositionThemself: ["Emphasize reliability work."],
    smartQuestionsToAsk: ["How is reliability measured?"],
    confidenceLevel: "medium",
    citations: [],
  },
  interviewQuestions: [
    {
      category: "technical",
      question: "How would you improve API reliability?",
      difficulty: "hard",
      interviewerIntent: "Assess reliability depth.",
      prepNotes: "Discuss SLOs and observability.",
    },
  ],
  answerGuides: [
    {
      questionId: "technical-1",
      recommendedAnswerStructure: "Problem, approach, tradeoffs, result.",
      resumeEvidenceToUse: ["Reduced API incident rate by 30%"],
      strongSampleAnswer: "I would start with clear SLOs and use observability to find the highest-impact fixes.",
      mistakesToAvoid: ["Do not overclaim."],
      improvementTips: ["Tie the answer to the JD."],
    },
  ],
  prepPlan: {
    priorityTopics: [
      {
        topic: "API reliability",
        reason: "Directly tied to the JD.",
        urgency: "high",
      },
    ],
    sevenDayPlan: Array.from({ length: 7 }, (_value, index) => ({
      day: index + 1,
      focus: `Day ${index + 1}`,
      tasks: ["Practice API reliability answer."],
      practiceQuestions: ["How would you improve API reliability?"],
    })),
    mockInterviewPlan: "Run one technical mock.",
    companyResearchTasks: ["Review company platform context."],
    salaryNegotiationPrep: ["Prepare caveated salary range."],
    finalDayChecklist: ["Review top questions."],
  },
  citations: [
    {
      title: "Example Co about",
      url: "https://example.com/about",
      sourceType: "official",
    },
    {
      title: "Duplicate Example Co about",
      url: "https://example.com/about",
      sourceType: "official",
    },
    {
      title: "Salary source",
      url: "https://example.com/salary",
      sourceType: "salary-platform",
    },
  ],
});

test("deduplicates citations and marks workflow complete", async () => {
  const node = createFinalizeNode({ logger: silentLogger });

  const result = await node(createCompleteState());

  assert.equal(result.progress, 100);
  assert.deepEqual(
    result.citations?.map((citation) => citation.url),
    ["https://example.com/about", "https://example.com/salary"],
  );
  assert.deepEqual(result.warnings, []);
});

test("adds warnings for missing required outputs", async () => {
  const node = createFinalizeNode({ logger: silentLogger });
  const state = createCompleteState();
  state.answerGuides = [];
  state.prepPlan = undefined;

  const result = await node(state);

  assert.equal(result.progress, 100);
  assert.deepEqual(result.warnings, [
    "Answer guides are missing from final interview prep output",
    "Prep plan is missing from final interview prep output",
  ]);
});
