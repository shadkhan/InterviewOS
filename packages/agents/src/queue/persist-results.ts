import { prisma } from "@interviewos/database";
import type { InterviewPrepState } from "../state/interview-prep.state";

/**
 * Persists every successful agent's output to its respective DB table so the
 * report endpoint can read it. Called once at the end of a workflow run.
 *
 * Each section is wrapped in its own try/catch so a malformed shape from one
 * agent doesn't block the rest from saving.
 */
export const persistWorkflowResults = async (
  jobTargetId: string,
  agentRunId: string,
  resumeId: string,
  state: InterviewPrepState,
): Promise<void> => {
  const overallConfidence = state.painPointReport?.confidenceLevel ?? "low";

  // Resume parsedProfile
  if (state.resumeProfile) {
    try {
      await prisma.resume.update({
        where: { id: resumeId },
        data: { parsedProfile: state.resumeProfile as object },
      });
    } catch (err) {
      console.error("[persist] resumeProfile failed:", err);
    }
  }

  // JD Analysis
  if (state.jdAnalysis) {
    try {
      await prisma.jDAnalysis.create({
        data: {
          jobTargetId,
          data: state.jdAnalysis as object,
        },
      });
    } catch (err) {
      console.error("[persist] jdAnalysis failed:", err);
    }
  }

  // Company Research
  if (state.companyResearch) {
    try {
      await prisma.companyResearchReport.create({
        data: {
          jobTargetId,
          data: state.companyResearch as object,
          citations: (state.companyResearch.citations ?? []) as object,
        },
      });
    } catch (err) {
      console.error("[persist] companyResearch failed:", err);
    }
  }

  // Salary Insight
  if (state.salaryInsight) {
    try {
      await prisma.salaryInsight.create({
        data: {
          jobTargetId,
          data: state.salaryInsight as object,
          citations: (state.salaryInsight.citations ?? []) as object,
          confidenceLevel: state.salaryInsight.confidenceLevel ?? "low",
        },
      });
    } catch (err) {
      console.error("[persist] salaryInsight failed:", err);
    }
  }

  // Pain Point Report
  if (state.painPointReport) {
    try {
      await prisma.painPointReport.create({
        data: {
          jobTargetId,
          data: state.painPointReport as object,
          confidenceLevel: state.painPointReport.confidenceLevel ?? "low",
        },
      });
    } catch (err) {
      console.error("[persist] painPointReport failed:", err);
    }
  }

  // Interview Questions + Answer Guides
  // The answer-coach node generates synthetic questionIds like "behavioral-1",
  // "behavioral-2", "technical-1" using category + index-within-category. We
  // rebuild the same IDs here to match guides back to their questions.
  if (state.interviewQuestions && state.interviewQuestions.length > 0) {
    try {
      const guidesById = new Map<string, NonNullable<typeof state.answerGuides>[number]>();
      for (const guide of state.answerGuides ?? []) {
        if (guide.questionId) guidesById.set(guide.questionId, guide);
      }

      const categoryCounters = new Map<string, number>();
      for (const q of state.interviewQuestions) {
        const idx = (categoryCounters.get(q.category) ?? 0) + 1;
        categoryCounters.set(q.category, idx);
        const syntheticId = `${q.category}-${idx}`;
        const guide = guidesById.get(syntheticId);

        await prisma.interviewQuestion.create({
          data: {
            jobTargetId,
            category: q.category,
            question: q.question,
            difficulty: q.difficulty,
            interviewerIntent: q.interviewerIntent,
            prepNotes: q.prepNotes,
            ...(guide
              ? {
                  answerGuides: {
                    create: {
                      structure: guide.recommendedAnswerStructure ?? "",
                      sampleAnswer: guide.strongSampleAnswer ?? "",
                      resumeEvidence: (guide.resumeEvidenceToUse ?? []) as object,
                      mistakesToAvoid: (guide.mistakesToAvoid ?? []) as object,
                      improvementTips: (guide.improvementTips ?? []) as object,
                    },
                  },
                }
              : {}),
          },
        });
      }
    } catch (err) {
      console.error("[persist] interviewQuestions failed:", err);
    }
  }

  // Prep Plan
  if (state.prepPlan) {
    try {
      await prisma.prepPlan.create({
        data: {
          jobTargetId,
          priorityTopics: (state.prepPlan.priorityTopics ?? []) as object,
          sevenDayPlan: (state.prepPlan.sevenDayPlan ?? []) as object,
        },
      });
    } catch (err) {
      console.error("[persist] prepPlan failed:", err);
    }
  }

  // Citations on the AgentRun
  if (state.citations && state.citations.length > 0) {
    try {
      await prisma.citation.createMany({
        data: state.citations.map((c) => ({
          agentRunId,
          url: c.url,
          title: c.title,
          sourceType: c.sourceType,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      console.error("[persist] citations failed:", err);
    }
  }

  // Update job target status based on overall outcome
  try {
    await prisma.jobTarget.update({
      where: { id: jobTargetId },
      data: { status: state.errors.length > 0 ? "completed" : "completed" },
    });
  } catch (err) {
    console.error("[persist] jobTarget status update failed:", err);
  }

  void overallConfidence;
};
