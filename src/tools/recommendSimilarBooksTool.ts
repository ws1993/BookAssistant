import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { similarBooksInputSchema } from "../schemas/bookAssistantSchemas.js";
import { recommendSimilarBooksInputSchema } from "../toolSchemas/recommendSimilarBooksInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createSimilarBooksPackage } from "../orchestrators/similarBooks.js";
import { textContent } from "../server/toolResponse.js";

const parsedSimilarBooksInputSchema = z.preprocess(normalizeToolArguments, similarBooksInputSchema);

export const recommendSimilarBooksTool: BookAssistantTool = {
  name: "recommend_similar_books",
  description:
    "Layer 1 (evidence collection) of the book assistant pipeline for similar book recommendations. Use this when the user provides a specific book and wants to find similar ones (e.g., 'books like The Three-Body Problem', 'similar to Harry Potter', '喜欢《三体》还会喜欢什么'). It runs smart-search over public sources (Douban '喜欢这本书的人也喜欢', Goodreads 'Readers also enjoyed', reviews, lists) and returns an evidence package (synthesized digest + sources + guidance + page skeleton) for YOU to turn into a book page; it does NOT render anything. Supports similarity focus: theme, style, mood, or genre. If the reference book identity is ambiguous (too short title, no author/ISBN), it returns clarification questions to ask first. Next step after this: draft a page object and call compose_book_page.",
  inputSchema: recommendSimilarBooksInputSchema,
  async handle(args: unknown) {
    const input = parsedSimilarBooksInputSchema.parse(args);
    const result = await createSimilarBooksPackage(input);
    return textContent(result);
  }
};
