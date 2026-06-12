import type {
  BookAssistantResult,
  ClarificationQuestion,
  EvidenceSource,
  RecommendationItem,
  BookAssistantResult as RenderableBookResult
} from "../orchestrators/types.js";
import type { BookStyleProfile } from "../schemas/bookAssistantSchemas.js";

export type BookRenderTemplate = "landing-page" | "report" | "article" | "dashboard";
export type BookRenderTheme = "modern-blue" | "minimal-gray" | "warm-orange" | "dark-tech";

export type BookRenderSection =
  | {
      id: string;
      type: "hero";
      heading: string;
      subheading?: string;
    }
  | {
      id: string;
      type: "features" | "steps";
      heading: string;
      intro?: string;
      items: Array<{ title: string; body: string }>;
    }
  | {
      id: string;
      type: "content";
      heading: string;
      body: string;
    }
  | {
      id: string;
      type: "faq";
      heading: string;
      items: Array<{ question: string; answer: string }>;
    };

export interface BookRenderDocument {
  kind: RenderableBookResult["kind"];
  title: string;
  profile: BookStyleProfile;
  template: BookRenderTemplate;
  theme: BookRenderTheme;
  sections: BookRenderSection[];
}

function renderQuestionItems(questions: ClarificationQuestion[]): Array<{ title: string; body: string }> {
  return questions.map((question) => ({ title: question.label, body: question.id }));
}

function renderRecommendationItems(items: RecommendationItem[]): Array<{ title: string; body: string }> {
  return items.map((item) => ({
    title: `#${item.rank} ${item.title}${item.author ? ` · ${item.author}` : ""}`,
    body: [item.fit, item.reason, item.warning ? `提醒：${item.warning}` : "", item.tags.length ? `标签：${item.tags.join(" / ")}` : ""]
      .filter(Boolean)
      .join("\n")
  }));
}

function renderSourceItems(sources: EvidenceSource[]): Array<{ title: string; body: string }> {
  return sources.map((source) => ({
    title: source.title,
    body: [source.url, source.excerpt, source.confidence ? `置信度：${source.confidence}` : ""].filter(Boolean).join("\n")
  }));
}

function createDocument(
  result: BookAssistantResult,
  sections: BookRenderSection[],
  template: BookRenderTemplate = "report",
  theme: BookRenderTheme = "modern-blue"
): BookRenderDocument {
  return {
    kind: result.kind,
    title: result.title,
    profile: result.kind === "clarification" ? result.styleProfile : result.profile,
    template,
    theme,
    sections
  };
}

export function buildBookRenderDocument(result: BookAssistantResult): BookRenderDocument {
  switch (result.kind) {
    case "clarification":
      return createDocument(result, [
        { id: "hero", type: "hero", heading: result.title, subheading: result.intro },
        { id: "questions", type: "steps", heading: "需要补充的信息", items: renderQuestionItems(result.questions) }
      ], "article", "minimal-gray");
    case "recommendation":
      return createDocument(result, [
        { id: "hero", type: "hero", heading: result.title, subheading: result.summary },
        ...(result.items.length ? [{ id: "items", type: "features" as const, heading: "推荐书单", items: renderRecommendationItems(result.items) }] : []),
        ...(result.notes.length ? [{ id: "notes", type: "content" as const, heading: "补充说明", body: result.notes.join("\n") }] : []),
        ...(result.evidence.length ? [{ id: "sources", type: "features" as const, heading: "证据来源", items: renderSourceItems(result.evidence) }] : [])
      ]);
    case "summary":
      return createDocument(result, [
        { id: "hero", type: "hero", heading: result.bookTitle, subheading: result.overview },
        ...(result.keyPoints.length ? [{ id: "key-points", type: "steps" as const, heading: "关键要点", items: result.keyPoints.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.structure.length ? [{ id: "structure", type: "steps" as const, heading: "结构脉络", items: result.structure.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.audience.length ? [{ id: "audience", type: "steps" as const, heading: "适读人群", items: result.audience.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.notes.length ? [{ id: "notes", type: "content" as const, heading: "补充说明", body: result.notes.join("\n") }] : []),
        ...(result.sources.length ? [{ id: "sources", type: "features" as const, heading: "来源", items: renderSourceItems(result.sources) }] : [])
      ]);
    case "evaluation":
      return createDocument(result, [
        { id: "hero", type: "hero", heading: result.bookTitle, subheading: result.verdict },
        { id: "score", type: "content", heading: "评分", body: Number.isFinite(result.score) ? result.score.toFixed(1) : "-" },
        ...(result.pros.length ? [{ id: "pros", type: "steps" as const, heading: "优点", items: result.pros.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.cons.length ? [{ id: "cons", type: "steps" as const, heading: "不足", items: result.cons.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.bestFor.length ? [{ id: "best-for", type: "steps" as const, heading: "适合谁", items: result.bestFor.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.avoidIf.length ? [{ id: "avoid-if", type: "steps" as const, heading: "不建议给谁", items: result.avoidIf.map((text) => ({ title: text, body: "" })) }] : []),
        ...(result.notes.length ? [{ id: "notes", type: "content" as const, heading: "补充说明", body: result.notes.join("\n") }] : []),
        ...(result.sources.length ? [{ id: "sources", type: "features" as const, heading: "来源", items: renderSourceItems(result.sources) }] : [])
      ]);
  }
}

export function validateBookRenderDocument(document: BookRenderDocument): BookRenderDocument {
  if (!document.title.trim()) {
    throw new Error("渲染文档缺少标题");
  }

  if (document.sections.length === 0) {
    throw new Error("至少需要一个渲染分区");
  }

  for (const section of document.sections) {
    if (!section.heading.trim()) {
      throw new Error(`渲染分区缺少标题：${section.id}`);
    }
  }

  return document;
}
