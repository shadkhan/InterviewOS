"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/app-shell";
import { Alert, Card, LinkButton, Progress } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { AgentRunStatus } from "@/lib/report-types";
import { formatDate } from "@/lib/utils";

export default function AgentRunPage({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<AgentRunStatus | null>(null);
  const [error, setError] = useState("");

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
                <span>Progress</span>
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
          </div>
        ) : null}
      </Card>
    </PageShell>
  );
}
