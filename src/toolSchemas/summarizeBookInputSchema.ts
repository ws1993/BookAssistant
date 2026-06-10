export const summarizeBookInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      minLength: 1,
      description: "书名"
    },
    author: {
      type: "string",
      description: "作者"
    },
    isbn: {
      type: "string",
      description: "ISBN"
    },
    edition: {
      type: "string",
      description: "版本或出版社信息"
    },
    spoilerPolicy: {
      type: "string",
      enum: ["safe", "balanced", "full"],
      default: "safe"
    },
    focus: {
      type: "string",
      description: "希望总结的重点，例如情节、结构、人物、观点、方法"
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
