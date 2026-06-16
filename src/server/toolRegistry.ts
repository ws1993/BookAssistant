import { evaluateBookTool } from "../tools/evaluateBookTool.js";
import { recommendBooksTool } from "../tools/recommendBooksTool.js";
import { recommendSimilarBooksTool } from "../tools/recommendSimilarBooksTool.js";
import { compareBooksTool } from "../tools/compareBooksTool.js";
import { generateBooklistTool } from "../tools/generateBooklistTool.js";
import { summarizeBookTool } from "../tools/summarizeBookTool.js";
import { composeBookPageTool } from "../tools/composeBookPageTool.js";
import { renderBookHtmlTool } from "../tools/renderBookHtmlTool.js";
import type { BookAssistantTool } from "../tools/types.js";

const disabledToolsMessage =
  "This MCP server exposes a 3-layer book workflow: recommend_books / recommend_similar_books / compare_books / generate_booklist / summarize_book / evaluate_book (gather public evidence), compose_book_page (validate + dry-run a page object), and render_book_html (final inline HTML).";

export const bookAssistantTools: BookAssistantTool[] = [
  recommendBooksTool,
  recommendSimilarBooksTool,
  compareBooksTool,
  generateBooklistTool,
  summarizeBookTool,
  evaluateBookTool,
  composeBookPageTool,
  renderBookHtmlTool
];

export function listToolDefinitions(): Array<Pick<BookAssistantTool, "name" | "description" | "inputSchema">> {
  return bookAssistantTools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema
  }));
}

export function getToolByName(name: string): BookAssistantTool | undefined {
  return bookAssistantTools.find((tool) => tool.name === name);
}

export function createDisabledToolError(name: string): Error {
  return new Error(`Tool ${name} is disabled. ${disabledToolsMessage}`);
}
