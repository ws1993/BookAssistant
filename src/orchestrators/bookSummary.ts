import { needsBookIdentityClarification, type SummaryInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookThemes.js";
import { runSmartSearchSearch } from "../adapters/smartSearchClient.js";
import { collectStructuredEvidence, enrichEvidenceFromSearch, extractBulletLines, parseStructuredResult, summarizeEvidenceNotes, toString, toStringArray } from "./shared.js";
import type { BookAssistantResult, SummaryResult } from "./types.js";

function buildSummaryPrompt(input: SummaryInput, profile: string): string {
  return [
    "你是一个严谨的图书总结助手，只输出 JSON，不要输出 Markdown，不要代码块，不要多余解释。",
    `书名：${input.title}`,
    input.author ? `作者：${input.author}` : "",
    input.isbn ? `ISBN：${input.isbn}` : "",
    input.edition ? `版本信息：${input.edition}` : "",
    `剧透策略：${input.spoilerPolicy}`,
    input.focus ? `重点：${input.focus}` : "",
    `风格画像：${profile}`,
    "",
    "请严格输出以下 JSON 结构：",
    "{",
    '  "title": "图书总结",',
    '  "bookTitle": "书名",',
    '  "author": "作者",',
    '  "edition": "版本信息",',
    '  "overview": "200字以内的转换性总结",',
    '  "keyPoints": ["关键点1", "关键点2"],',
    '  "structure": ["结构脉络1", "结构脉络2"],',
    '  "audience": ["适合读者1", "适合读者2"],',
    '  "sources": [{"title": "来源标题", "url": "https://...", "excerpt": "证据摘录", "confidence": "medium"}],',
    '  "notes": ["补充说明"]',
    "}",
    "如果无法确认某些信息，请在 notes 中注明，不要编造。"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildClarificationResult(input: SummaryInput): BookAssistantResult {
  return {
    kind: "clarification",
    title: "需要补充书目信息",
    intro: "这本书的身份还不够明确，我需要书名、作者、ISBN 或版本信息中的更多线索，避免混淆同名书。",
    questions: [
      { id: "author", label: "这本书的作者是谁？" },
      { id: "isbn", label: "如果有 ISBN，请提供。" },
      { id: "edition", label: "如果你想看特定版本，请补充出版社或版次。" }
    ],
    styleProfile: resolveBookStyleProfile(input.styleProfile, input.title)
  };
}

export async function createSummaryResult(input: SummaryInput): Promise<BookAssistantResult> {
  if (needsBookIdentityClarification(input.title, input.author, input.isbn)) {
    return buildClarificationResult(input);
  }

  const profile = resolveBookStyleProfile(input.styleProfile, [input.title, input.author, input.edition, input.focus].filter(Boolean).join(" "));
  const prompt = buildSummaryPrompt(input, profile);
  const searchResult = await runSmartSearchSearch(prompt, {
    validation: "balanced",
    extraSources: 2,
    fallback: "off",
    format: "json",
    timeoutSeconds: 60
  });
  const evidence = await enrichEvidenceFromSearch(searchResult, 2);
  const parsed = parseStructuredResult(searchResult);

  const overview = toString(parsed?.overview, searchResult.rawText || "当前证据不足以生成更完整的摘要。");
  const keyPoints = toStringArray(parsed?.keyPoints, extractBulletLines(searchResult.rawText, 5));
  const structure = toStringArray(parsed?.structure, extractBulletLines(searchResult.rawText, 4));
  const audience = toStringArray(parsed?.audience, [input.focus ? `关注 ${input.focus} 的读者` : "希望快速了解这本书的读者"]);
  const notes = [...toStringArray(parsed?.notes, []), ...summarizeEvidenceNotes(searchResult, 3)];
  const sources = collectStructuredEvidence(parsed?.sources ?? parsed?.evidence ?? []).length > 0 ? collectStructuredEvidence(parsed?.sources ?? parsed?.evidence ?? []) : evidence;

  const bookTitle = toString(parsed?.bookTitle, input.title);

  const result: SummaryResult = {
    kind: "summary",
    title: toString(parsed?.title, `图书总结：${bookTitle}`),
    profile,
    bookTitle,
    author: toString(parsed?.author, input.author ?? "") || undefined,
    edition: toString(parsed?.edition, input.edition ?? "") || undefined,
    spoilerPolicy: input.spoilerPolicy,
    overview,
    keyPoints,
    structure,
    audience,
    sources: sources.slice(0, 8),
    notes: notes.length > 0 ? notes : ["当前总结主要基于公开网页证据与智能搜索综合整理。"]
  };

  return result;
}

