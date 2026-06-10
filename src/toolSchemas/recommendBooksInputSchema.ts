export const recommendBooksInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      minLength: 1,
      description: "用户的图书需求描述，例如题材、风格、阅读目的或雷点"
    },
    audience: {
      type: "string",
      description: "目标读者或适合人群"
    },
    genre: {
      type: "string",
      description: "题材或类型，例如悬疑、网文、历史、科普、专业书"
    },
    tone: {
      type: "string",
      description: "想要的阅读风格，例如爽感、烧脑、治愈、严肃、轻松"
    },
    constraints: {
      type: "array",
      items: { type: "string" },
      description: "必须满足的条件，例如篇幅、完结状态、语言、年龄段"
    },
    avoid: {
      type: "array",
      items: { type: "string" },
      description: "不想要的元素、题材或雷点"
    },
    count: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      default: 3,
      description: "推荐数量"
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
  required: ["query"]
} as const;
