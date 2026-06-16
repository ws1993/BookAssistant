import {
  buildRecommendationClarificationQuestions,
  needsRecommendationClarification,
  type RecommendationInput
} from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { collectBookEvidence } from "./shared.js";
import { buildGuidancePackage } from "./guidance.js";
import type { BookAssistantPackage } from "./types.js";

function buildSearchQueries(input: RecommendationInput): string[] {
  const facets = [
    input.genre ? `题材：${input.genre}` : "",
    input.audience ? `读者：${input.audience}` : "",
    input.tone ? `风格：${input.tone}` : "",
    input.mood.length ? `心情：${input.mood.join("、")}` : "",
    input.pace ? `节奏：${input.pace === "slow" ? "慢节奏深度" : input.pace === "fast" ? "快节奏爽感" : "中等节奏"}` : "",
    input.readingLevel ? `难度：${input.readingLevel === "easy" ? "轻松入门" : input.readingLevel === "challenging" ? "深度烧脑" : "中等难度"}` : "",
    input.lengthPreference && input.lengthPreference !== "any" ? `长度：${input.lengthPreference === "short" ? "短篇" : input.lengthPreference === "long" ? "长篇" : "中篇"}` : "",
    input.contentWarningsToAvoid.length ? `避开敏感内容：${input.contentWarningsToAvoid.join("、")}` : "",
    input.constraints.length ? `要求：${input.constraints.join("、")}` : "",
    input.avoid.length ? `避开：${input.avoid.join("、")}` : ""
  ]
    .filter(Boolean)
    .join("，");

  const main = [`推荐${input.count}本图书`, input.query, facets].filter(Boolean).join("。");

  return [`${main}。请给出书名、作者，并参考豆瓣读书等公开书评说明推荐理由。`];
}

export async function createRecommendationPackage(input: RecommendationInput): Promise<BookAssistantPackage> {
  const styleSeed = [input.query, input.genre, input.audience, input.tone, ...input.constraints, ...input.avoid]
    .filter(Boolean)
    .join(" ");
  const styleProfile = resolveBookStyleProfile(input.styleProfile, styleSeed);

  if (needsRecommendationClarification(input)) {
    return {
      status: "needs_clarification",
      kind: "recommendation",
      title: "需要你补充一些图书偏好",
      intro: "当前需求还不够明确，我需要确认几个关键信息，才能给出更准确的图书推荐。",
      questions: buildRecommendationClarificationQuestions(),
      styleProfile
    };
  }

  const evidence = await collectBookEvidence(buildSearchQueries(input), {
    validation: "balanced",
    extraSources: 2,
    fallback: "off",
    format: "json",
    timeoutSeconds: 60
  });

  const { guidance, pageSkeleton } = buildGuidancePackage("recommendation", `图书推荐：${input.query}`, styleProfile);

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
