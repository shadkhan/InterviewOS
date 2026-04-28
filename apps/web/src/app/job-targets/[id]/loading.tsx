import { PageShell } from "@/components/app-shell";
import { Card } from "@/components/ui";

export default function LoadingJobTarget() {
  return (
    <PageShell>
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 4 }, (_value, index) => (
          <Card key={index}>
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-16 animate-pulse rounded bg-slate-100" />
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
