import { z } from "zod";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { generateBooklistInputSchema } from "../schemas/bookAssistantSchemas.js";
import { generateBooklistInputSchema as jsonSchema } from "../toolSchemas/generateBooklistInputSchema.js";
import type { BookAssistantTool } from "./types.js";
import { createBooklistPackage } from "../orchestrators/bookBooklist.js";
import { textContent } from "../server/toolResponse.js";

const parsedGenerateBooklistInputSchema = z.preprocess(normalizeToolArguments, generateBooklistInputSchema);

export const generateBooklistTool: BookAssistantTool = {
  name: "generate_booklist",
  description:
    "生成主题书单（3-15本书），支持从易到难、按主题分类、按时间顺序等多种组织方式。适合系统化学习路径、入门指南、专题阅读等场景。返回证据包，用于生成包含 ranked-list 或 section-outline 表达式的结构化书单页面。",
  inputSchema: jsonSchema,
  async handle(args: unknown) {
    const input = parsedGenerateBooklistInputSchema.parse(args);
    const result = await createBooklistPackage(input);
    return textContent(result);
  }
};
