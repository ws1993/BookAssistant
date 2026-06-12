export const renderBookHtmlInputSchema = {
  type: "object",
  properties: {
    page: {
      type: "object",
      description:
        "The validated book page object (same shape compose_book_page accepts and returns under normalizedArguments.page). Call this only after compose_book_page reports readyToRender: true.",
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
    }
  },
  required: ["page"]
} as const;
