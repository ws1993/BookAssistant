export const composeBookPageInputSchema = {
  type: "object",
  properties: {
    page: {
      type: "object",
      description:
        "The book page object drafted from gathered evidence. Shape: { kind: 'recommendation'|'summary'|'evaluation', title, styleProfile?, expression?: { coreViewpoint?, keyTakeaways?[] }, expressions?[], sources?[] }. Prefer passing a native object over a JSON string.",
      properties: {
        kind: { type: "string", enum: ["recommendation", "summary", "evaluation"] },
        title: { type: "string" },
        description: { type: "string" },
        styleProfile: {
          type: "string",
          enum: [
            "auto",
            "literary-classic",
            "web-fiction",
            "knowledge-nonfiction",
            "academic-professional",
            "youth-light"
          ]
        },
        expression: { type: "object" },
        expressions: { type: "array", items: { type: "object" } },
        sources: { type: "array", items: { type: "object" } },
        footer: { type: "object" }
      },
      required: ["kind", "title"]
    },
    dryRun: {
      type: "boolean",
      description: "Set to false to skip the trial render. Defaults to true."
    }
  },
  required: ["page"]
} as const;
