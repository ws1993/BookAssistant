import { type EvaluationInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { collectBookEvidence } from "./shared.js";
import { buildGuidancePackage } from "./guidance.js";
import type { BookAssistantPackage } from "./types.js";

function buildSearchQueries(input: EvaluationInput): string[] {
  const identity = [input.title, input.author ? `作者${input.author}` : "", input.edition ?? "", input.isbn ? `ISBN ${input.isbn}` : ""]
    .filter(Boolean)
    .join(" ");
  const focus = input.focus ? `，重点评估${input.focus}` : "";

  return [
    `《${identity}》这本书的评价怎么样？请汇总公开评分、优点、不足与适合/不适合的读者${focus}。参考豆瓣读书、Goodreads 等公开评分与书评。`
  ];
}

export async function createEvaluationPackage(input: EvaluationInput): Promise<BookAssistantPackage> {
  const styleSeed = [input.title, input.author, input.edition, input.focus].filter(Boolean).join(" ");
  const styleProfile = resolveBookStyleProfile(input.styleProfile, styleSeed);

  if (input.title.trim().length < 2) {
    return {
      status: "needs_clarification",
      kind: "evaluation",
      title: "需要补充书目信息",
      intro: "为了避免同名书混淆，我需要更多书目信息来做准确评价。",
      questions: [
        { id: "author", label: "这本书的作者是谁？" },
        { id: "isbn", label: "如果有 ISBN，请提供。" },
        { id: "edition", label: "如果你想看特定版本，请补充出版社或版次。" }
      ],
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

  const { guidance, pageSkeleton } = buildGuidancePackage("evaluation", `图书评价：${input.title}`, styleProfile);

  return {
    status: "evidence_collected",
    kind: "evaluation",
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
