import fs from "fs";
import path from "path";

export interface CallLogEntry {
  timestamp: string;
  type: "llm" | "search";
  provider: string;
  model?: string;
  agent?: string;
  durationMs: number;
  status: "success" | "error";
  request: {
    preview: string;
    fullSize: number;
  };
  response?: {
    preview: string;
    fullSize: number;
  };
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
  error?: {
    name: string;
    message: string;
  };
}

const LOG_FILE_NAME = "api-calls.jsonl";

const resolveLogFilePath = (): string => {
  const customDir = process.env.CALL_LOG_DIR;
  if (customDir) {
    return path.resolve(customDir, LOG_FILE_NAME);
  }
  // Default: <repo-root>/logs/api-calls.jsonl
  // process.cwd() during dev is usually the package dir; walk up to find root or use cwd
  return path.resolve(process.cwd(), "logs", LOG_FILE_NAME);
};

let cachedPath: string | undefined;
let initialized = false;

const ensureLogFile = (): string => {
  if (cachedPath && initialized) return cachedPath;
  const filePath = resolveLogFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  cachedPath = filePath;
  initialized = true;
  return filePath;
};

const truncate = (text: string, max = 500): string => {
  if (text.length <= max) return text;
  return text.substring(0, max) + `... [truncated, ${text.length - max} more chars]`;
};

export const logApiCall = (entry: CallLogEntry): void => {
  try {
    const filePath = ensureLogFile();
    fs.appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    // Don't throw - logging should never break the app
    console.error("[CallLogger] Failed to write log:", err);
  }
};

export const buildLogEntry = (params: {
  type: "llm" | "search";
  provider: string;
  model?: string;
  agent?: string;
  startedAt: number;
  request: string | object;
  response?: string | object;
  tokens?: { input?: number; output?: number; total?: number };
  error?: unknown;
}): CallLogEntry => {
  const requestStr = typeof params.request === "string" ? params.request : JSON.stringify(params.request);
  const responseStr =
    params.response === undefined
      ? undefined
      : typeof params.response === "string"
        ? params.response
        : JSON.stringify(params.response);

  const entry: CallLogEntry = {
    timestamp: new Date().toISOString(),
    type: params.type,
    provider: params.provider,
    model: params.model,
    agent: params.agent,
    durationMs: Date.now() - params.startedAt,
    status: params.error ? "error" : "success",
    request: {
      preview: truncate(requestStr),
      fullSize: requestStr.length,
    },
  };

  if (responseStr !== undefined) {
    entry.response = {
      preview: truncate(responseStr),
      fullSize: responseStr.length,
    };
  }

  if (params.tokens) {
    entry.tokens = params.tokens;
  }

  if (params.error) {
    entry.error = {
      name: params.error instanceof Error ? params.error.name : "UnknownError",
      message: params.error instanceof Error ? params.error.message : String(params.error),
    };
  }

  return entry;
};

export const getLogFilePath = (): string => ensureLogFile();
