import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Button = ({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) => (
  <button
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
      variant === "primary" && "bg-primary text-primary-foreground hover:bg-teal-800",
      variant === "secondary" && "border border-border bg-white text-foreground hover:bg-muted",
      variant === "ghost" && "text-foreground hover:bg-muted",
      className,
    )}
    {...props}
  />
);

export const LinkButton = ({
  className,
  variant = "primary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: "primary" | "secondary" | "ghost" }) => (
  <Link
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      variant === "primary" && "bg-primary text-primary-foreground hover:bg-teal-800",
      variant === "secondary" && "border border-border bg-white text-foreground hover:bg-muted",
      variant === "ghost" && "text-foreground hover:bg-muted",
      className,
    )}
    {...props}
  />
);

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section className={cn("rounded-lg border border-border bg-white p-5 shadow-panel", className)}>{children}</section>
);

export const Badge = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
    {children}
  </span>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
      className,
    )}
    {...props}
  />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "min-h-32 w-full rounded-md border border-border bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
      className,
    )}
    {...props}
  />
);

export const Label = ({ children }: { children: ReactNode }) => (
  <label className="mb-2 block text-sm font-semibold text-slate-800">{children}</label>
);

export const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="rounded-md border border-dashed border-border bg-slate-50 p-4 text-sm">
    <p className="font-semibold text-slate-900">{title}</p>
    <p className="mt-1 text-muted-foreground">{message}</p>
  </div>
);

export const Alert = ({ title, message }: { title: string; message: string }) => (
  <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-semibold">{title}</p>
    <p className="mt-1">{message}</p>
  </div>
);

export const Progress = ({ value }: { value: number }) => (
  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);
