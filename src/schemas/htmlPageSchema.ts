import { z } from "zod";

export const htmlPageTemplateSchema = z.enum(["landing-page", "report", "article", "dashboard"]);
export const htmlPageThemeSchema = z.enum(["modern-blue", "minimal-gray", "warm-orange", "dark-tech"]);

const titledBodyItemSchema = z.object({
  title: z.string().trim().min(1, "Item title is required"),
  body: z.string().default("")
});

export const htmlPageSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hero"),
    heading: z.string().trim().min(1, "Hero heading is required"),
    subheading: z.string().optional()
  }),
  z.object({
    type: z.literal("features"),
    heading: z.string().trim().min(1, "Features heading is required"),
    intro: z.string().optional(),
    items: z.array(titledBodyItemSchema).min(1, "At least one feature is required")
  }),
  z.object({
    type: z.literal("content"),
    heading: z.string().trim().min(1, "Content heading is required"),
    body: z.string().trim().min(1, "Content body is required")
  }),
  z.object({
    type: z.literal("steps"),
    heading: z.string().trim().min(1, "Steps heading is required"),
    items: z.array(titledBodyItemSchema).min(1, "At least one step is required")
  }),
  z.object({
    type: z.literal("faq"),
    heading: z.string().trim().min(1, "FAQ heading is required"),
    items: z.array(z.object({
      question: z.string().trim().min(1, "Question is required"),
      answer: z.string().trim().min(1, "Answer is required")
    })).min(1, "At least one FAQ item is required")
  })
]);

export const htmlPageSchema = z.object({
  template: htmlPageTemplateSchema.default("report"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  lang: z.string().trim().min(1).default("zh-CN"),
  theme: htmlPageThemeSchema.default("modern-blue"),
  sections: z.array(htmlPageSectionSchema).min(1, "At least one section is required")
});

export type HtmlPageInput = z.infer<typeof htmlPageSchema>;
export type HtmlPageSectionInput = z.infer<typeof htmlPageSectionSchema>;
