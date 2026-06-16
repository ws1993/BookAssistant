import type { BookExpressionInput } from "../../schemas/bookPageSchema.js";
import { escapeAttribute, escapeHtml } from "../../utils/escapeHtml.js";
import { renderParagraphGroup } from "../shared/paragraph.js";
import { style } from "../shared/style.js";
import type { BookRenderContext } from "./bookRenderContext.js";
import {
  bodyTextStyle,
  renderBookSection,
  renderBodyText,
  renderEyebrow,
  renderFactStrip,
  renderSectionHeading,
  renderSimpleList,
  renderTitledRows
} from "./bookRenderHelpers.js";

function renderLeadExpression(
  expression: Extract<BookExpressionInput, { type: "lead" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const titleSize = context.expression?.hierarchy === "flat" ? theme.h2FontSize : theme.h1FontSize;
  const background = `linear-gradient(135deg, ${theme.surface}, ${theme.primarySoft})`;
  const inner = `${renderEyebrow(expression.eyebrow ?? context.definition.treatment.leadTreatment, context)}
    ${expression.title
      ? `<h1 style="${escapeAttribute(
          style({ margin: 0, "font-size": titleSize, "font-weight": 880, color: theme.text, "line-height": 1.18, "letter-spacing": "-0.025em" })
        )}">${escapeHtml(expression.title)}</h1>`
      : ""}
    ${renderParagraphGroup(expression.body, {
      singleStyle: bodyTextStyle(theme, {
        "margin-top": expression.title ? "12px" : "0",
        color: theme.text,
        "font-size": theme.bodyFontSize,
        "font-weight": context.strategy === "decision" ? 750 : 500
      }),
      multiWrapperStyle: style({ display: "flex", "flex-direction": "column", gap: "10px", "margin-top": expression.title ? "12px" : "0" }),
      multiParagraphStyle: bodyTextStyle(theme, { color: theme.text, "font-size": theme.bodyFontSize })
    })}
    ${renderFactStrip(expression.facts, context)}`;

  return renderBookSection(expression.type, inner, context, isFirst, { background });
}

function renderProsConsExpression(
  expression: Extract<BookExpressionInput, { type: "pros-cons" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  
  const renderProConList = (items: Array<{ title: string; body?: string }>, isPositive: boolean) => {
    const color = isPositive ? theme.primary : "#b91c1c";
    const bgColor = isPositive ? theme.primarySoft : "rgba(185, 28, 28, 0.08)";
    
    return items
      .map(
        (item) => `<div style="${escapeAttribute(
          style({
            display: "flex",
            gap: "10px",
            padding: theme.cardPadding,
            background: bgColor,
            border: `1px solid ${color}30`,
            "border-radius": theme.radiusSmall
          })
        )}">
          <div style="${escapeAttribute(
            style({
              "font-size": "18px",
              "font-weight": 900,
              color: color,
              "flex-shrink": 0,
              "margin-top": "2px"
            })
          )}">${isPositive ? "✓" : "✗"}</div>
          <div style="${escapeAttribute(style({ flex: 1 }))}">
            <div style="${escapeAttribute(
              style({
                "font-size": theme.h3FontSize,
                "font-weight": 800,
                color: theme.text,
                "margin-bottom": item.body ? "6px" : "0"
              })
            )}">${escapeHtml(item.title)}</div>
            ${item.body ? renderBodyText(item.body, theme, theme.muted) : ""}
          </div>
        </div>`
      )
      .join("");
  };

  const inner = `${renderSectionHeading(expression.title ?? "优缺点分析", expression.intro, context)}
    ${expression.overallVerdict
      ? `<div style="${escapeAttribute(
          style({
            padding: theme.cardPadding,
            background: theme.panel,
            border: `1px solid ${theme.borderSubtle}`,
            "border-radius": theme.radiusSmall,
            "margin-bottom": theme.gap
          })
        )}">
          <div style="${escapeAttribute(
            style({ "font-size": theme.smallFontSize, "font-weight": 850, color: theme.primary, "margin-bottom": "6px" })
          )}">总体评价</div>
          ${renderBodyText(expression.overallVerdict, theme, theme.text)}
        </div>`
      : ""}
    <div style="${escapeAttribute(style({ "margin-bottom": theme.gap }))}">
      <div style="${escapeAttribute(
        style({
          "font-size": theme.h3FontSize,
          "font-weight": 800,
          color: theme.primary,
          "margin-bottom": "10px"
        })
      )}">优点</div>
      <div style="${escapeAttribute(style({ display: "flex", "flex-direction": "column", gap: "8px" }))}">${renderProConList(expression.pros, true)}</div>
    </div>
    ${expression.cons && expression.cons.length > 0
      ? `<div style="${escapeAttribute(style({ "margin-bottom": theme.gap }))}">
          <div style="${escapeAttribute(
            style({
              "font-size": theme.h3FontSize,
              "font-weight": 800,
              color: "#b91c1c",
              "margin-bottom": "10px"
            })
          )}">不足</div>
          <div style="${escapeAttribute(style({ display: "flex", "flex-direction": "column", gap: "8px" }))}">${renderProConList(expression.cons, false)}</div>
        </div>`
      : ""}
    ${expression.readerFit
      ? `<div style="${escapeAttribute(
          style({
            padding: theme.cardPadding,
            background: theme.surface,
            border: `1px solid ${theme.borderSubtle}`,
            "border-radius": theme.radiusSmall
          })
        )}">
          <div style="${escapeAttribute(
            style({ "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text, "margin-bottom": "12px" })
          )}">读者适配度</div>
          ${expression.readerFit.bestFor && expression.readerFit.bestFor.length > 0
            ? `<div style="${escapeAttribute(style({ "margin-bottom": "12px" }))}">
                <div style="${escapeAttribute(
                  style({ "font-size": theme.smallFontSize, "font-weight": 800, color: theme.primary, "margin-bottom": "6px" })
                )}">✓ 适合</div>
                ${renderSimpleList(expression.readerFit.bestFor, context, false)}
              </div>`
            : ""}
          ${expression.readerFit.notFor && expression.readerFit.notFor.length > 0
            ? `<div>
                <div style="${escapeAttribute(
                  style({ "font-size": theme.smallFontSize, "font-weight": 800, color: "#b91c1c", "margin-bottom": "6px" })
                )}">✗ 不适合</div>
                ${renderSimpleList(expression.readerFit.notFor, context, false)}
              </div>`
            : ""}
        </div>`
      : ""}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderContentWarningsExpression(
  expression: Extract<BookExpressionInput, { type: "content-warnings" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;

  const levelColors = {
    none: theme.muted,
    mild: "#f59e0b",
    moderate: "#ea580c",
    graphic: "#dc2626"
  };

  const levelLabels = {
    none: "无",
    mild: "轻微",
    moderate: "中等",
    graphic: "严重"
  };

  const inner = `${renderSectionHeading(expression.title ?? "内容警告", expression.intro, context)}
    ${expression.overall
      ? `<div style="${escapeAttribute(
          style({
            padding: theme.cardPadding,
            background: "#fef3c7",
            border: "2px solid #f59e0b",
            "border-radius": theme.radiusSmall,
            "margin-bottom": theme.gap
          })
        )}">
          <div style="${escapeAttribute(
            style({ "font-size": theme.smallFontSize, "font-weight": 850, color: "#b45309", "margin-bottom": "6px" })
          )}">⚠️ 总体提示</div>
          ${renderBodyText(expression.overall, theme, "#78350f")}
        </div>`
      : ""}
    <div style="${escapeAttribute(style({ display: "flex", "flex-direction": "column", gap: "10px", "margin-bottom": theme.gap }))}">
      ${expression.warnings
        .map(
          (warning) => `<div style="${escapeAttribute(
            style({
              padding: theme.cardPadding,
              background: theme.panel,
              border: `2px solid ${warning.level ? levelColors[warning.level] : theme.borderSubtle}`,
              "border-radius": theme.radiusSmall
            })
          )}">
            <div style="${escapeAttribute(style({ display: "flex", "justify-content": "space-between", "align-items": "center", "margin-bottom": "6px" }))}">
              <div style="${escapeAttribute(
                style({ "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text })
              )}">${escapeHtml(warning.category)}</div>
              ${warning.level
                ? `<div style="${escapeAttribute(
                    style({
                      padding: "3px 10px",
                      background: levelColors[warning.level],
                      color: "#fff",
                      "border-radius": "12px",
                      "font-size": theme.smallFontSize,
                      "font-weight": 800
                    })
                  )}">${levelLabels[warning.level]}</div>`
                : ""}
            </div>
            ${warning.details ? renderBodyText(warning.details, theme, theme.muted) : ""}
            ${warning.pageReferences && warning.pageReferences.length > 0
              ? `<div style="${escapeAttribute(
                  style({ "margin-top": "8px", "font-size": theme.smallFontSize, color: theme.muted })
                )}">涉及位置：${escapeHtml(warning.pageReferences.join("、"))}</div>`
              : ""}
          </div>`
        )
        .join("")}
    </div>
    ${expression.safeFor || expression.cautionFor
      ? `<div style="${escapeAttribute(
          style({
            padding: theme.cardPadding,
            background: theme.surface,
            border: `1px solid ${theme.borderSubtle}`,
            "border-radius": theme.radiusSmall
          })
        )}">
          <div style="${escapeAttribute(
            style({ "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text, "margin-bottom": "12px" })
          )}">适读提示</div>
          ${expression.safeFor && expression.safeFor.length > 0
            ? `<div style="${escapeAttribute(style({ "margin-bottom": "12px" }))}">
                <div style="${escapeAttribute(
                  style({ "font-size": theme.smallFontSize, "font-weight": 800, color: theme.primary, "margin-bottom": "6px" })
                )}">✓ 可安全阅读</div>
                ${renderSimpleList(expression.safeFor, context, false)}
              </div>`
            : ""}
          ${expression.cautionFor && expression.cautionFor.length > 0
            ? `<div>
                <div style="${escapeAttribute(
                  style({ "font-size": theme.smallFontSize, "font-weight": 800, color: "#ea580c", "margin-bottom": "6px" })
                )}">⚠️ 需要谨慎</div>
                ${renderSimpleList(expression.cautionFor, context, false)}
              </div>`
            : ""}
        </div>`
      : ""}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderKeyTakeawaysExpression(
  expression: Extract<BookExpressionInput, { type: "key-takeaways" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const inner = `${renderSectionHeading(expression.title ?? "关键要点", expression.intro, context)}
    ${renderTitledRows(expression.items, context, { ordered: context.expression?.hierarchy !== "flat" })}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderExecutiveSummaryExpression(
  expression: Extract<BookExpressionInput, { type: "executive-summary" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const inner = `${renderSectionHeading(expression.title ?? "结论先行", undefined, context)}
    ${expression.ask
      ? `<div style="${escapeAttribute(style({ "font-size": theme.smallFontSize, "font-weight": 800, color: theme.primary, "margin-bottom": "8px" }))}">问题：${escapeHtml(expression.ask)}</div>`
      : ""}
    <div style="${escapeAttribute(
      style({ padding: theme.cardPadding, background: theme.primarySoft, border: `1px solid ${theme.primary}`, "border-radius": theme.radiusSmall })
    )}">
      <div style="${escapeAttribute(style({ "font-size": theme.smallFontSize, "font-weight": 850, color: theme.primary, "text-transform": "uppercase", "letter-spacing": "0.04em" }))}">推荐结论</div>
      ${renderParagraphGroup(expression.recommendation, {
        singleStyle: bodyTextStyle(theme, { color: theme.text, "font-weight": 800, "font-size": theme.h3FontSize, "margin-top": "6px" }),
        multiWrapperStyle: style({ display: "flex", "flex-direction": "column", gap: "8px", "margin-top": "6px" }),
        multiParagraphStyle: bodyTextStyle(theme, { color: theme.text, "font-weight": 800, "font-size": theme.h3FontSize })
      })}
    </div>
    ${renderSimpleList(expression.decisionHeadlines, context, false)}
    ${expression.rationale ? renderSectionHeading("理由", expression.rationale, context) : ""}
    ${expression.impact ? renderSectionHeading("预期收获", expression.impact, context) : ""}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderEvidenceMapExpression(
  expression: Extract<BookExpressionInput, { type: "evidence-map" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const evidence = expression.evidence.map((item) => ({
    title: `${item.title}${item.confidence ? `（${item.confidence} 置信度）` : ""}`,
    body: item.body
  }));
  const inner = `${renderSectionHeading(expression.title ?? "证据梳理", undefined, context)}
    <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall, "margin-bottom": theme.gap }))}">
      <div style="${escapeAttribute(style({ "font-size": theme.smallFontSize, "font-weight": 850, color: theme.primary }))}">论点</div>
      ${renderBodyText(expression.claim, theme, theme.text)}
    </div>
    ${renderTitledRows(evidence, context, { ordered: true })}
    ${expression.limitations?.length ? `<div style="${escapeAttribute(style({ "margin-top": theme.gap }))}">${renderSectionHeading("局限", undefined, context)}${renderSimpleList(expression.limitations, context)}</div>` : ""}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderDecisionMatrixExpression(
  expression: Extract<BookExpressionInput, { type: "decision-matrix" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const verdictColor = {
    recommended: theme.primary,
    acceptable: theme.accent,
    risky: "#b45309",
    reject: "#b91c1c"
  } as const;
  const inner = `${renderSectionHeading(expression.title, expression.intro, context)}
    ${expression.recommendation
      ? `<div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.primarySoft, border: `1px solid ${theme.primary}`, "border-radius": theme.radiusSmall, "margin-bottom": theme.gap }))}">${renderBodyText(expression.recommendation, theme, theme.text)}</div>`
      : ""}
    <div style="${escapeAttribute(style({ overflow: "auto", border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall }))}">
      <table style="${escapeAttribute(style({ width: "100%", "border-collapse": "collapse", "font-size": theme.smallFontSize, color: theme.text }))}">
        <thead><tr>
          <th style="${escapeAttribute(style({ padding: "10px", background: theme.panel, "border-bottom": `1px solid ${theme.borderSubtle}`, "text-align": "left" }))}">选项</th>
          <th style="${escapeAttribute(style({ padding: "10px", background: theme.panel, "border-bottom": `1px solid ${theme.borderSubtle}`, "text-align": "left" }))}">结论</th>
          ${expression.criteria.map((criterion) => `<th style="${escapeAttribute(style({ padding: "10px", background: theme.panel, "border-bottom": `1px solid ${theme.borderSubtle}`, "text-align": "left" }))}">${escapeHtml(criterion)}</th>`).join("")}
          <th style="${escapeAttribute(style({ padding: "10px", background: theme.panel, "border-bottom": `1px solid ${theme.borderSubtle}`, "text-align": "left" }))}">理由</th>
        </tr></thead>
        <tbody>${expression.options
          .map(
            (option) => `<tr>
              <td style="${escapeAttribute(style({ padding: "10px", "border-top": `1px solid ${theme.borderSubtle}`, "font-weight": 800 }))}">${escapeHtml(option.name)}</td>
              <td style="${escapeAttribute(style({ padding: "10px", "border-top": `1px solid ${theme.borderSubtle}`, color: option.verdict ? verdictColor[option.verdict] : theme.muted, "font-weight": 800 }))}">${escapeHtml(option.verdict ?? "-")}</td>
              ${expression.criteria.map((_, index) => `<td style="${escapeAttribute(style({ padding: "10px", "border-top": `1px solid ${theme.borderSubtle}` }))}">${escapeHtml(option.scores?.[index] ?? "")}</td>`).join("")}
              <td style="${escapeAttribute(style({ padding: "10px", "border-top": `1px solid ${theme.borderSubtle}`, color: theme.muted }))}">${escapeHtml(option.rationale ?? "")}</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>
    </div>`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderArgumentMapExpression(
  expression: Extract<BookExpressionInput, { type: "argument-map" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const inner = `${renderSectionHeading(expression.title ?? "观点梳理", undefined, context)}
    <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall, "margin-bottom": theme.gap }))}">
      <div style="${escapeAttribute(style({ "font-size": theme.smallFontSize, "font-weight": 850, color: theme.primary }))}">核心观点</div>
      ${renderBodyText(expression.claim, theme, theme.text)}
    </div>
    ${renderSectionHeading("理由", undefined, context)}
    ${renderTitledRows(expression.reasons, context, { ordered: true })}
    ${expression.counterarguments?.length ? `<div style="${escapeAttribute(style({ "margin-top": theme.gap }))}">${renderSectionHeading("反方意见", undefined, context)}${renderTitledRows(expression.counterarguments, context)}</div>` : ""}
    ${expression.conclusion ? `<div style="${escapeAttribute(style({ "margin-top": theme.gap }))}">${renderSectionHeading("结论", expression.conclusion, context)}</div>` : ""}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderProcessGuideExpression(
  expression: Extract<BookExpressionInput, { type: "process-guide" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const stepRows = expression.steps.map((step) => ({
    title: step.title,
    body: [step.body, step.output ? `产出：${step.output}` : undefined, step.checkpoint ? `检查点：${step.checkpoint}` : undefined]
      .filter(Boolean)
      .join("\n\n")
  }));
  const inner = `${renderSectionHeading(expression.title, undefined, context)}
    <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.primarySoft, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall, "margin-bottom": theme.gap }))}">
      <div style="${escapeAttribute(style({ "font-size": theme.smallFontSize, "font-weight": 850, color: theme.primary }))}">目标</div>
      ${renderBodyText(expression.goal, theme, theme.text)}
    </div>
    ${expression.prerequisites?.length ? `<div style="${escapeAttribute(style({ "margin-bottom": theme.gap }))}">${renderSectionHeading("前置准备", undefined, context)}${renderSimpleList(expression.prerequisites, context)}</div>` : ""}
    ${renderTitledRows(stepRows, context, { ordered: true })}
    ${expression.checks?.length ? `<div style="${escapeAttribute(style({ "margin-top": theme.gap }))}">${renderSectionHeading("检查清单", undefined, context)}${renderSimpleList(expression.checks, context)}</div>` : ""}`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderRankedListExpression(
  expression: Extract<BookExpressionInput, { type: "ranked-list" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const inner = `${renderSectionHeading(expression.title, expression.intro, context)}
    <div style="${escapeAttribute(style({ display: "flex", "flex-direction": "column", gap: theme.gap }))}">${expression.items
      .map(
        (item, index) => `<div style="${escapeAttribute(style({ display: "grid", "grid-template-columns": "42px 1fr", gap: "12px", padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall }))}">
          <div style="${escapeAttribute(style({ "font-size": theme.h3FontSize, "font-weight": 900, color: theme.primary }))}">${escapeHtml(String(item.rank ?? index + 1))}</div>
          <div>
            <h3 style="${escapeAttribute(style({ margin: "0 0 5px 0", "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text }))}">${escapeHtml(item.title)}</h3>
            ${item.fit ? `<div style="${escapeAttribute(style({ "font-size": theme.smallFontSize, "font-weight": 800, color: theme.accent, "margin-bottom": "5px" }))}">${escapeHtml(item.fit)}</div>` : ""}
            ${item.body ? renderBodyText(item.body, theme) : ""}
            ${item.tags?.length ? `<div style="${escapeAttribute(style({ display: "flex", "flex-wrap": "wrap", gap: "6px", "margin-top": "8px" }))}">${item.tags.map((tag) => `<span style="${escapeAttribute(style({ padding: "3px 7px", background: theme.accentSoft, color: theme.accent, "border-radius": "999px", "font-size": theme.smallFontSize, "font-weight": 750 }))}">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
          </div>
        </div>`
      )
      .join("")}</div>`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

function renderSectionOutlineExpression(
  expression: Extract<BookExpressionInput, { type: "section-outline" }>,
  context: BookRenderContext,
  isFirst: boolean
): string {
  const { theme } = context;
  const inner = `${renderSectionHeading(expression.title, expression.intro, context)}
    <div style="${escapeAttribute(style({ display: "flex", "flex-direction": "column", gap: theme.gap }))}">${expression.sections
      .map(
        (section, index) => `<div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall }))}">
          <h3 style="${escapeAttribute(style({ margin: "0 0 6px 0", "font-size": theme.h3FontSize, "font-weight": 850, color: theme.text }))}">${escapeHtml(`${index + 1}. ${section.title}`)}</h3>
          ${section.body ? renderBodyText(section.body, theme) : ""}
          ${section.children?.length ? `<div style="${escapeAttribute(style({ "margin-top": "8px" }))}">${renderTitledRows(section.children, context)}</div>` : ""}
        </div>`
      )
      .join("")}</div>`;

  return renderBookSection(expression.type, inner, context, isFirst);
}

export function renderBookExpression(
  expression: BookExpressionInput,
  context: BookRenderContext,
  isFirst: boolean
): string {
  switch (expression.type) {
    case "lead":
      return renderLeadExpression(expression, context, isFirst);
    case "content-warnings":
      return renderContentWarningsExpression(expression, context, isFirst);
    case "pros-cons":
      return renderProsConsExpression(expression, context, isFirst);
    case "key-takeaways":
      return renderKeyTakeawaysExpression(expression, context, isFirst);
    case "executive-summary":
      return renderExecutiveSummaryExpression(expression, context, isFirst);
    case "evidence-map":
      return renderEvidenceMapExpression(expression, context, isFirst);
    case "decision-matrix":
      return renderDecisionMatrixExpression(expression, context, isFirst);
    case "argument-map":
      return renderArgumentMapExpression(expression, context, isFirst);
    case "process-guide":
      return renderProcessGuideExpression(expression, context, isFirst);
    case "ranked-list":
      return renderRankedListExpression(expression, context, isFirst);
    case "section-outline":
      return renderSectionOutlineExpression(expression, context, isFirst);
  }
}
