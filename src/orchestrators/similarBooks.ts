import {
  needsBookIdentityClarification,
  type SimilarBooksInput
} from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { collectBookEvidence } from "./shared.js";
import { buildGuidancePackage } from "./guidance.js";
import type { BookAssistantPackage } from "./types.js";

function buildSimilarityFocusDescription(focus: SimilarBooksInput["similarityFocus"]): string {
  const focusMap: Record<NonNullable<typeof focus>, string> = {
    auto: "综合相似度（主题、风格、基调、读者群）",
    theme: "主题内容相似",
    style: "写作风格相似",
    mood: "情感基调和阅读感受相似",
    genre: "题材类型相似"
  };

  return focusMap[focus];
}

function buildSearchQueries(input: SimilarBooksInput): string[] {
  const bookIdentity = [
    input.title,
    input.author ? `作者${input.author}` : "",
    input.isbn ? `ISBN ${input.isbn}` : ""
  ]
    .filter(Boolean)
    .join("，");

  const focusDescription = buildSimilarityFocusDescription(input.similarityFocus);
  const avoidNote = input.avoidAuthor ? "，排除同一作者的其他作品" : "";
  const constraintsNote = input.constraints.length ? `，额外要求：${input.constraints.join("、")}` : "";

  const main = `推荐与《${input.title}》${input.author ? `（${input.author}）` : ""}相似的图书，${focusDescription}${avoidNote}${constraintsNote}。`;

  return [
    `${main}请给出${input.count}本书的书名、作者，并说明为什么与《${input.title}》相似。优先参考豆瓣读书、Goodreads的"喜欢这本书的人也喜欢"等公开推荐。`,
    `${bookIdentity} 这本书的读者画像、核心吸引力和典型评价是什么？`
  ];
}

export async function createSimilarBooksPackage(input: SimilarBooksInput): Promise<BookAssistantPackage> {
  const styleSeed = [input.title, input.author, input.similarityFocus, ...input.constraints].filter(Boolean).join(" ");
  const styleProfile = resolveBookStyleProfile(input.styleProfile, styleSeed);

  if (needsBookIdentityClarification(input.title, input.author, input.isbn)) {
    return {
      status: "needs_clarification",
      kind: "recommendation",
      title: "需要你补充参考书的信息",
      intro: `"${input.title}"这个书名太简短了，容易匹配到多本不同的书。为了精准推荐相似图书，请补充：`,
      questions: [
        { id: "author", label: "作者是谁？" },
        { id: "isbn", label: "ISBN 或出版社？（可选）" },
        { id: "context", label: "这本书的主要内容或类型？（帮助确认是哪本书）" }
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

  const focusLabel = buildSimilarityFocusDescription(input.similarityFocus);
  const { guidance, pageSkeleton } = buildGuidancePackage(
    "recommendation",
    `相似图书推荐：《${input.title}》（${focusLabel}）`,
    styleProfile
  );

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
