import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { evaluationInputSchema } from "../schemas/bookAssistantSchemas.js";
import { evaluateBookInputSchema } from "../toolSchemas/evaluateBookInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createEvaluationPackage } from "../orchestrators/bookEvaluation.js";
import { textContent } from "../server/toolResponse.js";

const parsedEvaluationInputSchema = z.preprocess(normalizeToolArguments, evaluationInputSchema);

export const evaluateBookTool: BookAssistantTool = {
  name: "evaluate_book",
  description:
    "Layer 1 of the book assistant pipeline: gather public evidence (ratings, reviews, comparisons) to evaluate a specific book. Use this when the user wants a verdict, score, pros and cons, or reader-fit assessment. It runs smart-search and returns an evidence package (evidenceDigest + sources + a page skeleton), NOT a finished verdict. After this, draft a `page` object from the evidence and call compose_book_page, then render_book_html. If the book identity is ambiguous, it returns clarification questions to ask the user first.",
  inputSchema: evaluateBookInputSchema,
  async handle(args: unknown) {
    const input = parsedEvaluationInputSchema.parse(args);
    const result = await createEvaluationPackage(input);
    return textContent(result);
  }
};
