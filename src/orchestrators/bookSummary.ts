import { needsBookIdentityClarification, type SummaryInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { collectBookEvidence } from "./shared.js";
import { buildGuidancePackage } from "./guidance.js";
import type { BookAssistantPackage } from "./types.js";

function buildSearchQueries(input: SummaryInput): string[] {
  const identity = [input.title, input.author ? `作者${input.author}` : "", input.edition ?? "", input.isbn ? `ISBN ${input.isbn}` : ""]
    .filter(Boolean)
    .join(" ");
  const focus = input.focus ? `，重点说明${input.focus}` : "";
  const spoiler =
    input.spoilerPolicy === "full"
      ? "可以包含剧透。"
      : input.spoilerPolicy === "balanced"
        ? "可包含适度剧透，但避免揭晓关键结局。"
        : "尽量无剧透。";

  return [
    `《${identity}》这本书讲了什么？请概述核心内容、结构脉络与适读人群${focus}。${spoiler}参考豆瓣读书等公开来源。`
  ];
}

export async function createSummaryPackage(input: SummaryInput): Promise<BookAssistantPackage> {
  const styleSeed = [input.title, input.author, input.edition, input.focus].filter(Boolean).join(" ");
  const styleProfile = resolveBookStyleProfile(input.styleProfile, styleSeed);

  if (needsBookIdentityClarification(input.title, input.author, input.isbn)) {
    return {
      status: "needs_clarification",
      kind: "summary",
      title: "需要补充书目信息",
      intro: "这本书的身份还不够明确，我需要书名、作者、ISBN 或版本信息中的更多线索，避免混淆同名书。",
      questions: [
        { id: "author", label: "这本书的作者是谁？" },
        { id: "isbn", label: "如果有 ISBN，请提供。" },
        { id: "edition", label: "如果你想看特定版本，请补充出版社或版次。" }
      ],
      styleProfile
    };
  }

  const evidence = await collectBookEvidence(buildSearchQueries(input), {
    validation: "fast",
    extraSources: 0,
    fallback: "off",
    format: "json",
    timeoutSeconds: 25
  });

  const { guidance, pageSkeleton } = buildGuidancePackage("summary", `图书总结：${input.title}`, styleProfile);

  return {
    status: "evidence_collected",
    kind: "summary",
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
