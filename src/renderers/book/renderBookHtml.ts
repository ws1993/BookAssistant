import { bookPageSchema, type BookPageInput, type BookSourceInput } from "../../schemas/bookPageSchema.js";
import { escapeAttribute, escapeHtml } from "../../utils/escapeHtml.js";
import { formatHtml } from "../../utils/formatHtml.js";
import { normalizeRenderableHref } from "../../utils/normalizeRenderableHref.js";
import { style } from "../shared/style.js";
import { renderBookExpression } from "./bookExpressions.js";
import { getBookExpressionTypes, getResolvedBookExpressions } from "./bookExpressionResolution.js";
import { resolveBookRenderContext, type BookRenderContext } from "./bookRenderContext.js";
import { renderBodyText } from "./bookRenderHelpers.js";

function renderSources(sources: BookSourceInput[], context: BookRenderContext, isFirst: boolean): string {
  if (sources.length === 0) {
    return "";
  }

  const { theme, definition } = context;
  const confidenceLabel: Record<NonNullable<BookSourceInput["confidence"]>, string> = {
    low: "低",
    medium: "中",
    high: "高"
  };

  const rows = sources
    .map((source) => {
      const href = normalizeRenderableHref(source.url);
      const titleHtml = href
        ? `<a href="${escapeAttribute(href)}" style="${escapeAttribute(
            style({ color: theme.primary, "font-weight": 800, "text-decoration": "none", "font-size": theme.h3FontSize })
          )}">${escapeHtml(source.title)}</a>`
        : `<span style="${escapeAttribute(style({ color: theme.text, "font-weight": 800, "font-size": theme.h3FontSize }))}">${escapeHtml(source.title)}</span>`;
      const confidence = source.confidence
        ? `<span style="${escapeAttribute(
            style({ "margin-left": "8px", padding: "2px 8px", background: theme.accentSoft, color: theme.accent, "border-radius": "999px", "font-size": theme.smallFontSize, "font-weight": 750 })
          )}">置信度 ${confidenceLabel[source.confidence]}</span>`
        : "";

      return `<div style="${escapeAttribute(
        style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall })
      )}">
        <div style="${escapeAttribute(style({ display: "flex", "align-items": "baseline", "flex-wrap": "wrap" }))}">${titleHtml}${confidence}</div>
        ${source.excerpt ? renderBodyText(source.excerpt, theme) : ""}
        ${href ? `<div style="${escapeAttribute(style({ "margin-top": "6px", "font-size": theme.smallFontSize, color: theme.muted, "word-break": "break-all" }))}">${escapeHtml(href)}</div>` : ""}
      </div>`;
    })
    .join("");

  const inner = `<h2 style="${escapeAttribute(
    style({ margin: "0 0 12px 0", "font-size": theme.h2FontSize, "font-weight": 760, color: theme.text })
  )}">${escapeHtml(definition.treatment.sourceTreatment)}</h2>
    <div style="${escapeAttribute(style({ display: "flex", "flex-direction": "column", gap: theme.gap }))}">${rows}</div>`;

  return `<div data-book-section="sources" style="${escapeAttribute(
    style({ padding: theme.sectionPadding, background: theme.surface, "border-top": isFirst ? "none" : `1px solid ${theme.borderSubtle}` })
  )}">${inner}</div>`;
}

function renderFooter(footer: BookPageInput["footer"], context: BookRenderContext): string {
  if (!footer) {
    return "";
  }

  const { theme } = context;
  const links = footer.links?.length
    ? `<div style="${escapeAttribute(style({ display: "flex", "flex-wrap": "wrap", gap: "10px", "margin-top": "10px" }))}">${footer.links
        .map((link) => {
          const href = normalizeRenderableHref(link.href);

          if (!href) {
            return "";
          }

          return `<a href="${escapeAttribute(href)}" style="${escapeAttribute(
            style({ color: theme.primary, "font-weight": 700, "font-size": theme.smallFontSize, "text-decoration": "none" })
          )}">${escapeHtml(link.label)}</a>`;
        })
        .join("")}</div>`
    : "";

  return `<div style="${escapeAttribute(
    style({ padding: "16px 24px", background: theme.bg, "border-top": `1px solid ${theme.borderSubtle}`, color: theme.muted, "font-size": theme.smallFontSize })
  )}">${footer.text ? renderBodyText(footer.text, theme) : ""}${links}</div>`;
}

export function renderBookHtml(input: BookPageInput): string {
  const page = bookPageSchema.parse(input);
  const context = resolveBookRenderContext(page);
  const { profile, theme, strategy } = context;
  const expressions = getResolvedBookExpressions(page, context);
  const expressionHtml = expressions.map((expression, index) => renderBookExpression(expression, context, index === 0));
  const sourcesHtml = renderSources(page.sources, context, expressionHtml.length === 0);

  const html = `<div data-book-assistant="${escapeAttribute(page.kind)}" data-style-profile="${escapeAttribute(
    profile
  )}" data-expression-strategy="${escapeAttribute(strategy)}" data-expression-types="${escapeAttribute(
    getBookExpressionTypes(expressions)
  )}" style="${escapeAttribute(
    style({
      margin: "16px 0",
      background: theme.outerBackground,
      color: theme.text,
      border: theme.borderCss,
      "border-radius": theme.radius,
      "box-shadow": theme.shadow,
      "font-family": theme.fontFamily,
      "line-height": 1.65,
      "max-width": "100%",
      overflow: "hidden"
    })
  )}">
    ${expressionHtml.join("")}
    ${sourcesHtml}
    ${renderFooter(page.footer, context)}
  </div>`;

  return formatHtml(html);
}
