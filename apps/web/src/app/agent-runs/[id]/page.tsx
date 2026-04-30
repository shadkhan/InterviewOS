"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/app-shell";
import { Alert, Card, LinkButton, Progress } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { AgentRunStatus, NodeRunStatus, NodeStatusEntry } from "@/lib/report-types";
import { formatDate } from "@/lib/utils";

const NODE_ORDER = [
  { key: "intake", label: "Intake" },
  { key: "resumeParser", label: "Resume Parser" },
  { key: "jdAnalysisStep", label: "JD Analysis" },
  { key: "companyResearchStep", label: "Company Research" },
  { key: "salaryResearch", label: "Salary Research" },
  { key: "painPoint", label: "Pain Points" },
  { key: "interviewQuestion", label: "Interview Questions" },
  { key: "answerCoach", label: "Answer Coach" },
  { key: "prepPlanStep", label: "Prep Plan" },
  { key: "finalize", label: "Finalize" },
] as const;

const STATUS_STYLES: Record<NodeRunStatus | "pending", { icon: string; color: string; label: string }> = {
  pending: { icon: "○", color: "text-slate-400", label: "Pending" },
  running: { icon: "◐", color: "text-blue-600 animate-pulse", label: "Running" },
  completed: { icon: "✓", color: "text-green-600", label: "Completed" },
  failed: { icon: "✗", color: "text-red-600", label: "Failed" },
};

type NodeRow = {
  key: string;
  label: string;
  entry?: NodeStatusEntry;
};

const RETRY_PROVIDERS = ["gemini", "groq", "anthropic", "openai"] as const;
type RetryProvider = (typeof RETRY_PROVIDERS)[number];

const RETRYABLE_NODES = new Set([
  "resumeParser",
  "jdAnalysisStep",
  "companyResearchStep",
  "salaryResearch",
  "painPoint",
  "interviewQuestion",
  "answerCoach",
  "prepPlanStep",
]);

export default function AgentRunPage({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<AgentRunStatus | null>(null);
  const [error, setError] = useState("");
  const [retryingNode, setRetryingNode] = useState<string | null>(null);
  const [providerByNode, setProviderByNode] = useState<Record<string, RetryProvider | "default">>({});

  const handleRetry = async (nodeKey: string) => {
    setRetryingNode(nodeKey);
    try {
      const provider = providerByNode[nodeKey];
      const body: { node: string; provider?: RetryProvider } = { node: nodeKey };
      if (provider && provider !== "default") body.provider = provider;
      await apiFetch(`/agent-runs/${params.id}/retry-node`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetryingNode(null);
    }
  };

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const nextRun = await apiFetch<AgentRunStatus>(`/agent-runs/${params.id}`);
        if (!isActive) return;
        setRun(nextRun);
        setError("");
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Unable to load this run.");
      }
    };

    void load();
    const interval = window.setInterval(load, 3000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [params.id]);

  return (
    <PageShell>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">Agent Run</h1>
        <p className="mt-2 text-muted-foreground">Progress updates automatically every 3 seconds.</p>
      </div>

      <Card className="mt-8 max-w-3xl">
        {error ? <Alert title="Run unavailable" message={error} /> : null}
        {!run && !error ? <p className="text-sm text-muted-foreground">Loading run status...</p> : null}
        {run ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Run ID</p>
                <h2 className="break-all text-xl font-semibold">{run.id}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{run.status}</span>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span>{getProgressLabel(run)}</span>
                <span>{run.progress}%</span>
              </div>
              <Progress value={run.progress} />
            </div>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold">Started</dt>
                <dd className="text-muted-foreground">{formatDate(run.startedAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Completed</dt>
                <dd className="text-muted-foreground">{formatDate(run.completedAt)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-3">
              <LinkButton href={`/job-targets/${run.jobTargetId}`} variant="secondary">
                Open Report
              </LinkButton>
            </div>

            <div className="mt-8">
              <h3 className="mb-3 text-base font-semibold">Agent steps</h3>
              <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
                {buildNodeRows(run).map((row) => {
                  const status = row.entry?.status ?? "pending";
                  const style = STATUS_STYLES[status];
                  const canRetry = status === "failed" && RETRYABLE_NODES.has(row.key);
                  const isRetrying = retryingNode === row.key;
                  return (
                    <li key={row.key} className="flex items-start gap-3 px-4 py-3 text-sm">
                      <span className={`text-lg leading-none ${style.color}`}>{style.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{row.label}</span>
                          <span className={`text-xs ${style.color}`}>{style.label}</span>
                        </div>
                        {row.entry?.durationMs !== undefined ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Duration: {(row.entry.durationMs / 1000).toFixed(1)}s
                          </p>
                        ) : null}
                        {row.entry?.error ? (
                          <p className="mt-1 break-words text-xs text-red-600">{row.entry.error}</p>
                        ) : null}
                        {canRetry ? (
                          <div className="mt-2 flex items-center gap-2">
                            <select
                              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                              value={providerByNode[row.key] ?? "default"}
                              onChange={(e) =>
                                setProviderByNode((prev) => ({ ...prev, [row.key]: e.target.value as RetryProvider | "default" }))
                              }
                              disabled={isRetrying}
                            >
                              <option value="default">Use default provider</option>
                              {RETRY_PROVIDERS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRetry(row.key)}
                              disabled={isRetrying}
                              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isRetrying ? "Retrying…" : "Retry"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </Card>
    </PageShell>
  );
}

const buildNodeRows = (run: AgentRunStatus): NodeRow[] => {
  const map = run.nodeStatuses ?? {};
  return NODE_ORDER.map(({ key, label }) => ({
    key,
    label,
    entry: map[key],
  }));
};

const getProgressLabel = (run: AgentRunStatus): string => {
  const map = run.nodeStatuses ?? {};

  const running = NODE_ORDER.find(({ key }) => map[key]?.status === "running");
  if (running) return `Running: ${running.label}…`;

  if (run.status === "completed") return "Progress";
  if (run.status === "failed") {
    const lastFailed = [...NODE_ORDER].reverse().find(({ key }) => map[key]?.status === "failed");
    return lastFailed ? `Failed at: ${lastFailed.label}` : "Progress";
  }

  return "Progress";
};
