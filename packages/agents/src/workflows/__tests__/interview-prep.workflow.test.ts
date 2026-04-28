import assert from "node:assert/strict";
import test from "node:test";
import { MockSearchProvider } from "../../providers";
import {
  createAnswerCoachNode,
  createCompanyResearchNode,
  createInterviewQuestionNode,
  createJDAnalysisNode,
  createPainPointNode,
  createPrepPlanNode,
  createResumeParserNode,
  createSalaryResearchNode,
} from "../../nodes";
import { createInitialInterviewPrepState } from "../../state";
import { buildInterviewPrepWorkflow } from "../interview-prep.workflow";
import {
  loader,
  QueueLLMProvider,
  silentLogger,
  validAnswerGuide,
  validCompanyResearch,
  validInterviewQuestions,
  validJDAnalysis,
  validPainPointReport,
  validPrepPlan,
  validResumeProfile,
  validSalaryInsight,
} from "../../nodes/__tests__/test-fixtures";

test("runs the full interview prep workflow with mock providers", async () => {
  const searchProvider = new MockSearchProvider({
    defaultResults: [
      {
        title: "Example Co about",
        url: "https://example.com/about",
        snippet: "Example Co builds workflow software for operations teams.",
        sourceType: "official",
      },
      {
        title: "Example salary data",
        url: "https://salary.example.com/role",
        snippet: "Senior backend engineer salary range.",
        sourceType: "salary-platform",
      },
      {
        title: "Example Co news",
        url: "https://news.example.com/example-observability",
        snippet: "Example Co announced observability features.",
        sourceType: "news",
      },
    ],
  });
  const graph = buildInterviewPrepWorkflow({
    nodeOverrides: {
      resumeParser: createResumeParserNode({
        llmProvider: new QueueLLMProvider([validResumeProfile]),
        loader,
        logger: silentLogger,
      }),
      jdAnalysisStep: createJDAnalysisNode({
        llmProvider: new QueueLLMProvider([validJDAnalysis]),
        loader,
        logger: silentLogger,
      }),
      companyResearchStep: createCompanyResearchNode({
        llmProvider: new QueueLLMProvider([validCompanyResearch]),
        searchProvider,
        loader,
        logger: silentLogger,
      }),
      salaryResearch: createSalaryResearchNode({
        llmProvider: new QueueLLMProvider([validSalaryInsight]),
        searchProvider,
        loader,
        logger: silentLogger,
      }),
      painPoint: createPainPointNode({
        llmProvider: new QueueLLMProvider([validPainPointReport]),
        loader,
        logger: silentLogger,
      }),
      interviewQuestion: createInterviewQuestionNode({
        llmProvider: new QueueLLMProvider([{ questions: validInterviewQuestions }]),
        loader,
        logger: silentLogger,
      }),
      answerCoach: createAnswerCoachNode({
        llmProvider: new QueueLLMProvider([
          validAnswerGuide,
          { ...validAnswerGuide, questionId: "technical-2" },
          { ...validAnswerGuide, questionId: "resumeDeepDive-3" },
        ]),
        loader,
        logger: silentLogger,
      }),
      prepPlanStep: createPrepPlanNode({
        llmProvider: new QueueLLMProvider([validPrepPlan]),
        loader,
        logger: silentLogger,
        now: () => new Date("2026-04-28T00:00:00.000Z"),
      }),
    },
  });
  const initialState = createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Backend Engineer",
    seniority: "Senior",
    location: "San Francisco, CA",
    interviewDate: "2026-05-20",
    resumeText:
      "Senior backend engineer with 8 years of TypeScript, PostgreSQL, API reliability, observability, leadership, and measurable platform impact.",
    jobDescription:
      "Example Co is hiring a Senior Backend Engineer to improve API reliability, observability, platform APIs, developer velocity, incident response, and cross-functional engineering outcomes.",
  });

  const finalState = await graph.invoke(initialState);

  assert.ok(finalState.resumeProfile);
  assert.ok(finalState.jdAnalysis);
  assert.ok(finalState.companyResearch);
  assert.ok(finalState.salaryInsight);
  assert.ok(finalState.painPointReport);
  assert.ok(finalState.interviewQuestions?.length);
  assert.ok(finalState.answerGuides?.length);
  assert.ok(finalState.prepPlan);
  assert.equal(finalState.progress, 100);
  assert.ok(finalState.citations.length > 0);
  assert.deepEqual(finalState.errors, []);
});
