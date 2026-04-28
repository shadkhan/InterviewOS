export type Confidence = "low" | "medium" | "high" | string;

export type ReportCitation = {
  url: string;
  title: string;
  sourceType: string;
  accessedAt?: string;
};

export type JobTargetReport = {
  jobTarget: {
    id: string;
    companyName: string;
    roleTitle: string;
    location: string | null;
    seniority: string | null;
    status: string;
    jobDescription: string;
    createdAt: string;
    updatedAt: string;
  };
  agentRun: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
  resumeProfile: {
    currentTitle?: string;
    totalExperience?: string;
    coreSkills?: string[];
    technicalSkills?: string[];
    projects?: Array<{ name: string; description: string; techStack: string[] }>;
    achievements?: string[];
    leadershipSignals?: string[];
    gapsOrWeaknesses?: string[];
  } | null;
  jdAnalysis: {
    mustHaveSkills?: string[];
    niceToHaveSkills?: string[];
    hiddenExpectations?: string[];
    interviewFocusAreas?: string[];
    responsibilities?: string[];
  } | null;
  companyResearch: {
    companySummary?: string;
    products?: string[];
    competitors?: Array<{ name: string; differentiator: string }>;
    recentNews?: Array<{ headline: string; date: string; url: string }>;
    interviewTalkingPoints?: string[];
    risksOrUncertainties?: string[];
  } | null;
  salaryInsight: {
    estimatedBaseSalaryRange?: { low: number; high: number; currency: string };
    estimatedTotalCompRange?: { low: number; high: number; currency: string };
    negotiationAdvice?: string[];
    confidenceLevel?: Confidence;
    caveats?: string[];
  } | null;
  painPointReport: {
    likelyPainPoints?: Array<{ painPoint: string; evidence: string; confidenceLevel: Confidence }>;
    howCandidateCanPositionThemself?: string[];
    smartQuestionsToAsk?: string[];
    confidenceLevel?: Confidence;
  } | null;
  interviewQuestions:
    | Array<{
        id: string;
        category: string;
        question: string;
        difficulty: "easy" | "medium" | "hard" | string;
        interviewerIntent: string;
        prepNotes: string;
      }>
    | null;
  answerGuides:
    | Array<{
        id: string;
        questionId: string;
        recommendedAnswerStructure: string;
        resumeEvidenceToUse: unknown;
        strongSampleAnswer: string;
        mistakesToAvoid: unknown;
        improvementTips: unknown;
      }>
    | null;
  prepPlan: {
    priorityTopics?: unknown;
    sevenDayPlan?: Array<{ day: number; focus: string; tasks: string[]; practiceQuestions: string[] }>;
    mockInterviewPlan?: string | null;
    companyResearchTasks?: string[] | null;
    salaryNegotiationPrep?: string[] | null;
    finalDayChecklist?: string[] | null;
  } | null;
  citations: ReportCitation[];
};

export type AgentRunStatus = {
  id: string;
  jobTargetId: string;
  status: "pending" | "running" | "completed" | "failed" | string;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};
