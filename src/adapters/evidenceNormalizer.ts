import type { EvidenceSource } from "../orchestrators/types.js";

const urlPattern = /https?:\/\/[^\s\]">')]+/g;

function cleanText(value: string): string {
  return value
    .replaceAll(/\s+/g, " ")
    .replaceAll(/[`*_>#-]/g, " ")
    .replaceAll(/\u0000/g, "")
    .trim();
}

function truncate(value: string, limit = 220): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

export function extractUrls(text: string, limit = 6): string[] {
  const urls = text.match(urlPattern) ?? [];
  const unique: string[] = [];

  for (const url of urls) {
    if (!unique.includes(url)) {
      unique.push(url);
    }

    if (unique.length >= limit) {
      break;
    }
  }

  return unique;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fromPlainObject(value: Record<string, unknown>, kind: EvidenceSource["kind"], sourceLabel: string): EvidenceSource[] {
  const title = isNonEmptyString(value.title)
    ? value.title
    : isNonEmptyString(value.name)
      ? value.name
      : isNonEmptyString(value.source)
        ? value.source
        : undefined;

  const url = isNonEmptyString(value.url)
    ? value.url
    : isNonEmptyString(value.href)
      ? value.href
      : undefined;

  const excerpt = isNonEmptyString(value.snippet)
    ? value.snippet
    : isNonEmptyString(value.summary)
      ? value.summary
      : isNonEmptyString(value.description)
        ? value.description
        : isNonEmptyString(value.content)
          ? value.content
          : undefined;

  const confidence = value.confidence === "low" || value.confidence === "medium" || value.confidence === "high"
    ? value.confidence
    : undefined;

  const sources: EvidenceSource[] = [];

  if (title || url || excerpt) {
    sources.push({
      title: title ?? url ?? sourceLabel,
      url,
      excerpt: excerpt ? truncate(cleanText(excerpt)) : undefined,
      source: sourceLabel,
      kind,
      confidence
    });
  }

  for (const nestedValue of Object.values(value)) {
    sources.push(...collectEvidenceSources(nestedValue, kind, sourceLabel));
  }

  return sources;
}

export function collectEvidenceSources(value: unknown, kind: EvidenceSource["kind"] = "search", sourceLabel = "smart-search"): EvidenceSource[] {
  const sources: EvidenceSource[] = [];

  if (typeof value === "string") {
    const trimmed = cleanText(value);

    if (trimmed.length > 0) {
      sources.push({
        title: sourceLabel,
        excerpt: truncate(trimmed),
        source: sourceLabel,
        kind,
        confidence: kind === "fetch" ? "high" : "medium"
      });

      const urls = extractUrls(value);
      for (const url of urls) {
        sources.push({
          title: url,
          url,
          source: sourceLabel,
          kind,
          confidence: "medium"
        });
      }
    }

    return sources;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      sources.push(...collectEvidenceSources(item, kind, sourceLabel));
    }

    return sources;
  }

  if (value && typeof value === "object") {
    sources.push(...fromPlainObject(value as Record<string, unknown>, kind, sourceLabel));
  }

  const deduped: EvidenceSource[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const key = `${source.title}|${source.url ?? ""}|${source.excerpt ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(source);
    }
  }

  return deduped;
}

export function summarizeLongText(text: string, maxLines = 4, maxLength = 260): string {
  const cleaned = cleanText(text);
  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join(" ");

  return truncate(lines || cleaned, maxLength);
}

export function mergeEvidenceSources(...lists: Array<Array<EvidenceSource>>): EvidenceSource[] {
  const merged: EvidenceSource[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const item of list) {
      const key = `${item.title}|${item.url ?? ""}|${item.excerpt ?? ""}`;

      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
  }

  return merged;
}

