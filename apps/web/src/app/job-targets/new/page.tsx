"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/app-shell";
import { Alert, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch, rememberJobTarget } from "@/lib/api";
import sampleJobTargets from "@/data/sample-job-targets.json";

type CreateResponse = {
  jobTargetId: string;
  agentRunId: string;
  status: "pending";
};

export default function NewJobTargetPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    roleTitle: "",
    location: "",
    seniority: "",
    interviewDate: "",
    jobDescription: "",
    resumeText: "",
  });

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const loadSample = (index: number) => {
    if (index < 0) return;
    const sample = sampleJobTargets[index];
    if (!sample) return;
    setForm({
      companyName: sample.companyName,
      roleTitle: sample.roleTitle,
      location: sample.location,
      seniority: sample.seniority,
      interviewDate: sample.interviewDate,
      jobDescription: sample.jobDescription,
      resumeText: sample.resumeText,
    });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (form.resumeText.length > 50_000 || form.jobDescription.length > 20_000) {
      setError("Resume text must be under 50,000 characters and job description under 20,000 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiFetch<CreateResponse>("/job-targets", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          location: form.location || undefined,
          seniority: form.seniority || undefined,
          interviewDate: form.interviewDate || undefined,
        }),
      });

      rememberJobTarget({
        jobTargetId: result.jobTargetId,
        agentRunId: result.agentRunId,
        companyName: form.companyName,
        roleTitle: form.roleTitle,
        createdAt: new Date().toISOString(),
      });
      router.push(`/agent-runs/${result.agentRunId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create job target.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">Create Job Target</h1>
        <p className="mt-2 text-muted-foreground">
          Add the target role and resume context. InterviewOS will start an agent run immediately.
        </p>
      </div>
      <Card className="mt-8 max-w-4xl">
        {error ? <div className="mb-5"><Alert title="Could not create target" message={error} /></div> : null}
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
          <span className="shrink-0 text-sm font-medium">Load sample data:</span>
          <select
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            defaultValue=""
            onChange={(event) => {
              loadSample(Number(event.target.value));
              event.target.value = "";
            }}
          >
            <option value="" disabled>Select a sample to populate the form...</option>
            {sampleJobTargets.map((sample, index) => (
              <option key={sample.label} value={index}>{sample.label}</option>
            ))}
          </select>
        </div>
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Company</Label>
              <Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} required />
            </div>
            <div>
              <Label>Role title</Label>
              <Input value={form.roleTitle} onChange={(event) => update("roleTitle", event.target.value)} required />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(event) => update("location", event.target.value)} />
            </div>
            <div>
              <Label>Seniority</Label>
              <Input value={form.seniority} onChange={(event) => update("seniority", event.target.value)} />
            </div>
          </div>
          <div>
            <Label>Interview date</Label>
            <Input type="date" value={form.interviewDate} onChange={(event) => update("interviewDate", event.target.value)} />
          </div>
          <div>
            <Label>Job description</Label>
            <Textarea value={form.jobDescription} onChange={(event) => update("jobDescription", event.target.value)} required />
            <p className="mt-1 text-xs text-muted-foreground">{form.jobDescription.length}/20,000 characters</p>
          </div>
          <div>
            <Label>Resume text</Label>
            <Textarea value={form.resumeText} onChange={(event) => update("resumeText", event.target.value)} required />
            <p className="mt-1 text-xs text-muted-foreground">{form.resumeText.length}/50,000 characters</p>
          </div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Starting agent run..." : "Start Prep Run"}</Button>
        </form>
      </Card>
    </PageShell>
  );
}
