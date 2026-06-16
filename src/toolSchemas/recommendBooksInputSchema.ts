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
    mood: {
      type: "array",
      items: { type: "string" },
      description: "期望的情感氛围或阅读心情，例如轻松、治愈、悬疑、烧脑、励志、压抑、欢快"
    },
    pace: {
      type: "string",
      enum: ["slow", "medium", "fast"],
      description: "阅读节奏偏好：slow慢节奏深度阅读、medium中等节奏、fast快节奏爽感"
    },
    readingLevel: {
      type: "string",
      enum: ["easy", "moderate", "challenging"],
      description: "阅读难度偏好：easy轻松入门、moderate中等难度、challenging深度烧脑"
    },
    lengthPreference: {
      type: "string",
      enum: ["short", "medium", "long", "any"],
      description: "长度偏好：short短篇快读、medium中篇、long长篇史诗、any不限"
    },
    contentWarningsToAvoid: {
      type: "array",
      items: { type: "string" },
      description: "要避开的敏感内容，例如暴力、性描写、心理创伤、自杀、虐待、歧视"
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
