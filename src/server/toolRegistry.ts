import { evaluateBookTool } from "../tools/evaluateBookTool.js";
import { recommendBooksTool } from "../tools/recommendBooksTool.js";
import { summarizeBookTool } from "../tools/summarizeBookTool.js";
import type { BookAssistantTool } from "../tools/types.js";

const disabledToolsMessage =
  "This MCP server exposes recommend_books, summarize_book, and evaluate_book for book discovery, summary, and evaluation workflows.";

export const bookAssistantTools: BookAssistantTool[] = [recommendBooksTool, summarizeBookTool, evaluateBookTool];

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
