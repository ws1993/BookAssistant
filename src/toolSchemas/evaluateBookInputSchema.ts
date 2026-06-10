export const evaluateBookInputSchema = {
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
    focus: {
      type: "string",
      description: "评价重点，例如口碑、爽感、知识密度、文学性、实用性"
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
