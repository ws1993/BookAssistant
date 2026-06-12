import type { BookAssistantResult } from "../orchestrators/types.js";
import { renderBookAssistantHtml } from "../renderers/bookHtmlRenderer.js";
import { textContent, type TextToolResponse } from "../server/toolResponse.js";

export function presentBookAssistantResult(result: BookAssistantResult): TextToolResponse {
  return textContent(renderBookAssistantHtml(result));
}
