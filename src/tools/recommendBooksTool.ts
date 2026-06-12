import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { recommendationInputSchema } from "../schemas/bookAssistantSchemas.js";
import { recommendBooksInputSchema } from "../toolSchemas/recommendBooksInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createRecommendationPackage } from "../orchestrators/bookRecommendation.js";
import { textContent } from "../server/toolResponse.js";

const parsedRecommendationInputSchema = z.preprocess(normalizeToolArguments, recommendationInputSchema);

export const recommendBooksTool: BookAssistantTool = {
  name: "recommend_books",
  description:
    "Layer 1 (evidence collection) of the book assistant pipeline. Use this when the user describes genre, mood, audience, constraints, or a topic and wants a short list of books. It runs smart-search over public sources and returns an evidence package (synthesized digest + sources + guidance + page skeleton) for YOU to turn into a book page; it does NOT render anything. If the request is too vague it returns clarification questions to ask first. Next step after this: draft a page object and call compose_book_page.",
  inputSchema: recommendBooksInputSchema,
  async handle(args: unknown) {
    const input = parsedRecommendationInputSchema.parse(args);
    const result = await createRecommendationPackage(input);
    return textContent(result);
  }
};
