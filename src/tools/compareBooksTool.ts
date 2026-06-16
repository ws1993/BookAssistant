import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { compareBooksInputSchema } from "../schemas/bookAssistantSchemas.js";
import { compareBooksInputSchema as jsonSchema } from "../toolSchemas/compareBooksInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createComparisonPackage } from "../orchestrators/bookComparison.js";
import { textContent } from "../server/toolResponse.js";

const parsedCompareBooksInputSchema = z.preprocess(normalizeToolArguments, compareBooksInputSchema);

export const compareBooksTool: BookAssistantTool = {
  name: "compare_books",
  description:
    "对比多本图书（2-5本），分析它们在主题、风格、难度、节奏等维度的差异，帮助用户在多本书之间做决策。返回证据包（含对比分析 + 来源 + 指导 + 页面骨架），用于生成包含 decision-matrix 表达式的结构化对比页面。",
  inputSchema: jsonSchema,
  async handle(args: unknown) {
    const input = parsedCompareBooksInputSchema.parse(args);
    const result = await createComparisonPackage(input);
    return textContent(result);
  }
};
