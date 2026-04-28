import { Card, LinkButton } from "@/components/ui";

const capabilities = [
  "Company-specific research",
  "JD skill breakdown",
  "Resume-backed answer coaching",
  "Question banks by interview stage",
  "Salary and negotiation prep",
  "A practical seven-day plan",
];

export default function LandingPage() {
  return (
    <main>
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid min-h-[88vh] max-w-6xl content-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Personal interview strategist</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              InterviewOS
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Turn a resume, job description, and target company into a structured prep workspace with research,
              questions, answer guidance, salary context, and a day-by-day plan.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/job-targets/new">Create Job Target</LinkButton>
              <LinkButton href="/dashboard" variant="secondary">
                View Dashboard
              </LinkButton>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-slate-950 p-6 text-white shadow-panel">
            <div className="grid gap-3">
              {capabilities.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md bg-white/10 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-slate-950">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {["Specific", "Structured", "Resume-safe"].map((title) => (
          <Card key={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Prep that stays anchored to the target role, company context, and facts already present in the user resume.
            </p>
          </Card>
        ))}
      </section>
    </main>
  );
}
