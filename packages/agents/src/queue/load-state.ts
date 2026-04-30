import { prisma } from "@interviewos/database";
import type {
  AnswerGuide,
  Citation,
  CompanyResearch,
  InterviewQuestion,
  JDAnalysis,
  PainPoint,
  PrepPlan,
  ResumeProfile,
  SalaryInsight,
} from "@interviewos/shared";
import type { InterviewPrepState } from "../state/interview-prep.state";

/**
 * Rebuilds an InterviewPrepState from what's been persisted in the DB.
 * Used to retry a single failed agent without re-running the whole workflow.
 */
export const loadInterviewPrepStateFromDb = async (
  jobTargetId: string,
): Promise<InterviewPrepState | null> => {
  const jobTarget = await prisma.jobTarget.findUnique({
    where: { id: jobTargetId },
    select: {
      id: true,
      userId: true,
      companyName: true,
      roleTitle: true,
      location: true,
      seniority: true,
      jobDescription: true,
      resume: { select: { rawText: true, parsedProfile: true } },
      jdAnalyses: { orderBy: { createdAt: "desc" }, take: 1, select: { data: true } },
      companyResearchReports: { orderBy: { createdAt: "desc" }, take: 1, select: { data: true } },
      salaryInsights: { orderBy: { createdAt: "desc" }, take: 1, select: { data: true } },
      painPointReports: { orderBy: { createdAt: "desc" }, take: 1, select: { data: true } },
      interviewQuestions: {
        orderBy: { createdAt: "asc" },
        select: {
          category: true,
          question: true,
          difficulty: true,
          interviewerIntent: true,
          prepNotes: true,
          answerGuides: {
            select: {
              structure: true,
              sampleAnswer: true,
              resumeEvidence: true,
              mistakesToAvoid: true,
              improvementTips: true,
            },
          },
        },
      },
      prepPlans: { orderBy: { createdAt: "desc" }, take: 1, select: { priorityTopics: true, sevenDayPlan: true } },
    },
  });

  if (!jobTarget) return null;

  const interviewQuestions = jobTarget.interviewQuestions.map((q): InterviewQuestion => ({
    category: q.category as InterviewQuestion["category"],
    question: q.question,
    difficulty: q.difficulty as InterviewQuestion["difficulty"],
    interviewerIntent: q.interviewerIntent,
    prepNotes: q.prepNotes,
  }));

  // Rebuild answer guides with their synthetic questionIds (category-index)
  const answerGuides: AnswerGuide[] = [];
  const categoryCounters = new Map<string, number>();
  for (const q of jobTarget.interviewQuestions) {
    const idx = (categoryCounters.get(q.category) ?? 0) + 1;
    categoryCounters.set(q.category, idx);
    const syntheticId = `${q.category}-${idx}`;
    for (const guide of q.answerGuides) {
      answerGuides.push({
        questionId: syntheticId,
        recommendedAnswerStructure: guide.structure,
        strongSampleAnswer: guide.sampleAnswer,
        resumeEvidenceToUse: (guide.resumeEvidence as string[]) ?? [],
        mistakesToAvoid: (guide.mistakesToAvoid as string[]) ?? [],
        improvementTips: (guide.improvementTips as string[]) ?? [],
      });
    }
  }

  const prepPlanRow = jobTarget.prepPlans[0];
  const prepPlan: PrepPlan | undefined = prepPlanRow
    ? {
        priorityTopics: (prepPlanRow.priorityTopics as PrepPlan["priorityTopics"]) ?? [],
        sevenDayPlan: (prepPlanRow.sevenDayPlan as PrepPlan["sevenDayPlan"]) ?? [],
        mockInterviewPlan: "",
        companyResearchTasks: [],
        salaryNegotiationPrep: [],
        finalDayChecklist: [],
      }
    : undefined;

  const state: InterviewPrepState = {
    userId: jobTarget.userId,
    projectId: jobTarget.id,
    companyName: jobTarget.companyName,
    roleTitle: jobTarget.roleTitle,
    jobDescription: jobTarget.jobDescription,
    resumeText: jobTarget.resume.rawText,
    location: jobTarget.location ?? undefined,
    seniority: jobTarget.seniority ?? undefined,
    resumeProfile: (jobTarget.resume.parsedProfile as ResumeProfile | null) ?? undefined,
    jdAnalysis: (jobTarget.jdAnalyses[0]?.data as JDAnalysis | undefined) ?? undefined,
    companyResearch: (jobTarget.companyResearchReports[0]?.data as CompanyResearch | undefined) ?? undefined,
    salaryInsight: (jobTarget.salaryInsights[0]?.data as SalaryInsight | undefined) ?? undefined,
    painPointReport: (jobTarget.painPointReports[0]?.data as PainPoint | undefined) ?? undefined,
    interviewQuestions: interviewQuestions.length > 0 ? interviewQuestions : undefined,
    answerGuides: answerGuides.length > 0 ? answerGuides : undefined,
    prepPlan,
    citations: [] as Citation[],
    warnings: [],
    errors: [],
    progress: 0,
  };

  return state;
};
