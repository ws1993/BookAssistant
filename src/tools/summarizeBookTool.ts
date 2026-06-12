import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { summaryInputSchema } from "../schemas/bookAssistantSchemas.js";
import { summarizeBookInputSchema } from "../toolSchemas/summarizeBookInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createSummaryResult } from "../orchestrators/bookSummary.js";
import { presentBookAssistantResult } from "./presentBookAssistantResult.js";

const parsedSummaryInputSchema = z.preprocess(normalizeToolArguments, summaryInputSchema);

export const summarizeBookTool: BookAssistantTool = {
  name: "summarize_book",
  description:
    "Summarize a specific book using public sources. Use this when the user wants a concise or structured summary, with optional spoiler control and focus areas.",
  inputSchema: summarizeBookInputSchema,
  async handle(args: unknown) {
    const input = parsedSummaryInputSchema.parse(args);
    const result = await createSummaryResult(input);
    return presentBookAssistantResult(result);
  }
};

