import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { renderBookAssistantHtml } from "../renderers/bookHtmlRenderer.js";
import { recommendationInputSchema } from "../schemas/bookAssistantSchemas.js";
import { textContent } from "../server/toolResponse.js";
import { recommendBooksInputSchema } from "../toolSchemas/recommendBooksInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createRecommendationResult } from "../orchestrators/bookRecommendation.js";

const parsedRecommendationInputSchema = z.preprocess(normalizeToolArguments, recommendationInputSchema);

export const recommendBooksTool: BookAssistantTool = {
  name: "recommend_books",
  description:
    "Recommend books based on the user's reading needs. Use this when the user describes genre, mood, audience, constraints, or a topic and wants a short list of relevant books. If the request is too vague, ask clarifying questions before recommending.",
  inputSchema: recommendBooksInputSchema,
  async handle(args: unknown) {
    const input = parsedRecommendationInputSchema.parse(args);
    const result = await createRecommendationResult(input);
    return textContent(renderBookAssistantHtml(result));
  }
};

