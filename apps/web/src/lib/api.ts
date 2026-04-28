"use client";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type StoredJobTarget = {
  jobTargetId: string;
  agentRunId: string;
  companyName: string;
  roleTitle: string;
  createdAt: string;
};

const TOKEN_KEY = "interviewos.accessToken";
const JOB_TARGETS_KEY = "interviewos.jobTargets";

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(userSafeMessage(response.status));
  }

  return response.json() as Promise<T>;
};

export const getStoredJobTargets = (): StoredJobTarget[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(JOB_TARGETS_KEY);
    return raw ? (JSON.parse(raw) as StoredJobTarget[]) : [];
  } catch {
    return [];
  }
};

export const rememberJobTarget = (target: StoredJobTarget): void => {
  const existing = getStoredJobTargets().filter((item) => item.jobTargetId !== target.jobTargetId);
  window.localStorage.setItem(JOB_TARGETS_KEY, JSON.stringify([target, ...existing].slice(0, 20)));
};

const userSafeMessage = (status: number): string => {
  if (status === 401) {
    return "Please sign in to continue.";
  }

  if (status === 403) {
    return "You do not have access to this workspace item.";
  }

  if (status === 404) {
    return "We could not find that item.";
  }

  if (status === 429) {
    return "You have reached the hourly creation limit. Try again shortly.";
  }

  return "Something went wrong. Please try again.";
};
