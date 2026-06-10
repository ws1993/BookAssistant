import { escapeAttribute, escapeHtml } from "../utils/escapeHtml.js";
import { formatHtml } from "../utils/formatHtml.js";
import { style } from "./shared/style.js";
import type { BookAssistantResult, ClarificationQuestion, EvidenceSource, EvaluationResult, RecommendationItem, RecommendationResult, SummaryResult } from "../orchestrators/types.js";
import { resolveBookTheme } from "../styles/bookThemes.js";

function joinList(items: string[]): string {
  return items.filter(Boolean).map((item) => `<li style="${escapeAttribute(style({ margin: "0 0 8px 18px" }))}">${escapeHtml(item)}</li>`).join("");
}

function renderBadge(text: string, background: string, color: string): string {
  return `<span style="${escapeAttribute(style({ display: "inline-block", padding: "6px 10px", background, color, "border-radius": "999px", "font-size": "12px", "font-weight": 800 }))}">${escapeHtml(text)}</span>`;
}

function renderSource(source: EvidenceSource, themeText: string): string {
  return `<div style="${escapeAttribute(style({ padding: "12px 14px", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(148, 163, 184, 0.24)", "border-radius": "12px", "box-shadow": "none" }))}">
    <div style="${escapeAttribute(style({ "font-size": "12px", "font-weight": 800, color: themeText, "margin-bottom": "4px" }))}">${escapeHtml(source.title)}</div>
    ${source.url ? `<div style="${escapeAttribute(style({ "font-size": "12px", "margin-bottom": "6px" }))}"><a href="${escapeAttribute(source.url)}" style="color: inherit;">${escapeHtml(source.url)}</a></div>` : ""}
    ${source.excerpt ? `<div style="${escapeAttribute(style({ "font-size": "13px", color: themeText }))}">${escapeHtml(source.excerpt)}</div>` : ""}
  </div>`;
}

function renderSourceGrid(sources: EvidenceSource[], themeText: string): string {
  if (sources.length === 0) {
    return "";
  }

  return `<div style="${escapeAttribute(style({ display: "grid", gap: "10px", "grid-template-columns": "repeat(auto-fit, minmax(220px, 1fr))" }))}">${sources.map((source) => renderSource(source, themeText)).join("")}</div>`;
}

function renderClarification(result: Extract<BookAssistantResult, { kind: "clarification" }>): string {
  const theme = resolveBookTheme(result.styleProfile, result.title);
  return `<div data-book-assistant="clarification" style="${escapeAttribute(style({ margin: "16px 0", background: theme.outerBackground, color: theme.text, border: theme.borderCss, "border-radius": theme.radius, "box-shadow": theme.shadow, "font-family": theme.fontFamily, "line-height": 1.7, overflow: "hidden" }))}">
    <div style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface }))}">
      ${renderBadge("需要补充信息", theme.primarySoft, theme.primary)}
      <h1 style="${escapeAttribute(style({ margin: "12px 0 10px", "font-size": theme.h1FontSize, "line-height": 1.2 }))}">${escapeHtml(result.title)}</h1>
      <div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${escapeHtml(result.intro)}</div>
      <ul style="${escapeAttribute(style({ padding: 0, margin: `${theme.gap} 0 0` }))}">${result.questions.map((question: ClarificationQuestion) => `<li style="${escapeAttribute(style({ margin: "0 0 10px 18px" }))}"><strong>${escapeHtml(question.label)}</strong></li>`).join("")}</ul>
    </div>
  </div>`;
}

