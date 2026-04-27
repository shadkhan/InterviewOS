import { Annotation } from "@langchain/langgraph";
import type {
  AgentError,
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

export type InterviewPrepInput = {
  userId: string;
  projectId: string;
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  resumeText: string;
  location?: string;
  seniority?: string;
  interviewDate?: string;
};

export type PainPointReport = PainPoint;

export type InterviewPrepState = InterviewPrepInput & {
  resumeProfile?: ResumeProfile;
  jdAnalysis?: JDAnalysis;
  companyResearch?: CompanyResearch;
  salaryInsight?: SalaryInsight;
  painPointReport?: PainPointReport;
  interviewQuestions?: InterviewQuestion[];
  answerGuides?: AnswerGuide[];
  prepPlan?: PrepPlan;
  citations: Citation[];
  warnings: string[];
  errors: AgentError[];
  progress: number;
};

export const InterviewPrepStateAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  projectId: Annotation<string>(),
  companyName: Annotation<string>(),
  roleTitle: Annotation<string>(),
  jobDescription: Annotation<string>(),
  resumeText: Annotation<string>(),
  location: Annotation<string | undefined>(),
  seniority: Annotation<string | undefined>(),
  interviewDate: Annotation<string | undefined>(),
  resumeProfile: Annotation<ResumeProfile | undefined>(),
  jdAnalysis: Annotation<JDAnalysis | undefined>(),
  companyResearch: Annotation<CompanyResearch | undefined>(),
  salaryInsight: Annotation<SalaryInsight | undefined>(),
  painPointReport: Annotation<PainPointReport | undefined>(),
  interviewQuestions: Annotation<InterviewQuestion[] | undefined>(),
  answerGuides: Annotation<AnswerGuide[] | undefined>(),
  prepPlan: Annotation<PrepPlan | undefined>(),
  citations: Annotation<Citation[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  warnings: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  errors: Annotation<AgentError[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  progress: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
});

export type InterviewPrepStateUpdate = Partial<InterviewPrepState>;

export type InterviewPrepNode = (state: InterviewPrepState) => Promise<InterviewPrepStateUpdate>;

export const createInitialInterviewPrepState = (input: InterviewPrepInput): InterviewPrepState => ({
  ...input,
  citations: [],
  warnings: [],
  errors: [],
  progress: 0,
});
