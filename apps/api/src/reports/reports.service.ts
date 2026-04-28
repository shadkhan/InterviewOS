import { prisma } from "@interviewos/database";
import { NotFoundError, PersistenceError } from "../http-errors";

export class ReportsService {
  async getJobTargetReport(userId: string, jobTargetId: string) {
    try {
      const jobTarget = await prisma.jobTarget.findFirst({
        where: {
          id: jobTargetId,
          userId,
        },
        select: {
          id: true,
          companyName: true,
          roleTitle: true,
          location: true,
          seniority: true,
          status: true,
          jobDescription: true,
          createdAt: true,
          updatedAt: true,
          resume: {
            select: {
              id: true,
              parsedProfile: true,
            },
          },
          jdAnalyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { data: true },
          },
          companyResearchReports: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { data: true, citations: true },
          },
          salaryInsights: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { data: true, citations: true, confidenceLevel: true },
          },
          painPointReports: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { data: true, confidenceLevel: true },
          },
          interviewQuestions: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              category: true,
              question: true,
              difficulty: true,
              interviewerIntent: true,
              prepNotes: true,
              answerGuides: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  structure: true,
                  sampleAnswer: true,
                  resumeEvidence: true,
                  mistakesToAvoid: true,
                  improvementTips: true,
                },
              },
            },
          },
          prepPlans: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              priorityTopics: true,
              sevenDayPlan: true,
            },
          },
          agentRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
              citations: {
                orderBy: { createdAt: "asc" },
                select: {
                  url: true,
                  title: true,
                  sourceType: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!jobTarget) {
        throw new NotFoundError("Job target report not found.");
      }

      const questions = jobTarget.interviewQuestions.map((question) => ({
        id: question.id,
        category: question.category,
        question: question.question,
        difficulty: question.difficulty,
        interviewerIntent: question.interviewerIntent,
        prepNotes: question.prepNotes,
      }));

      return {
        jobTarget: {
          id: jobTarget.id,
          companyName: jobTarget.companyName,
          roleTitle: jobTarget.roleTitle,
          location: jobTarget.location,
          seniority: jobTarget.seniority,
          status: jobTarget.status,
          jobDescription: jobTarget.jobDescription,
          createdAt: jobTarget.createdAt,
          updatedAt: jobTarget.updatedAt,
        },
        agentRun: jobTarget.agentRuns[0] ?? null,
        resumeProfile: jobTarget.resume.parsedProfile ?? null,
        jdAnalysis: jobTarget.jdAnalyses[0]?.data ?? null,
        companyResearch: jobTarget.companyResearchReports[0]?.data ?? null,
        salaryInsight: jobTarget.salaryInsights[0]?.data ?? null,
        painPointReport: jobTarget.painPointReports[0]?.data ?? null,
        interviewQuestions: questions.length > 0 ? questions : null,
        answerGuides: buildAnswerGuides(jobTarget.interviewQuestions),
        prepPlan: buildPrepPlan(jobTarget.prepPlans[0]),
        citations: dedupeCitations([
          ...normalizeCitationJson(jobTarget.companyResearchReports[0]?.citations),
          ...normalizeCitationJson(jobTarget.salaryInsights[0]?.citations),
          ...(jobTarget.agentRuns[0]?.citations.map((citation) => ({
            url: citation.url,
            title: citation.title ?? "",
            sourceType: citation.sourceType,
            accessedAt: citation.createdAt.toISOString(),
          })) ?? []),
        ]),
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new PersistenceError("Unable to load interview prep report.");
    }
  }
}

type QuestionWithGuides = {
  id: string;
  answerGuides: Array<{
    id: string;
    structure: string;
    sampleAnswer: string;
    resumeEvidence: unknown;
    mistakesToAvoid: unknown;
    improvementTips: unknown;
  }>;
};

const buildAnswerGuides = (questions: QuestionWithGuides[]) => {
  const answerGuides = questions.flatMap((question) =>
    question.answerGuides.map((guide) => ({
      id: guide.id,
      questionId: question.id,
      recommendedAnswerStructure: guide.structure,
      resumeEvidenceToUse: guide.resumeEvidence,
      strongSampleAnswer: guide.sampleAnswer,
      mistakesToAvoid: guide.mistakesToAvoid,
      improvementTips: guide.improvementTips,
    })),
  );

  return answerGuides.length > 0 ? answerGuides : null;
};

const buildPrepPlan = (
  prepPlan:
    | {
        priorityTopics: unknown;
        sevenDayPlan: unknown;
      }
    | undefined,
) => {
  if (!prepPlan) {
    return null;
  }

  return {
    priorityTopics: prepPlan.priorityTopics,
    sevenDayPlan: prepPlan.sevenDayPlan,
    mockInterviewPlan: null,
    companyResearchTasks: null,
    salaryNegotiationPrep: null,
    finalDayChecklist: null,
  };
};

type ReportCitation = {
  url: string;
  title: string;
  sourceType: string;
  accessedAt?: string;
};

const normalizeCitationJson = (citations: unknown): ReportCitation[] => {
  if (!Array.isArray(citations)) {
    return [];
  }

  return citations.flatMap((citation): ReportCitation[] => {
    if (!citation || typeof citation !== "object") {
      return [];
    }

    const candidate = citation as Partial<ReportCitation>;

    if (typeof candidate.url !== "string") {
      return [];
    }

    return [
      {
        url: candidate.url,
        title: typeof candidate.title === "string" ? candidate.title : "",
        sourceType: typeof candidate.sourceType === "string" ? candidate.sourceType : "inferred",
        ...(typeof candidate.accessedAt === "string" ? { accessedAt: candidate.accessedAt } : {}),
      },
    ];
  });
};

const dedupeCitations = (citations: ReportCitation[]): ReportCitation[] => {
  const seenUrls = new Set<string>();
  const deduped: ReportCitation[] = [];

  for (const citation of citations) {
    if (seenUrls.has(citation.url)) {
      continue;
    }

    seenUrls.add(citation.url);
    deduped.push(citation);
  }

  return deduped;
};
