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
  mood: optionalTextList.describe("期望的情感氛围或阅读心情，例如轻松、治愈、悬疑、烧脑、励志"),
  pace: z.enum(["slow", "medium", "fast"]).optional().describe("阅读节奏偏好：slow慢节奏深度、medium中等、fast快节奏爽感"),
  readingLevel: z.enum(["easy", "moderate", "challenging"]).optional().describe("阅读难度偏好：easy轻松入门、moderate中等、challenging深度烧脑"),
  lengthPreference: z.enum(["short", "medium", "long", "any"]).optional().describe("长度偏好：short短篇、medium中篇、long长篇、any不限"),
  contentWarningsToAvoid: optionalTextList.describe("要避开的敏感内容，例如暴力、性描写、心理创伤、虐待"),
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
  spoilerLevel: z
    .enum(["none", "light", "full"])
    .default("light")
    .describe("剧透程度：none无剧透仅背景、light适度剧透到中段、full完整剧透含结局"),
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

export const similarBooksInputSchema = z.object({
  title: nonEmptyText.describe("参考书的书名"),
  author: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
  similarityFocus: z
    .enum(["auto", "theme", "style", "mood", "genre"])
    .default("auto")
    .describe("相似度关注点：auto自动、theme主题、style写作风格、mood情感基调、genre题材类型"),
  count: z.number().int().min(1).max(10).default(5),
  avoidAuthor: z.boolean().default(false).describe("是否避开同一作者的其他作品"),
  constraints: optionalTextList.describe("额外约束条件"),
  language: z.string().trim().default("zh-CN"),
  styleProfile: bookStyleProfileSchema.default("auto")
});

export const compareBooksInputSchema = z.object({
  books: z
    .array(
      z.object({
        title: nonEmptyText.describe("书名"),
        author: z.string().trim().optional()
      })
    )
    .min(2, "至少需要2本书进行对比")
    .max(5, "最多对比5本书"),
  compareAspects: optionalTextList.describe("对比维度，例如：主题、写作风格、难度、节奏、长度、适合人群"),
  focus: z.string().trim().optional().describe("对比重点，例如：哪本更适合入门、哪本更烧脑"),
  language: z.string().trim().default("zh-CN"),
  styleProfile: bookStyleProfileSchema.default("auto")
});

export const generateBooklistInputSchema = z.object({
  theme: nonEmptyText.describe("书单主题，例如：科幻入门、女性成长、商业思维"),
  count: z.number().int().min(3).max(15).default(5).describe("书单中的图书数量"),
  progression: z
    .enum(["beginner-to-advanced", "thematic", "chronological", "auto"])
    .default("auto")
    .describe("组织方式：beginner-to-advanced从易到难、thematic按主题、chronological按时间"),
  targetAudience: z.string().trim().optional().describe("目标读者"),
  focus: z.string().trim().optional().describe("重点关注"),
  language: z.string().trim().default("zh-CN"),
  styleProfile: bookStyleProfileSchema.default("auto")
});

export type BookStyleProfile = z.infer<typeof bookStyleProfileSchema>;
export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type SummaryInput = z.infer<typeof summaryInputSchema>;
export type EvaluationInput = z.infer<typeof evaluationInputSchema>;
export type SimilarBooksInput = z.infer<typeof similarBooksInputSchema>;
export type CompareBooksInput = z.infer<typeof compareBooksInputSchema>;
export type GenerateBooklistInput = z.infer<typeof generateBooklistInputSchema>;

export interface ClarificationQuestion {
  id: string;
  label: string;
}

export function needsRecommendationClarification(input: RecommendationInput): boolean {
  const signalCount = [
    input.audience,
    input.genre,
    input.tone,
    input.mood.length,
    input.pace,
    input.readingLevel,
    input.lengthPreference,
    input.contentWarningsToAvoid.length,
    input.constraints.length,
    input.avoid.length
  ]
    .map((value) => (typeof value === "number" ? value : value ? 1 : 0))
    .reduce((sum, value) => sum + value, 0);

  return input.query.length < 10 || signalCount === 0;
}

export function buildRecommendationClarificationQuestions(): ClarificationQuestion[] {
  return [
    { id: "genre", label: "你更想要哪类书：悬疑、网文、小说、非虚构、历史、商业、科普、专业书？" },
    { id: "mood", label: "你现在的阅读心情：轻松治愈、悬疑烧脑、励志向上、压抑沉重、还是欢快爽感？" },
    { id: "pace", label: "节奏偏好：慢节奏深度阅读、中等节奏、还是快节奏爽文？" },
    { id: "readingLevel", label: "难度偏好：轻松入门、中等难度、还是深度烧脑？" },
    { id: "audience", label: "这本书主要给谁读：学生、上班族、资深读者、轻阅读用户、特定年龄段？" },
    { id: "contentWarningsToAvoid", label: "有没有要避开的敏感内容：暴力、性描写、心理创伤、自杀、虐待等？" },
    { id: "constraints", label: "有没有必须满足的条件：完结、短篇、女性向、中文、最近出版？" }
  ];
}

export function needsBookIdentityClarification(title: string, author?: string, isbn?: string): boolean {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length < 2) {
    return true;
  }

  return normalizedTitle.length < 4 && !author && !isbn;
}

