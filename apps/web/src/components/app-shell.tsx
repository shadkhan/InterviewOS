import { LinkButton } from "@/components/ui";
import type { ReactNode } from "react";

export const AppHeader = () => (
  <header className="border-b border-border bg-white">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
      <a href="/" className="text-lg font-bold tracking-tight text-slate-950">
        InterviewOS
      </a>
      <nav className="flex items-center gap-2">
        <LinkButton href="/dashboard" variant="ghost">
          Dashboard
        </LinkButton>
        <LinkButton href="/job-targets/new" variant="secondary">
          New Target
        </LinkButton>
      </nav>
    </div>
  </header>
);

export const PageShell = ({ children }: { children: ReactNode }) => (
  <>
    <AppHeader />
    <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
  </>
);
