"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/app-shell";
import { Alert, Badge, Card, EmptyState, LinkButton, Progress } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { AgentRunStatus, Confidence, JobTargetReport, ReportCitation } from "@/lib/report-types";
import { asArray } from "@/lib/utils";

const questionCategoryLabels: Record<string, string> = {
  recruiterScreen: "Recruiter Screen",
  behavioral: "Behavioral",
  resumeDeepDive: "Resume Deep Dive",
  technical: "Technical",
  systemDesign: "System Design",
  roleSpecificScenarios: "Role Scenarios",
  companySpecific: "Company Specific",
  salaryAndMotivation: "Salary & Motivation",
  questionsCandidateShouldAsk: "Candidate Questions",
};

export default function JobTargetReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<JobTargetReport | null>(null);
  const [run, setRun] = useState<AgentRunStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const nextReport = await apiFetch<JobTargetReport>(`/job-targets/${params.id}/report`);
        if (!isActive) return;
        setReport(nextReport);
        setError("");

        if (nextReport.agentRun?.id && ["pending", "running"].includes(nextReport.agentRun.status)) {
          const nextRun = await apiFetch<AgentRunStatus>(`/agent-runs/${nextReport.agentRun.id}`);
          if (!isActive) return;
          setRun(nextRun);
        }
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Unable to load this report.");
      }
    };

    void load();
    const interval = window.setInterval(load, 3000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [params.id]);

  const activeRun = run ?? report?.agentRun;
  const isInProgress = activeRun ? ["pending", "running"].includes(activeRun.status) : false;

  return (
    <PageShell>
      {error ? <Alert title="Report unavailable" message={error} /> : null}
      {!report && !error ? <p className="text-sm text-muted-foreground">Loading interview prep report...</p> : null}
      {report ? (
        <div className="grid gap-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">{report.jobTarget.companyName}</p>
              <h1 className="mt-2 text-3xl font-bold">{report.jobTarget.roleTitle}</h1>
              <p className="mt-2 text-muted-foreground">
                {report.jobTarget.seniority ?? "Seniority not specified"} • {report.jobTarget.location ?? "Location not specified"}
              </p>
            </div>
            {activeRun?.id ? (
              <LinkButton href={`/agent-runs/${activeRun.id}`} variant="secondary">
                Track Agent Run
              </LinkButton>
            ) : null}
          </div>

          {isInProgress ? (
            <Card>
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span>Agent run in progress</span>
                <span>{run?.progress ?? 0}%</span>
              </div>
              <Progress value={run?.progress ?? 0} />
              <p className="mt-3 text-sm text-muted-foreground">This page refreshes every 3 seconds while agents are working.</p>
            </Card>
          ) : null}

          <CompanyBrief report={report} />
          <JDSkillBreakdown report={report} />
          <ResumeMatch report={report} />
          <PainPoints report={report} />
          <InterviewQuestions report={report} />
          <SuggestedAnswers report={report} />
          <SalaryInsight report={report} />
          <PrepPlan report={report} />
          <Citations citations={report.citations} />
        </div>
      ) : null}
    </PageShell>
  );
}

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-4">
    <h2 className="text-xl font-bold">{title}</h2>
    {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
  </div>
);

const ConfidenceBadge = ({ value }: { value?: Confidence }) => {
  const normalized = String(value ?? "low").toLowerCase();
  return (
    <Badge
      className={
        normalized === "high"
          ? "bg-emerald-100 text-emerald-800"
          : normalized === "medium"
            ? "bg-sky-100 text-sky-800"
            : "bg-amber-100 text-amber-800"
      }
    >
      {normalized} confidence
    </Badge>
  );
};

const DifficultyBadge = ({ value }: { value: string }) => (
  <Badge
    className={
      value === "hard"
        ? "bg-rose-100 text-rose-800"
        : value === "medium"
          ? "bg-sky-100 text-sky-800"
          : "bg-emerald-100 text-emerald-800"
    }
  >
    {value}
  </Badge>
);

const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="grid gap-2 text-sm text-slate-700">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-slate-50 p-3">
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState title="Nothing yet" message="This section will populate when the relevant agent output is available." />
  );

