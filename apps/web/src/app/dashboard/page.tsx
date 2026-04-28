"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/app-shell";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { apiFetch, getStoredJobTargets, type StoredJobTarget } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type JobTargetDetails = {
  id: string;
  companyName: string;
  roleTitle: string;
  status: string;
  createdAt: string;
  agentRuns: Array<{ id: string; status: string }>;
};

export default function DashboardPage() {
  const [targets, setTargets] = useState<StoredJobTarget[]>([]);
  const [details, setDetails] = useState<Record<string, JobTargetDetails>>({});

  useEffect(() => {
    const stored = getStoredJobTargets();
    setTargets(stored);

    void Promise.all(
      stored.map(async (target) => {
        try {
          const detail = await apiFetch<JobTargetDetails>(`/job-targets/${target.jobTargetId}`);
          setDetails((current) => ({ ...current, [target.jobTargetId]: detail }));
        } catch {
          // Keep the locally remembered target visible when the API detail fetch is unavailable.
        }
      }),
    );
  }, []);

  return (
    <PageShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Job Targets</h1>
          <p className="mt-2 text-muted-foreground">Track every company and role you are preparing for.</p>
        </div>
        <LinkButton href="/job-targets/new">New Job Target</LinkButton>
      </div>

      <div className="mt-8 grid gap-4">
        {targets.length === 0 ? (
          <EmptyState
            title="No job targets yet"
            message="Create a job target to start company research, question generation, and a prep plan."
          />
        ) : (
          targets.map((target) => {
            const detail = details[target.jobTargetId];
            const runId = detail?.agentRuns[0]?.id ?? target.agentRunId;

            return (
              <Card key={target.jobTargetId}>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-xl font-semibold">{detail?.roleTitle ?? target.roleTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail?.companyName ?? target.companyName} • Created {formatDate(detail?.createdAt ?? target.createdAt)}
                    </p>
                    <p className="mt-2 text-sm font-medium">Status: {detail?.status ?? "pending"}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <LinkButton href={`/job-targets/${target.jobTargetId}`} variant="secondary">
                      Open Report
                    </LinkButton>
                    <LinkButton href={`/agent-runs/${runId}`} variant="ghost">
                      Track Run
                    </LinkButton>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