function renderRecommendationItem(item: RecommendationItem, theme: ReturnType<typeof resolveBookTheme>): string {
  const tagHtml = item.tags.map((tag) => renderBadge(tag, theme.accentSoft, theme.accent)).join(" ");
  return `<article style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall, "box-shadow": theme.softShadow }))}">
    <div style="${escapeAttribute(style({ display: "flex", "justify-content": "space-between", "align-items": "start", gap: theme.gap, "margin-bottom": "8px" }))}">
      <div>
        <div style="${escapeAttribute(style({ "font-size": theme.h3FontSize, "font-weight": 900, color: theme.text }))}">#${item.rank} ${escapeHtml(item.title)}${item.author ? ` · ${escapeHtml(item.author)}` : ""}</div>
        <div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.smallFontSize, "margin-top": "6px" }))}">${escapeHtml(item.fit)}</div>
      </div>
      ${item.warning ? renderBadge("注意", theme.accentSoft, theme.accent) : ""}
    </div>
    <div style="${escapeAttribute(style({ "font-size": theme.bodyFontSize, color: theme.text }))}">${escapeHtml(item.reason)}</div>
    ${item.warning ? `<div style="${escapeAttribute(style({ margin: "10px 0 0", padding: "10px 12px", background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall, color: theme.muted }))}"><strong>提醒：</strong>${escapeHtml(item.warning)}</div>` : ""}
    ${tagHtml ? `<div style="${escapeAttribute(style({ display: "flex", "flex-wrap": "wrap", gap: "8px", margin: "10px 0 0" }))}">${tagHtml}</div>` : ""}
    ${renderSourceGrid(item.sources, theme.text)}
  </article>`;
}

