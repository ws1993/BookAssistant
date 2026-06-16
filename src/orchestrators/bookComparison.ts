import { type CompareBooksInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { collectBookEvidence } from "./shared.js";
import { buildGuidancePackage } from "./guidance.js";
import type { BookAssistantPackage } from "./types.js";

function buildSearchQueries(input: CompareBooksInput): string[] {
  const bookList = input.books.map((b) => `《${b.title}》${b.author ? `（${b.author}）` : ""}`).join("、");
  const aspects = input.compareAspects.length > 0 ? input.compareAspects.join("、") : "主题、写作风格、难度、节奏、长度、适合人群";
  const focus = input.focus ? `，重点分析${input.focus}` : "";

  return [
    `请对比这几本书：${bookList}。
对比维度：${aspects}。
对每个维度，说明各本书的特点、差异和相对优劣${focus}。
给出具体的推荐建议：什么样的读者适合哪本书。
参考豆瓣读书、Goodreads等公开来源的评价和对比讨论。`
  ];
}

export async function createComparisonPackage(input: CompareBooksInput): Promise<BookAssistantPackage> {
  const styleSeed = input.books.map((b) => b.title).join(" ");
  const styleProfile = resolveBookStyleProfile(input.styleProfile, styleSeed);

  if (input.books.length < 2) {
    return {
      status: "needs_clarification",
      kind: "recommendation",
      title: "需要至少2本书",
      intro: "对比功能需要至少2本书，最多5本。请提供更多书目信息。",
      questions: [{ id: "books", label: "请补充要对比的书名（可以包含作者）" }],
      styleProfile
    };
  }

  const evidence = await collectBookEvidence(buildSearchQueries(input), {
    validation: "balanced",
    extraSources: 1,
    fallback: "off",
    format: "json",
    timeoutSeconds: 45
  });

  const { guidance, pageSkeleton } = buildGuidancePackage("recommendation", `图书对比：${input.books.map((b) => b.title).join(" vs ")}`, styleProfile);

  return {
    status: "evidence_collected",
    kind: "recommendation",
    task: { ...input },
    styleProfile,
    searchOk: evidence.ok,
    searchError: evidence.error,
    evidenceDigest: evidence.digest,
    sources: evidence.sources,
    guidance,
    pageSkeleton,
    nextAction: "draft_page_then_call_compose_book_page"
  };
}
