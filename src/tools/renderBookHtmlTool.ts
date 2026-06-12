import { parseJsonString } from "../adapters/parseJsonString.js";
import { renderBookHtml } from "../renderers/book/renderBookHtml.js";
import { renderBookHtmlInputSchema } from "../toolSchemas/renderBookHtmlInputSchema.js";
import { textContent } from "../server/toolResponse.js";
import type { BookAssistantTool } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPage(args: unknown): unknown {
  const root = parseJsonString(args, "arguments");

  if (!isRecord(root)) {
    return root;
  }

  if ("page" in root) {
    return parseJsonString(root.page, "page");
  }

  if (isRecord(root.params) && "page" in root.params) {
    return parseJsonString(root.params.page, "page");
  }

  return root;
}

export const renderBookHtmlTool: BookAssistantTool = {
  name: "render_book_html",
  description:
    "Render a validated book page object into a single continuous inline-styled HTML fragment for Cherry Studio. Layer 3 (final) of the book assistant pipeline. Call this only once, after compose_book_page reports readyToRender: true; pass the normalized page it returned. The output uses a book-specific visual theme chosen from styleProfile (literary-classic / web-fiction / knowledge-nonfiction / academic-professional / youth-light, or auto).",
  inputSchema: renderBookHtmlInputSchema,
  async handle(args: unknown) {
    const page = extractPage(args);
    const html = renderBookHtml(page as never);
    return textContent(html);
  }
};