const CompanyBrief = ({ report }: { report: JobTargetReport }) => (
  <Card>
    <SectionTitle title="Company Brief" subtitle="Company context, market signals, and interview talking points." />
    {report.companyResearch ? (
      <div className="grid gap-5">
        <p className="text-sm leading-6 text-slate-700">{report.companyResearch.companySummary}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">Products</h3>
            <List items={asArray(report.companyResearch.products)} />
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Talking points</h3>
            <List items={asArray(report.companyResearch.interviewTalkingPoints)} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">Competitors</h3>
            {asArray(report.companyResearch.competitors).length ? (
              <div className="grid gap-2">
                {asArray(report.companyResearch.competitors).map((competitor) => (
                  <div key={competitor.name} className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="font-semibold">{competitor.name}</p>
                    <p className="mt-1 text-muted-foreground">{competitor.differentiator}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No competitors yet" message="Research has not added competitor context." />
            )}
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Recent news</h3>
            {asArray(report.companyResearch.recentNews).length ? (
              <div className="grid gap-2">
                {asArray(report.companyResearch.recentNews).map((news) => (
                  <a key={news.url} href={news.url} target="_blank" rel="noreferrer" className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100">
                    <p className="font-semibold">{news.headline}</p>
                    <p className="mt-1 text-muted-foreground">{news.date}</p>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent news yet" message="Research has not added recent news." />
            )}
          </div>
        </div>
      </div>
    ) : (
      <EmptyState title="Company brief pending" message="Company research will appear here after the agent run finishes." />
    )}
  </Card>
);

const JDSkillBreakdown = ({ report }: { report: JobTargetReport }) => (
  <Card>
    <SectionTitle title="JD Skill Breakdown" />
    {report.jdAnalysis ? (
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="mb-2 font-semibold">Must-haves</h3>
          <List items={asArray(report.jdAnalysis.mustHaveSkills)} />
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Nice-to-haves</h3>
          <List items={asArray(report.jdAnalysis.niceToHaveSkills)} />
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Hidden expectations</h3>
          <List items={asArray(report.jdAnalysis.hiddenExpectations)} />
        </div>
      </div>
    ) : (
      <EmptyState title="JD analysis pending" message="Skill breakdown will appear once the JD analysis agent completes." />
    )}
  </Card>
);

const ResumeMatch = ({ report }: { report: JobTargetReport }) => {
  const resumeSkills = new Set(asArray(report.resumeProfile?.technicalSkills).map((skill) => skill.toLowerCase()));
  const mustHave = asArray(report.jdAnalysis?.mustHaveSkills);
  const matches = mustHave.filter((skill) => resumeSkills.has(skill.toLowerCase())).length;
  const alignmentScore = mustHave.length ? Math.round((matches / mustHave.length) * 100) : null;

  return (
    <Card>
      <SectionTitle title="Resume Match" subtitle="Strengths, gaps, and rough alignment against the JD." />
      {report.resumeProfile ? (
        <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-md bg-slate-50 p-5">
            <p className="text-sm text-muted-foreground">Alignment score</p>
            <p className="mt-2 text-4xl font-bold">{alignmentScore === null ? "N/A" : `${alignmentScore}%`}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Strengths</h3>
              <List items={[...asArray(report.resumeProfile.achievements), ...asArray(report.resumeProfile.leadershipSignals)]} />
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Gaps</h3>
              <List items={asArray(report.resumeProfile.gapsOrWeaknesses)} />
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="Resume profile pending" message="Resume match appears after resume parsing completes." />
      )}
    </Card>
  );
};

const PainPoints = ({ report }: { report: JobTargetReport }) => (
  <Card>
    <SectionTitle title="Pain Points" subtitle="Inferred problems and how to position your experience." />
    {report.painPointReport ? (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3">
          {asArray(report.painPointReport.likelyPainPoints).map((item) => (
            <div key={item.painPoint} className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{item.painPoint}</p>
                <ConfidenceBadge value={item.confidenceLevel} />
              </div>
              <p className="mt-2 text-muted-foreground">{item.evidence}</p>
            </div>
          ))}
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Positioning strategy</h3>
          <List items={asArray(report.painPointReport.howCandidateCanPositionThemself)} />
        </div>
      </div>
    ) : (
      <EmptyState title="Pain point report pending" message="Inferred pain points appear after company and JD analysis are complete." />
    )}
  </Card>
);

const InterviewQuestions = ({ report }: { report: JobTargetReport }) => {
  const questionsByCategory = useMemo(() => {
    const grouped = new Map<string, NonNullable<JobTargetReport["interviewQuestions"]>>();
    for (const question of asArray(report.interviewQuestions)) {
      grouped.set(question.category, [...(grouped.get(question.category) ?? []), question]);
    }
    return grouped;
  }, [report.interviewQuestions]);
  const categories = [...questionsByCategory.keys()];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");
  const activeQuestions = questionsByCategory.get(activeCategory) ?? [];

  useEffect(() => {
    if (!activeCategory && categories[0]) {
      setActiveCategory(categories[0]);
    }
  }, [activeCategory, categories]);

  return (
    <Card>
      <SectionTitle title="Interview Questions" subtitle="Question cards include difficulty and interviewer intent." />
      {categories.length ? (
        <div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${activeCategory === category ? "bg-primary text-white" : "bg-slate-100 text-slate-700"}`}
                onClick={() => setActiveCategory(category)}
              >
                {questionCategoryLabels[category] ?? category}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {activeQuestions.map((question) => (
              <details key={question.id} className="rounded-md border border-border bg-slate-50 p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-semibold">{question.question}</p>
                    <DifficultyBadge value={question.difficulty} />
                  </div>
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p><span className="font-semibold">Interviewer intent:</span> {question.interviewerIntent}</p>
                  <p><span className="font-semibold">Prep notes:</span> {question.prepNotes}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Question bank pending" message="Interview questions appear after the question generator completes." />
      )}
    </Card>
  );
};

const SuggestedAnswers = ({ report }: { report: JobTargetReport }) => (
  <Card>
    <SectionTitle title="Suggested Answers" subtitle="Resume-backed answer guidance and sample delivery." />
    {asArray(report.answerGuides).length ? (
      <div className="grid gap-4">
        {asArray(report.answerGuides).map((guide) => (
          <div key={guide.id} className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-semibold">Structure</p>
            <p className="mt-1 text-sm text-muted-foreground">{guide.recommendedAnswerStructure}</p>
            <p className="mt-4 text-sm font-semibold">Sample answer</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{guide.strongSampleAnswer}</p>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState title="Answer guidance pending" message="Suggested answers appear after answer coaching completes." />
    )}
  </Card>
);

const SalaryInsight = ({ report }: { report: JobTargetReport }) => {
  const salary = report.salaryInsight;
  const formatRange = (range?: { low: number; high: number; currency: string }) =>
    range ? `${range.currency} ${range.low.toLocaleString()} - ${range.high.toLocaleString()}` : "Not available";

  return (
    <Card>
      <SectionTitle title="Salary Insight" />
      {salary ? (
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-md bg-slate-50 p-4">
            <ConfidenceBadge value={salary.confidenceLevel} />
            <p className="mt-4 text-sm text-muted-foreground">Base salary</p>
            <p className="text-lg font-bold">{formatRange(salary.estimatedBaseSalaryRange)}</p>
            <p className="mt-3 text-sm text-muted-foreground">Total compensation</p>
            <p className="text-lg font-bold">{formatRange(salary.estimatedTotalCompRange)}</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Negotiation tips</h3>
            <List items={asArray(salary.negotiationAdvice)} />
          </div>
        </div>
      ) : (
        <EmptyState title="Salary insight pending" message="Salary context appears after salary research completes." />
      )}
    </Card>
  );
};

const PrepPlan = ({ report }: { report: JobTargetReport }) => (
  <Card>
    <SectionTitle title="7-Day Prep Plan" />
    {asArray(report.prepPlan?.sevenDayPlan).length ? (
      <div className="grid gap-3 md:grid-cols-2">
        {asArray(report.prepPlan?.sevenDayPlan).map((day) => (
          <div key={day.day} className="rounded-md border border-border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-primary">Day {day.day}</p>
            <h3 className="mt-1 font-semibold">{day.focus}</h3>
            <div className="mt-3">
              <p className="text-sm font-semibold">Tasks</p>
              <List items={day.tasks} />
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold">Practice</p>
              <List items={day.practiceQuestions} />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState title="Prep plan pending" message="The day-by-day prep plan appears after the final planning agent completes." />
    )}
  </Card>
);

const Citations = ({ citations }: { citations: ReportCitation[] }) => (
  <Card>
    <SectionTitle title="Citations" />
    {citations.length ? (
      <div className="grid gap-2">
        {citations.map((citation) => (
          <a
            key={citation.url}
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100"
          >
            <span className="font-semibold">{citation.title || citation.url}</span>
            <span className="ml-2 text-muted-foreground">{citation.sourceType}</span>
          </a>
        ))}
      </div>
    ) : (
      <EmptyState title="No citations yet" message="Research citations will be listed here when available." />
    )}
  </Card>
);
