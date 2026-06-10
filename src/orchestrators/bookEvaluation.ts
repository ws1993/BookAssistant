import { type EvaluationInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookThemes.js";
import { runSmartSearchSearch } from "../adapters/smartSearchClient.js";
import { collectStructuredEvidence, enrichEvidenceFromSearch, extractBulletLines, parseStructuredResult, summarizeEvidenceNotes, toNumber, toString, toStringArray } from "./shared.js";
import type { BookAssistantResult, EvaluationResult } from "./types.js";

function buildEvaluationPrompt(input: EvaluationInput, profile: string): string {
  return [
    "你是一个严谨的图书评价助手，只输出 JSON，不要输出 Markdown，不要代码块，不要多余解释。",
    `书名：${input.title}`,
    input.author ? `作者：${input.author}` : "",
    input.isbn ? `ISBN：${input.isbn}` : "",
    input.edition ? `版本信息：${input.edition}` : "",
    input.focus ? `评价重点：${input.focus}` : "",
    `风格画像：${profile}`,
    "",
    "请严格输出以下 JSON 结构：",
    "{",
    '  "title": "图书评价",',
    '  "bookTitle": "书名",',
    '  "author": "作者",',
    '  "edition": "版本信息",',
    '  "score": 8.4,',
    '  "verdict": "一句话评价",',
    '  "pros": ["优点1", "优点2"],',
    '  "cons": ["缺点1", "缺点2"],',
    '  "bestFor": ["适合谁1", "适合谁2"],',
    '  "avoidIf": ["不建议给谁1", "不建议给谁2"],',
    '  "sources": [{"title": "来源标题", "url": "https://...", "excerpt": "证据摘录", "confidence": "medium"}],',
    '  "notes": ["补充说明"]',
    "}",
    "如果评分证据不足，请在 notes 中说明，并尽量保留保守判断。"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildClarificationResult(input: EvaluationInput): BookAssistantResult {
  return {
    kind: "clarification",
    title: "需要补充书目信息",
    intro: "为了避免同名书混淆，我需要更多书目信息来做准确评价。",
    questions: [
      { id: "author", label: "这本书的作者是谁？" },
      { id: "isbn", label: "如果有 ISBN，请提供。" },
      { id: "edition", label: "如果你想看特定版本，请补充出版社或版次。" }
    ],
    styleProfile: resolveBookStyleProfile(input.styleProfile, input.title)
  };
}

export async function createEvaluationResult(input: EvaluationInput): Promise<BookAssistantResult> {
  if (input.title.trim().length < 2) {
    return buildClarificationResult(input);
  }

  const profile = resolveBookStyleProfile(input.styleProfile, [input.title, input.author, input.edition, input.focus].filter(Boolean).join(" "));
  const prompt = buildEvaluationPrompt(input, profile);
  const searchResult = await runSmartSearchSearch(prompt, {
    validation: "balanced",
    extraSources: 2,
    fallback: "off",
    format: "json",
    timeoutSeconds: 60
  });
  const evidence = await enrichEvidenceFromSearch(searchResult, 2);
  const parsed = parseStructuredResult(searchResult);

  const parsedScore = toNumber(parsed?.score, Number.NaN);
  const score = Number.isFinite(parsedScore) ? Math.max(0, Math.min(10, parsedScore)) : Number.NaN;
  const verdict = toString(parsed?.verdict, searchResult.rawText || "当前证据不足以形成完整评价。") || "当前证据不足以形成完整评价。";
  const pros = toStringArray(parsed?.pros, extractBulletLines(searchResult.rawText, 4));
  const cons = toStringArray(parsed?.cons, extractBulletLines(searchResult.rawText, 4));
  const bestFor = toStringArray(parsed?.bestFor, [input.focus ? `关注 ${input.focus} 的读者` : "希望快速了解书口碑的读者"]);
  const avoidIf = toStringArray(parsed?.avoidIf, ["不喜欢该题材或阅读风格的读者"]);
  const notes = [...toStringArray(parsed?.notes, []), ...summarizeEvidenceNotes(searchResult, 3)];
  const sources = collectStructuredEvidence(parsed?.sources ?? parsed?.evidence ?? []).length > 0 ? collectStructuredEvidence(parsed?.sources ?? parsed?.evidence ?? []) : evidence;
  const bookTitle = toString(parsed?.bookTitle, input.title);

  const result: EvaluationResult = {
    kind: "evaluation",
    title: toString(parsed?.title, `图书评价：${bookTitle}`),
    profile,
    bookTitle,
    author: toString(parsed?.author, input.author ?? "") || undefined,
    edition: toString(parsed?.edition, input.edition ?? "") || undefined,
    score,
    verdict,
    pros,
    cons,
    bestFor,
    avoidIf,
    sources: sources.slice(0, 8),
    notes: notes.length > 0 ? notes : ["当前评价主要基于公开网页证据与智能搜索综合整理。"]
  };

  return result;
}
