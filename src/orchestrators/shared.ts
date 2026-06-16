import {
  buildSearchArgs,
  runSmartSearchSearch,
  SmartSearchUnavailableError,
  type SmartSearchResult,
  type SmartSearchSearchOptions
} from "../adapters/smartSearchClient.js";
import { collectEvidenceSources, mergeEvidenceSources } from "../adapters/evidenceNormalizer.js";
import { perfMonitor } from "../utils/performanceMonitor.js";
import type { EvidenceSource } from "./types.js";

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

/**
 * Run one or more smart-search queries and merge their evidence.
 *
 * smart-search is an OpenAI-compatible web search: it returns a synthesized
 * Markdown answer (`rawText`) plus a list of `sources`. We deliberately do NOT
 * try to coerce it into emitting JSON — that was the root cause of the previous
 * design failing. Instead we hand the raw synthesized text and sources back to
 * the host model, which is responsible for turning them into a structured page.
 */
export async function runBookSmartSearch(
  query: string,
  options: SmartSearchSearchOptions = {}
): Promise<SmartSearchResult> {
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

export interface CollectedEvidence {
  ok: boolean;
  error?: string;
  /** The synthesized answer text from smart-search, verbatim, for the host model to read. */
  digest: string;
  sources: EvidenceSource[];
}

export async function collectBookEvidence(
  queries: string[],
  options: SmartSearchSearchOptions = {}
): Promise<CollectedEvidence> {
  return perfMonitor.measure(
    "collectBookEvidence",
    async () => {
      perfMonitor.start("smart-search-queries", { queryCount: queries.length });
      const results = await Promise.all(queries.map((query) => runBookSmartSearch(query, options)));
      perfMonitor.end("smart-search-queries");

      const okResults = results.filter((result) => result.ok);
      const failed = results.filter((result) => !result.ok);

      perfMonitor.start("merge-evidence");
      const digest = okResults
        .map((result) => result.rawText)
        .filter((text) => text.trim().length > 0)
        .join("\n\n---\n\n");

      const sources = mergeEvidenceSources(
        ...results.map((result) => result.sources),
        ...okResults.map((result) => collectEvidenceSources(result.rawText, "search"))
      );
      perfMonitor.end("merge-evidence", { sourceCount: sources.length });

      return {
        ok: okResults.length > 0,
        error: okResults.length === 0 ? failed.map((result) => result.error).filter(Boolean).join("; ") || undefined : undefined,
        digest,
        sources
      };
    },
    { queryCount: queries.length }
  );
}
