import type { BookExpressionInput, BookPageOutput } from "../../schemas/bookPageSchema.js";
import type { BookRenderContext } from "./bookRenderContext.js";

export function getResolvedBookExpressions(page: BookPageOutput, context: BookRenderContext): BookExpressionInput[] {
  const explicitExpressions = page.expressions ?? [];
  const explicitTypes = new Set(explicitExpressions.map((expression) => expression.type));
  const generated: BookExpressionInput[] = [];

  if (context.expression?.coreViewpoint && !explicitTypes.has("lead") && !explicitTypes.has("executive-summary")) {
    if (context.strategy === "decision") {
      generated.push({
        type: "executive-summary",
        title: page.title,
        recommendation: context.expression.coreViewpoint,
        decisionHeadlines: context.expression.keyTakeaways
      });
    } else {
      generated.push({
        type: "lead",
        eyebrow: context.definition.treatment.leadTreatment,
        title: page.title,
        body: context.expression.coreViewpoint
      });
    }
  }

  if (context.expression?.keyTakeaways?.length && !explicitTypes.has("key-takeaways")) {
    generated.push({
      type: "key-takeaways",
      title: "核心要点",
      items: context.expression.keyTakeaways.map((takeaway, index) => ({
        title: `要点 ${index + 1}`,
        body: takeaway
      }))
    });
  }

  return [...generated, ...explicitExpressions];
}

export function getBookExpressionTypes(expressions: BookExpressionInput[]): string {
  const types = expressions.map((expression) => expression.type);
  return types.length > 0 ? types.join(",") : "none";
}
