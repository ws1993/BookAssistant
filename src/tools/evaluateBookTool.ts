import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { evaluationInputSchema } from "../schemas/bookAssistantSchemas.js";
import { evaluateBookInputSchema } from "../toolSchemas/evaluateBookInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createEvaluationResult } from "../orchestrators/bookEvaluation.js";
import { presentBookAssistantResult } from "./presentBookAssistantResult.js";

const parsedEvaluationInputSchema = z.preprocess(normalizeToolArguments, evaluationInputSchema);

export const evaluateBookTool: BookAssistantTool = {
  name: "evaluate_book",
  description:
    "Evaluate a specific book with public evidence such as ratings, reviews, and comparisons. Use this when the user wants a verdict, score, pros and cons, or reader fit assessment.",
  inputSchema: evaluateBookInputSchema,
  async handle(args: unknown) {
    const input = parsedEvaluationInputSchema.parse(args);
    const result = await createEvaluationResult(input);
    return presentBookAssistantResult(result);
  }
};

