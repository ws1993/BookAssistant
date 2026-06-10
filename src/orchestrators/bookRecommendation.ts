import { buildRecommendationClarificationQuestions, needsRecommendationClarification, type RecommendationInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookThemes.js";
import { runSmartSearchSearch } from "../adapters/smartSearchClient.js";
import { collectStructuredEvidence, enrichEvidenceFromSearch, extractQuotedTitles, parseStructuredResult, summarizeEvidenceNotes, toNumber, toString, toStringArray, extractBulletLines } from "./shared.js";
import type { BookAssistantResult, EvidenceSource, RecommendationItem, RecommendationResult } from "./types.js";

function buildRecommendationPrompt(input: RecommendationInput, profile: string): string {
  return [
    "你是一个严谨的图书推荐助手，只输出 JSON，不要输出 Markdown，不要代码块，不要多余解释。",
    `用户需求：${input.query}`,
    input.genre ? `题材：${input.genre}` : "",
    input.audience ? `目标读者：${input.audience}` : "",
    input.tone ? `偏好风格：${input.tone}` : "",
    input.constraints.length ? `必须满足的条件：${input.constraints.join("；")}` : "",
    input.avoid.length ? `需要避开：${input.avoid.join("；")}` : "",
    `推荐数量：${input.count}`,
    `风格画像：${profile}`,
    "",
    "请严格输出以下 JSON 结构：",
    "{",
    '  "title": "图书推荐结果",',
    '  "summary": "一句话总结推荐结论",',
    '  "items": [',
    '    {"rank": 1, "title": "书名", "author": "作者", "reason": "推荐理由", "fit": "适合人群/场景", "warning": "风险或注意点", "tags": ["标签"], "sources": [{"title": "来源标题", "url": "https://...", "excerpt": "证据摘录", "confidence": "medium"}]}',
    "  ],",
    '  "evidence": [{"title": "证据来源", "url": "https://...", "excerpt": "摘录", "confidence": "medium"}],',
    '  "notes": ["补充说明"]',
    "}",
    "如果某项证据不足，请在 warning 或 notes 中说明，不要编造。"
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeRecommendationItems(value: unknown, fallbackSources: EvidenceSource[], count: number): RecommendationItem[] {
  const items: RecommendationItem[] = [];

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const record = entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as Record<string, unknown>) : {};
      const itemSources = collectStructuredEvidence(record.sources ?? record.evidence ?? [], "search");
      const mergedSources = itemSources.length > 0 ? itemSources : fallbackSources.slice(0, 2);

      items.push({
        rank: Math.max(1, Math.trunc(toNumber(record.rank, index + 1))),
        title: toString(record.title ?? record.bookTitle ?? record.name, `推荐书目 ${index + 1}`),
        author: toString(record.author, "") || undefined,
        reason: toString(record.reason ?? record.why ?? record.analysis, "当前证据支持它与需求较匹配。"),
        fit: toString(record.fit ?? record.suitability ?? record.audienceFit, "适合当前需求"),
        warning: toString(record.warning ?? record.risk, "") || undefined,
        tags: toStringArray(record.tags, []),
        sources: mergedSources
      });
    });
  }

  if (items.length === 0) {
    const fallbackTitles = extractQuotedTitles(fallbackSources.map((source) => source.title).join("\n")).slice(0, count);
    fallbackTitles.forEach((title, index) => {
      items.push({
        rank: index + 1,
        title,
        reason: "搜索证据中出现该书名，但结构化推荐结果未能完整解析，建议结合用户偏好进一步筛选。",
        fit: "可作为候选书目继续核实",
        tags: ["候选"],
        sources: fallbackSources.slice(0, 2)
      });
    });
  }

  return items.slice(0, count).map((item, index) => ({
    ...item,
    rank: index + 1,
    tags: item.tags.length > 0 ? item.tags : ["推荐"]
  }));
}

function buildRecommendationTitle(input: RecommendationInput, profile: string): string {
  const subject = [input.genre, input.tone, input.audience].filter(Boolean).join(" / ");
  return subject ? `图书推荐：${subject}` : `图书推荐：${input.query}`;
}

function buildClarificationResult(input: RecommendationInput): BookAssistantResult {
  return {
    kind: "clarification",
    title: "需要你补充一些图书偏好",
    intro: "当前需求还不够明确，我需要确认几个关键信息，才能给出更准确的图书推荐。",
    questions: buildRecommendationClarificationQuestions(),
    styleProfile: resolveBookStyleProfile(input.styleProfile, input.query)
  };
}

export async function createRecommendationResult(input: RecommendationInput): Promise<BookAssistantResult> {
  if (needsRecommendationClarification(input)) {
    return buildClarificationResult(input);
  }

  const profile = resolveBookStyleProfile(
    input.styleProfile,
    [input.query, input.genre, input.audience, input.tone, ...input.constraints, ...input.avoid].filter(Boolean).join(" ")
  );

  const prompt = buildRecommendationPrompt(input, profile);
  const searchResult = await runSmartSearchSearch(prompt, {
    validation: "balanced",
    extraSources: 2,
    fallback: "off",
    format: "json",
    timeoutSeconds: 60
  });
  const evidence = await enrichEvidenceFromSearch(searchResult, 2);
  const parsed = parseStructuredResult(searchResult);

  const items = normalizeRecommendationItems(parsed?.items ?? parsed?.books ?? parsed?.recommendations, evidence, input.count);
  const notes = [
    ...(toStringArray(parsed?.notes, [])),
    ...summarizeEvidenceNotes(searchResult, 3)
  ];

  return {
    kind: "recommendation",
    title: toString(parsed?.title, buildRecommendationTitle(input, profile)),
    query: input.query,
    profile,
    summary: toString(parsed?.summary, searchResult.rawText || "当前证据不足以生成可靠推荐，暂时无法检索公开来源。"),
    items,
    evidence: evidence.slice(0, 8),
    notes: notes.length > 0 ? notes : ["当前结果主要基于公开网页证据与智能搜索综合整理。"]
  };
}
