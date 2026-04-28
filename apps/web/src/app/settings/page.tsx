"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/app-shell";
import { Alert, Button, Card, Input, Label } from "@/components/ui";
import { API_BASE_URL } from "@/lib/api";

type ProviderName = "gemini" | "groq" | "anthropic" | "openai";

interface ProviderInfo {
  name: ProviderName;
  label: string;
  model: string;
  free: boolean;
  docsUrl: string;
  configured: boolean;
  active: boolean;
}

interface SettingsData {
  activeLLMProvider: ProviderName | null;
  providers: ProviderInfo[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [keys, setKeys] = useState<Partial<Record<string, string>>>({});
  const [activeProvider, setActiveProvider] = useState<ProviderName | "">("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings`)
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        setActiveProvider(data.activeLLMProvider ?? "");
      })
      .catch(() => setError("Could not load settings. Is the API running?"));
  }, []);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const apiKeys: Record<string, string> = {};
    for (const [k, v] of Object.entries(keys)) {
      if (v?.trim()) apiKeys[k] = v.trim();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(activeProvider && { llmProvider: activeProvider }),
          ...(Object.keys(apiKeys).length > 0 && { apiKeys }),
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      // Reload to pick up new configured state
      const updated = await fetch(`${API_BASE_URL}/settings`).then((r) => r.json() as Promise<SettingsData>);
      setSettings(updated);
      setActiveProvider(updated.activeLLMProvider ?? "");
      setKeys({});
      setSaved(true);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const envKeyName: Record<ProviderName, string> = {
    gemini: "GEMINI_API_KEY",
    groq: "GROQ_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">LLM Provider Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure which AI provider powers the interview prep agents. Changes take effect on the next job run.
        </p>

        {error ? (
          <div className="mt-4">
            <Alert title="Error" message={error} />
          </div>
        ) : null}

        {saved ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Settings saved successfully.
          </div>
        ) : null}

        {settings ? (
          <form className="mt-6 grid gap-5" onSubmit={onSave}>
            {settings.providers.map((provider) => {
              const envKey = envKeyName[provider.name];
              return (
                <Card key={provider.name} className={provider.active ? "ring-2 ring-primary" : ""}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{provider.label}</span>
                        {provider.free ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Free
                          </span>
                        ) : null}
                        {provider.configured ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Configured
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Not set
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{provider.model}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveProvider(provider.name)}
                      className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                        activeProvider === provider.name
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-white text-slate-700 hover:bg-muted"
                      }`}
                    >
                      {activeProvider === provider.name ? "Active" : "Set Active"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <Label>
                      API Key{" "}
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-normal text-primary underline-offset-2 hover:underline"
                      >
                        Get key →
                      </a>
                    </Label>
                    <Input
                      type="password"
                      placeholder={provider.configured ? "••••••••  (already set — paste to replace)" : "Paste your API key here"}
                      value={keys[envKey] ?? ""}
                      onChange={(e) => setKeys((prev) => ({ ...prev, [envKey]: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                </Card>
              );
            })}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        ) : !error ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
        ) : null}
      </div>
    </PageShell>
  );
}
