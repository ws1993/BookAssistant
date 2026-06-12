import { adaptBookRenderDocumentToHtmlPage } from "./bookRenderHtmlPageAdapter.js";
import { buildBookRenderDocument, type BookRenderDocument, validateBookRenderDocument } from "./bookRenderDocument.js";
import type { HtmlPageRenderOptions } from "./htmlPageRenderer.js";
import type { BookAssistantResult } from "../orchestrators/types.js";
import type { HtmlPageInput } from "../schemas/htmlPageSchema.js";
import { resolveBookTheme } from "../styles/bookThemes.js";

export interface BookHtmlPageAssembly {
  page: HtmlPageInput;
  renderOptions: HtmlPageRenderOptions;
}

function resolveBadgeLabel(kind: BookRenderDocument["kind"]): string {
  switch (kind) {
    case "clarification":
      return "需要补充信息";
    case "recommendation":
      return "图书推荐";
    case "summary":
      return "图书总结";
    case "evaluation":
      return "图书评价";
  }
}

export function assembleBookHtmlPage(result: BookAssistantResult): BookHtmlPageAssembly {
  const document = validateBookRenderDocument(buildBookRenderDocument(result));
  const page = adaptBookRenderDocumentToHtmlPage(document);
  const theme = resolveBookTheme(document.profile, document.title);

  return {
    page,
    renderOptions: {
      attributes: { "data-book-assistant": document.kind },
      heroBadge: { text: resolveBadgeLabel(document.kind), background: theme.primarySoft, color: theme.primary },
      theme
    }
  };
}
