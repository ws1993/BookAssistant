import { assembleBookHtmlPage } from "./bookHtmlPageAssembler.js";
import { renderHtmlPage } from "./htmlPageRenderer.js";
import type { BookAssistantResult } from "../orchestrators/types.js";

export function renderBookAssistantHtml(result: BookAssistantResult): string {
  const assembled = assembleBookHtmlPage(result);
  return renderHtmlPage(assembled.page, assembled.renderOptions);
}