function renderRecommendation(result: RecommendationResult): string {
  const theme = resolveBookTheme(result.profile, `${result.title} ${result.query}`);
  return `<div data-book-assistant="recommendation" style="${escapeAttribute(style({ margin: "16px 0", background: theme.outerBackground, color: theme.text, border: theme.borderCss, "border-radius": theme.radius, "box-shadow": theme.shadow, "font-family": theme.fontFamily, "line-height": 1.7, overflow: "hidden" }))}">
    <section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface }))}">
      ${renderBadge("图书推荐", theme.primarySoft, theme.primary)}
      <h1 style="${escapeAttribute(style({ margin: "12px 0 10px", "font-size": theme.h1FontSize, "line-height": 1.2 }))}">${escapeHtml(result.title)}</h1>
      <div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize, margin: 0 }))}">${escapeHtml(result.summary)}</div>
      ${result.notes.length ? `<ul style="${escapeAttribute(style({ padding: 0, margin: `${theme.gap} 0 0` }))}">${joinList(result.notes)}</ul>` : ""}
    </section>
    <section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.bg, display: "grid", gap: theme.gap }))}">
      ${result.items.map((item) => renderRecommendationItem(item, theme)).join("")}
    </section>
    ${result.evidence.length ? `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface, borderTop: theme.borderCss }))}"><h2 style="${escapeAttribute(style({ margin: "0 0 12px", "font-size": theme.h2FontSize }))}">证据来源</h2>${renderSourceGrid(result.evidence, theme.text)}</section>` : ""}
  </div>`;
}

function renderSummary(result: SummaryResult): string {
  const theme = resolveBookTheme(result.profile, `${result.title} ${result.bookTitle} ${result.author ?? ""}`);
  return `<div data-book-assistant="summary" style="${escapeAttribute(style({ margin: "16px 0", background: theme.outerBackground, color: theme.text, border: theme.borderCss, "border-radius": theme.radius, "box-shadow": theme.shadow, "font-family": theme.fontFamily, "line-height": 1.7, overflow: "hidden" }))}">
    <section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface }))}">
      ${renderBadge("图书总结", theme.primarySoft, theme.primary)}
      <h1 style="${escapeAttribute(style({ margin: "12px 0 6px", "font-size": theme.h1FontSize, "line-height": 1.2 }))}">${escapeHtml(result.bookTitle)}</h1>
      <div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${[result.author, result.edition].filter(Boolean).map((value) => escapeHtml(value)).join(" · ")}</div>
      <p style="${escapeAttribute(style({ "font-size": theme.bodyFontSize, color: theme.text, margin: `${theme.gap} 0 0` }))}">${escapeHtml(result.overview)}</p>
      ${result.notes.length ? `<ul style="${escapeAttribute(style({ padding: 0, margin: `${theme.gap} 0 0` }))}">${joinList(result.notes)}</ul>` : ""}
      <div style="${escapeAttribute(style({ display: "grid", gap: "10px", "grid-template-columns": "repeat(auto-fit, minmax(210px, 1fr))", margin: `${theme.gap} 0 0` }))}">
        <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall }))}"><strong>适读人群</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.audience)}</ul></div>
        <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall }))}"><strong>结构/脉络</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.structure)}</ul></div>
      </div>
    </section>
    <section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.bg, display: "grid", gap: theme.gap }))}">
      <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall }))}"><strong>关键要点</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.keyPoints)}</ul></div>
    </section>
    ${result.sources.length ? `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface, borderTop: theme.borderCss }))}"><h2 style="${escapeAttribute(style({ margin: "0 0 12px", "font-size": theme.h2FontSize }))}">来源</h2>${renderSourceGrid(result.sources, theme.text)}</section>` : ""}
  </div>`;
}

function renderEvaluation(result: EvaluationResult): string {
  const theme = resolveBookTheme(result.profile, `${result.title} ${result.bookTitle} ${result.author ?? ""}`);
  const scoreText = Number.isFinite(result.score) ? result.score.toFixed(1) : "-";
  return `<div data-book-assistant="evaluation" style="${escapeAttribute(style({ margin: "16px 0", background: theme.outerBackground, color: theme.text, border: theme.borderCss, "border-radius": theme.radius, "box-shadow": theme.shadow, "font-family": theme.fontFamily, "line-height": 1.7, overflow: "hidden" }))}">
    <section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface, display: "grid", gap: theme.gap }))}">
      ${renderBadge("图书评价", theme.primarySoft, theme.primary)}
      <h1 style="${escapeAttribute(style({ margin: "12px 0 6px", "font-size": theme.h1FontSize, "line-height": 1.2 }))}">${escapeHtml(result.bookTitle)}</h1>
      <div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${[result.author, result.edition].filter(Boolean).map((value) => escapeHtml(value)).join(" · ")}</div>
      <div style="${escapeAttribute(style({ display: "flex", "align-items": "center", gap: "12px", "margin-top": "8px" }))}">
        <div style="${escapeAttribute(style({ padding: "12px 16px", background: theme.primarySoft, color: theme.primary, "border-radius": theme.radiusSmall, "font-size": theme.h2FontSize, "font-weight": 900 }))}">${scoreText}</div>
        <div style="${escapeAttribute(style({ color: theme.text, "font-size": theme.bodyFontSize }))}">${escapeHtml(result.verdict)}</div>
      </div>
      ${result.notes.length ? `<ul style="${escapeAttribute(style({ padding: 0, margin: `${theme.gap} 0 0` }))}">${joinList(result.notes)}</ul>` : ""}
    </section>
    <section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.bg, display: "grid", gap: theme.gap }))}">
      <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall }))}"><strong>优点</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.pros)}</ul></div>
      <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall }))}"><strong>缺点 / 风险</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.cons)}</ul></div>
      <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall }))}"><strong>适合谁</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.bestFor)}</ul></div>
      <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall }))}"><strong>不建议谁读</strong><ul style="${escapeAttribute(style({ padding: 0, margin: "8px 0 0" }))}">${joinList(result.avoidIf)}</ul></div>
    </section>
    ${result.sources.length ? `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface, borderTop: theme.borderCss }))}"><h2 style="${escapeAttribute(style({ margin: "0 0 12px", "font-size": theme.h2FontSize }))}">来源</h2>${renderSourceGrid(result.sources, theme.text)}</section>` : ""}
  </div>`;
}

export function renderBookAssistantHtml(result: BookAssistantResult): string {
  let html = "";

  switch (result.kind) {
    case "clarification":
      html = renderClarification(result);
      break;
    case "recommendation":
      html = renderRecommendation(result);
      break;
    case "summary":
      html = renderSummary(result);
      break;
    case "evaluation":
      html = renderEvaluation(result);
      break;
  }

  return formatHtml(html);
}
