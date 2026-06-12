import { buildBookRenderDocument, validateBookRenderDocument } from "../renderers/bookRenderDocument.js";
import type { BookAssistantResult } from "../orchestrators/types.js";
import { renderBookAssistantHtml } from "../renderers/bookHtmlRenderer.js";
import { textContent, type TextToolResponse } from "../server/toolResponse.js";

export function presentBookAssistantResult(result: BookAssistantResult): TextToolResponse {
  validateBookRenderDocument(buildBookRenderDocument(result));
  return textContent(renderBookAssistantHtml(result));
}
