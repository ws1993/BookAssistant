export const compareBooksInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    books: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 1,
            description: "书名"
          },
          author: {
            type: "string",
            description: "作者"
          }
        },
        required: ["title"]
      },
      minItems: 2,
      maxItems: 5,
      description: "要对比的图书列表（2-5本）"
    },
    compareAspects: {
      type: "array",
      items: {
        type: "string"
      },
      description: "对比维度，例如：主题、写作风格、难度、节奏、长度、适合人群等。留空则自动选择"
    },
    focus: {
      type: "string",
      description: "对比重点，例如：哪本更适合入门、哪本更烧脑、哪本更轻松"
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
  required: ["books"]
} as const;
