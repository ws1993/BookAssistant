export const generateBooklistInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    theme: {
      type: "string",
      minLength: 1,
      description: "书单主题，例如：科幻入门、女性成长、商业思维、心理学经典等"
    },
    count: {
      type: "number",
      minimum: 3,
      maximum: 15,
      default: 5,
      description: "书单中的图书数量（3-15本）"
    },
    progression: {
      type: "string",
      enum: ["beginner-to-advanced", "thematic", "chronological", "auto"],
      default: "auto",
      description: "书单组织方式：beginner-to-advanced从易到难、thematic按主题分类、chronological按时间顺序、auto自动选择"
    },
    targetAudience: {
      type: "string",
      description: "目标读者，例如：初学者、专业人士、青少年、通识读者等"
    },
    focus: {
      type: "string",
      description: "重点关注，例如：理论基础、实践应用、历史发展、当代趋势等"
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
  required: ["theme"]
} as const;
