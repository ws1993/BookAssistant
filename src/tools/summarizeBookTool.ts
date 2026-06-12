import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { summaryInputSchema } from "../schemas/bookAssistantSchemas.js";
import { summarizeBookInputSchema } from "../toolSchemas/summarizeBookInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createSummaryPackage } from "../orchestrators/bookSummary.js";
import { textContent } from "../server/toolResponse.js";

const parsedSummaryInputSchema = z.preprocess(normalizeToolArguments, summaryInputSchema);

export const summarizeBookTool: BookAssistantTool = {
  name: "summarize_book",
  description:
    "Layer 1 of the book assistant pipeline: gather public evidence to summarize a specific book. Use this when the user wants a concise or structured summary, with optional spoiler control and focus areas. It runs smart-search and returns an evidence package (evidenceDigest + sources + a page skeleton), NOT a finished summary. After this, draft a `page` object from the evidence and call compose_book_page, then render_book_html. If the book identity is ambiguous, it returns clarification questions to ask the user first.",
  inputSchema: summarizeBookInputSchema,
  async handle(args: unknown) {
    const input = parsedSummaryInputSchema.parse(args);
    const result = await createSummaryPackage(input);
    return textContent(result);
  }
};
