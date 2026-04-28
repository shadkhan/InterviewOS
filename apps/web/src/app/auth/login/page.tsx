"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Label, LinkButton } from "@/components/ui";
import { API_BASE_URL, setAccessToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Unable to sign in with those credentials.");
      }

      const data = (await response.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      router.push("/dashboard");
    } catch {
      setError("We could not sign you in. Check your credentials and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center px-4 py-10">
      <Card>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Access your interview prep workspace.</p>
        {error ? <div className="mt-4"><Alert title="Sign in failed" message={error} /></div> : null}
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="mt-4">
          <LinkButton href="/auth/signup" variant="ghost" className="w-full">
            Create account
          </LinkButton>
        </div>
      </Card>
    </main>
  );
}
