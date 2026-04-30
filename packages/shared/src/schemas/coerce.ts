import { z } from "zod";

const coerceToString = (val: unknown): unknown => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    // LLMs sometimes wrap a string in an object: {summary: "..."} or {text: "..."}
    const obj = val as Record<string, unknown>;
    for (const key of ["summary", "text", "value", "content", "description"]) {
      const candidate = obj[key];
      if (typeof candidate === "string") return candidate;
    }
    return JSON.stringify(val);
  }
  return val;
};

const coerceToStringArray = (val: unknown): unknown => {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) return val.map((item) => coerceToString(item));
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.length === 0) return [];
    if (trimmed.includes(",") || trimmed.includes(";")) {
      return trimmed.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  if (typeof val === "object") {
    // LLMs sometimes return {items: [...]} or {list: [...]}
    const obj = val as Record<string, unknown>;
    for (const key of ["items", "list", "values", "results"]) {
      if (Array.isArray(obj[key])) return (obj[key] as unknown[]).map(coerceToString);
    }
    // Or each key is a string item
    return Object.values(val).map(coerceToString);
  }
  return val;
};

const coerceToArray = (val: unknown): unknown => {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    for (const key of ["items", "list", "values", "results"]) {
      if (Array.isArray(obj[key])) return obj[key];
    }
  }
  return [val];
};

/**
 * String field that coerces numbers/booleans to strings; null/undefined → "".
 */
export const lenientString = (description?: string): z.ZodType<string> =>
  z.preprocess(
    coerceToString,
    description ? z.string().describe(description) : z.string(),
  ) as z.ZodType<string>;

/**
 * String-array field that wraps a single string into an array; splits comma/semi-colon strings.
 */
export const lenientStringArray = (description?: string): z.ZodType<string[]> =>
  z.preprocess(
    coerceToStringArray,
    description ? z.array(z.string()).describe(description) : z.array(z.string()),
  ) as z.ZodType<string[]>;

/**
 * Generic array field; wraps a single non-array value into an array of one item.
 */
export const lenientArray = <T>(itemSchema: z.ZodType<T>, description?: string): z.ZodType<T[]> =>
  z.preprocess(
    coerceToArray,
    description ? z.array(itemSchema).describe(description) : z.array(itemSchema),
  ) as z.ZodType<T[]>;
