import { z } from "zod";

export const bookStyleProfiles = [
  "auto",
  "literary-classic",
  "web-fiction",
  "knowledge-nonfiction",
  "academic-professional",
  "youth-light"
] as const;

export const bookStyleProfileSchema = z.enum(bookStyleProfiles);

const nonEmptyText = z.string().trim().min(1);
const optionalTextList = z.array(nonEmptyText).default([]);

export const recommendationInputSchema = z.object({
  query: nonEmptyText.describe("用户的图书需求描述，例如题材、风格、阅读目的或雷点"),
  audience: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  tone: z.string().trim().optional(),
  constraints: optionalTextList.describe("必须满足的条件，例如篇幅、完结状态、语言、年龄段"),
  avoid: optionalTextList.describe("不想要的元素、题材或雷点"),
  count: z.number().int().min(1).max(10).default(3),
  language: z.string().trim().default("zh-CN"),
  styleProfile: bookStyleProfileSchema.default("auto")
});

export const summaryInputSchema = z.object({
  title: nonEmptyText.describe("书名"),
  author: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
  edition: z.string().trim().optional(),
  spoilerPolicy: z.enum(["safe", "balanced", "full"]).default("safe"),
  focus: z.string().trim().optional(),
  language: z.string().trim().default("zh-CN"),
  styleProfile: bookStyleProfileSchema.default("auto")
});

export const evaluationInputSchema = z.object({
  title: nonEmptyText.describe("书名"),
  author: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
  edition: z.string().trim().optional(),
  focus: z.string().trim().optional(),
  language: z.string().trim().default("zh-CN"),
  styleProfile: bookStyleProfileSchema.default("auto")
});

export type BookStyleProfile = z.infer<typeof bookStyleProfileSchema>;
export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type SummaryInput = z.infer<typeof summaryInputSchema>;
export type EvaluationInput = z.infer<typeof evaluationInputSchema>;

export interface ClarificationQuestion {
  id: string;
  label: string;
}

export function needsRecommendationClarification(input: RecommendationInput): boolean {
  const signalCount = [input.audience, input.genre, input.tone, input.constraints.length, input.avoid.length]
    .map((value) => (typeof value === "number" ? value : value ? 1 : 0))
    .reduce((sum, value) => sum + value, 0);

  return input.query.length < 10 || signalCount === 0;
}

export function buildRecommendationClarificationQuestions(): ClarificationQuestion[] {
  return [
    { id: "genre", label: "你更想要哪类书：悬疑、网文、小说、非虚构、历史、商业、科普、专业书？" },
    { id: "audience", label: "这本书主要给谁读：学生、上班族、资深读者、轻阅读用户、特定年龄段？" },
    { id: "tone", label: "你希望偏什么风格：爽感、治愈、黑暗、严肃、轻松、烧脑、节奏快？" },
    { id: "constraints", label: "有没有必须满足的条件：完结、短篇、女性向、中文、最近出版、不要太虐？" }
  ];
}

export function needsBookIdentityClarification(title: string, author?: string, isbn?: string): boolean {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length < 2) {
    return true;
  }

  return normalizedTitle.length < 4 && !author && !isbn;
}

