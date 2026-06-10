import {
  buildSearchArgs,
  parseSmartSearchJson,
  runSmartSearchFetch,
  runSmartSearchSearch,
  SmartSearchUnavailableError,
  type SmartSearchResult,
  type SmartSearchSearchOptions
} from "../adapters/smartSearchClient.js";
import { collectEvidenceSources, mergeEvidenceSources, summarizeLongText } from "../adapters/evidenceNormalizer.js";
import type { EvidenceSource } from "./types.js";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return fallback;
}

export function toStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const unique: string[] = [];

  for (const item of value) {
    const text = toString(item, "");

    if (text && !unique.includes(text)) {
      unique.push(text);
    }
  }

  return unique.length > 0 ? unique : [...fallback];
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function extractBulletLines(text: string, maxItems = 6): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, "").trim())
    .filter(Boolean);

  const unique: string[] = [];

  for (const line of lines) {
    if (!unique.includes(line)) {
      unique.push(line);
    }

    if (unique.length >= maxItems) {
      break;
    }
  }

  return unique;
}

export function extractQuotedTitles(text: string, maxItems = 8): string[] {
  const titles = new Set<string>();
  const bookRegex = /《([^》]{2,60})》/g;
  const quoteRegex = /[“"]([^”"]{2,60})[”"]/g;

  for (const match of text.matchAll(bookRegex)) {
    titles.add(match[1].trim());
  }

  for (const match of text.matchAll(quoteRegex)) {
    const value = match[1].trim();
    if (value.length >= 2 && value.length <= 60) {
      titles.add(value);
    }
  }

  return [...titles].slice(0, maxItems);
}

export async function runBookSmartSearchSearch(query: string, options: SmartSearchSearchOptions = {}): Promise<SmartSearchResult> {
  try {
    return await runSmartSearchSearch(query, options);
  } catch (error) {
    if (error instanceof SmartSearchUnavailableError) {
      return {
        ok: false,
        command: "search",
        args: buildSearchArgs(query, options),
        stdout: "",
        stderr: "",
        rawText: "",
        data: undefined,
        sources: [],
        error: error.message
      };
    }

    throw error;
  }
}

export function parseStructuredResult(result: SmartSearchResult): Record<string, unknown> | undefined {
  const candidates: unknown[] = [result.data, result.rawText];

  for (const candidate of candidates) {
    if (isPlainRecord(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string") {
      const parsed = parseSmartSearchJson(candidate);
      if (isPlainRecord(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

export async function enrichEvidenceFromSearch(result: SmartSearchResult, limit = 2): Promise<EvidenceSource[]> {
  const urls = result.sources
    .filter((source) => typeof source.url === "string" && source.url.length > 0)
    .map((source) => source.url as string)
    .slice(0, limit);

  if (urls.length === 0) {
    return result.sources;
  }

  const fetched = await Promise.all(
    urls.map(async (url) => {
      try {
        return await runSmartSearchFetch(url, "json", 45);
      } catch {
        return undefined;
      }
    })
  );

  const fetchedSources = fetched.flatMap((entry) => (entry ? entry.sources : []));
  return mergeEvidenceSources(result.sources, fetchedSources);
}

export function summarizeEvidenceNotes(result: SmartSearchResult, limit = 4): string[] {
  const notes: string[] = [];

  if (!result.ok && result.error) {
    notes.push(`智能搜索失败：${result.error}`);
  }

  if (result.rawText) {
    const summary = summarizeLongText(result.rawText, 4, 260);
    if (summary) {
      notes.push(`搜索摘要：${summary}`);
    }
  }

  return notes.slice(0, limit);
}

export function collectStructuredEvidence(value: unknown, kind: EvidenceSource["kind"] = "search", sourceLabel = "smart-search"): EvidenceSource[] {
  return collectEvidenceSources(value, kind, sourceLabel);
}
