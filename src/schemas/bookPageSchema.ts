import { z } from "zod";

export const bookPageKinds = ["recommendation", "summary", "evaluation"] as const;
export const bookPageKindSchema = z.enum(bookPageKinds);

export const bookStyleProfiles = [
  "auto",
  "literary-classic",
  "web-fiction",
  "knowledge-nonfiction",
  "academic-professional",
  "youth-light"
] as const;
export const bookStyleProfileSchema = z.enum(bookStyleProfiles);

export const bookExpressionStrategies = [
  "auto",
  "top-down",
  "decision",
  "academic",
  "catalog",
  "argument",
  "workshop",
  "inverted-pyramid"
] as const;
export const bookExpressionStrategySchema = z.enum(bookExpressionStrategies);

const optionalStringArraySchema = z.array(z.string().min(1)).optional();

const titledBodyExpressionItemSchema = z.object({
  title: z.string().min(1, "Item title is required"),
  body: z.string().optional()
});

const factExpressionItemSchema = z.object({
  label: z.string().min(1, "Fact label is required"),
  value: z.string().min(1, "Fact value is required"),
  detail: z.string().optional()
});

export const bookExpressionConfigSchema = z
  .object({
    strategy: bookExpressionStrategySchema.default("auto"),
    density: z.enum(["narrative", "balanced", "compact"]).default("balanced"),
    hierarchy: z.enum(["strong", "normal", "flat"]).default("normal"),
    coreViewpoint: z.string().optional(),
    keyTakeaways: optionalStringArraySchema
  })
  .optional();

export const bookExpressionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lead"),
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    body: z.string().min(1, "Lead body is required"),
    facts: z.array(factExpressionItemSchema).optional()
  }),
  z.object({
    type: z.literal("key-takeaways"),
    title: z.string().optional(),
    intro: z.string().optional(),
    items: z.array(titledBodyExpressionItemSchema).min(1, "At least one takeaway is required")
  }),
  z.object({
    type: z.literal("executive-summary"),
    title: z.string().optional(),
    ask: z.string().optional(),
    recommendation: z.string().min(1, "Recommendation is required"),
    decisionHeadlines: optionalStringArraySchema,
    rationale: z.string().optional(),
    impact: z.string().optional()
  }),
  z.object({
    type: z.literal("evidence-map"),
    title: z.string().optional(),
    claim: z.string().min(1, "Claim is required"),
    evidence: z
      .array(
        titledBodyExpressionItemSchema.extend({
          confidence: z.enum(["low", "medium", "high"]).optional()
        })
      )
      .min(1, "At least one evidence item is required"),
    limitations: optionalStringArraySchema
  }),
  z.object({
    type: z.literal("decision-matrix"),
    title: z.string().min(1, "Decision matrix title is required"),
    intro: z.string().optional(),
    recommendation: z.string().optional(),
    criteria: z.array(z.string().min(1)).min(1, "At least one criterion is required"),
    options: z
      .array(
        z.object({
          name: z.string().min(1, "Option name is required"),
          verdict: z.enum(["recommended", "acceptable", "risky", "reject"]).optional(),
          scores: optionalStringArraySchema,
          rationale: z.string().optional()
        })
      )
      .min(1, "At least one option is required")
  }),
  z.object({
    type: z.literal("argument-map"),
    title: z.string().optional(),
    claim: z.string().min(1, "Claim is required"),
    reasons: z.array(titledBodyExpressionItemSchema).min(1, "At least one reason is required"),
    counterarguments: z.array(titledBodyExpressionItemSchema).optional(),
    conclusion: z.string().optional()
  }),
  z.object({
    type: z.literal("process-guide"),
    title: z.string().min(1, "Process guide title is required"),
    goal: z.string().min(1, "Goal is required"),
    prerequisites: optionalStringArraySchema,
    steps: z
      .array(
        z.object({
          title: z.string().min(1, "Step title is required"),
          body: z.string().optional(),
          checkpoint: z.string().optional(),
          output: z.string().optional()
        })
      )
      .min(1, "At least one step is required"),
    checks: optionalStringArraySchema
  }),
  z.object({
    type: z.literal("ranked-list"),
    title: z.string().min(1, "Ranked list title is required"),
    intro: z.string().optional(),
    items: z
      .array(
        z.object({
          rank: z.union([z.number(), z.string()]).optional(),
          title: z.string().min(1, "Item title is required"),
          body: z.string().optional(),
          fit: z.string().optional(),
          tags: optionalStringArraySchema
        })
      )
      .min(1, "At least one item is required")
  }),
  z.object({
    type: z.literal("section-outline"),
    title: z.string().min(1, "Section outline title is required"),
    intro: z.string().optional(),
    sections: z
      .array(
        z.object({
          title: z.string().min(1, "Section title is required"),
          body: z.string().optional(),
          children: z.array(titledBodyExpressionItemSchema).optional()
        })
      )
      .min(1, "At least one section is required")
  })
]);

export const bookSourceSchema = z.object({
  title: z.string().min(1, "Source title is required"),
  url: z.string().optional(),
  excerpt: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional()
});

export const bookFooterSchema = z
  .object({
    text: z.string().optional(),
    links: z
      .array(
        z.object({
          label: z.string().min(1, "Link label is required"),
          href: z.string().optional()
        })
      )
      .optional()
  })
  .optional();

export const bookPageSchema = z
  .object({
    kind: bookPageKindSchema,
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    lang: z.string().default("zh-CN"),
    styleProfile: bookStyleProfileSchema.default("auto"),
    expression: bookExpressionConfigSchema,
    expressions: z.array(bookExpressionSchema).default([]),
    sources: z.array(bookSourceSchema).default([]),
    footer: bookFooterSchema
  })
  .superRefine((page, context) => {
    const hasConfigExpression = Boolean(page.expression?.coreViewpoint || page.expression?.keyTakeaways?.length);

    if (page.expressions.length === 0 && !hasConfigExpression) {
      context.addIssue({
        code: "custom",
        message: "At least one expression or an expression.coreViewpoint/keyTakeaways is required",
        path: ["expressions"]
      });
    }
  });

export type BookPageKind = z.infer<typeof bookPageKindSchema>;
export type BookStyleProfile = z.infer<typeof bookStyleProfileSchema>;
export type BookExpressionStrategy = z.infer<typeof bookExpressionStrategySchema>;
export type BookExpressionConfigInput = z.input<typeof bookExpressionConfigSchema>;
export type BookExpressionInput = z.infer<typeof bookExpressionSchema>;
export type BookSourceInput = z.infer<typeof bookSourceSchema>;
export type BookPageInput = z.input<typeof bookPageSchema>;
export type BookPageOutput = z.infer<typeof bookPageSchema>;
