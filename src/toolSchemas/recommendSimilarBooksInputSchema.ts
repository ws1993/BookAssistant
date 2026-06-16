export const recommendSimilarBooksInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      minLength: 1,
      description: "参考书的书名"
    },
    author: {
      type: "string",
      description: "参考书的作者，提供可以提升准确性"
    },
    isbn: {
      type: "string",
      description: "ISBN，可确保精确匹配特定版本"
    },
    similarityFocus: {
      type: "string",
      enum: ["auto", "theme", "style", "mood", "genre"],
      default: "auto",
      description: "相似度关注点：auto自动判断、theme主题内容、style写作风格、mood情感基调、genre题材类型"
    },
    count: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      default: 5,
      description: "推荐数量"
    },
    avoidAuthor: {
      type: "boolean",
      default: false,
      description: "是否排除同一作者的其他作品"
    },
    constraints: {
      type: "array",
      items: { type: "string" },
      description: "额外约束条件，例如语言、年代、长度等"
    },
    language: {
      type: "string",
      default: "zh-CN"
    },
    styleProfile: {
      type: "string",
      enum: ["auto", "literary-classic", "web-fiction", "knowledge-nonfiction", "academic-professional", "youth-light"],
      default: "auto"
    }
  },
  required: ["title"]
} as const;
