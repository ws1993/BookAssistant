import type { HtmlPageInput, HtmlPageSectionInput } from "../schemas/htmlPageSchema.js";
import { resolveBookTheme } from "../styles/bookThemes.js";
import { escapeAttribute, escapeHtml } from "../utils/escapeHtml.js";
import { formatHtml } from "../utils/formatHtml.js";
import { style } from "./shared/style.js";

type PageTheme = ReturnType<typeof resolveBookTheme>;

export interface HtmlPageRenderOptions {
  attributes: Record<string, string>;
  heroBadge: {
    text: string;
    background: string;
    color: string;
  };
  theme: PageTheme;
}

function renderBadge(text: string, background: string, color: string): string {
  return `<span style="${escapeAttribute(style({ display: "inline-block", padding: "6px 10px", background, color, "border-radius": "999px", "font-size": "12px", "font-weight": 800 }))}">${escapeHtml(text)}</span>`;
}

function joinSectionBody(body: string): string {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="${escapeAttribute(style({ margin: "0 0 10px", "font-size": "14.5px", "line-height": 1.7 }))}">${escapeHtml(line)}</p>`)
    .join("");
}

function renderHeroSection(section: Extract<HtmlPageSectionInput, { type: "hero" }>, options: HtmlPageRenderOptions): string {
  const { heroBadge, theme } = options;

  return `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface }))}">
    ${renderBadge(heroBadge.text, heroBadge.background, heroBadge.color)}
    <h1 style="${escapeAttribute(style({ margin: "12px 0 10px", "font-size": theme.h1FontSize, "line-height": 1.2 }))}">${escapeHtml(section.heading)}</h1>
    ${section.subheading ? `<div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${joinSectionBody(section.subheading)}</div>` : ""}
  </section>`;
}

function renderFeatureSection(section: Extract<HtmlPageSectionInput, { type: "features" }>, theme: PageTheme): string {
  return `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.bg, display: "grid", gap: theme.gap }))}">
    <h2 style="${escapeAttribute(style({ margin: 0, "font-size": theme.h2FontSize, color: theme.text }))}">${escapeHtml(section.heading)}</h2>
    ${section.intro ? `<div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${joinSectionBody(section.intro)}</div>` : ""}
    <div style="${escapeAttribute(style({ display: "grid", gap: "12px", "grid-template-columns": "repeat(auto-fit, minmax(220px, 1fr))" }))}">
      ${section.items.map((item, index) => `<article style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall, "box-shadow": theme.softShadow }))}">
        <div style="${escapeAttribute(style({ display: "flex", gap: "10px", "align-items": "start" }))}">
          <span style="${escapeAttribute(style({ display: "inline-flex", width: "26px", height: "26px", "align-items": "center", "justify-content": "center", background: theme.primarySoft, color: theme.primary, "border-radius": "999px", "font-size": "12px", "font-weight": 800, "flex-shrink": 0 }))}">${index + 1}</span>
          <div style="${escapeAttribute(style({ flex: 1 }))}">
            <div style="${escapeAttribute(style({ "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text, margin: "0 0 6px" }))}">${escapeHtml(item.title)}</div>
            ${item.body ? `<div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${joinSectionBody(item.body)}</div>` : ""}
          </div>
        </div>
      </article>`).join("")}
    </div>
  </section>`;
}

function renderStepsSection(section: Extract<HtmlPageSectionInput, { type: "steps" }>, theme: PageTheme): string {
  return `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.bg, display: "grid", gap: theme.gap }))}">
    <h2 style="${escapeAttribute(style({ margin: 0, "font-size": theme.h2FontSize, color: theme.text }))}">${escapeHtml(section.heading)}</h2>
    <div style="${escapeAttribute(style({ display: "grid", gap: "12px" }))}">
      ${section.items.map((item, index) => `<article style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall, "box-shadow": theme.softShadow }))}">
        <div style="${escapeAttribute(style({ display: "flex", gap: "10px", "align-items": "start" }))}">
          <span style="${escapeAttribute(style({ display: "inline-flex", width: "26px", height: "26px", "align-items": "center", "justify-content": "center", background: theme.primarySoft, color: theme.primary, "border-radius": "999px", "font-size": "12px", "font-weight": 800, "flex-shrink": 0 }))}">${index + 1}</span>
          <div style="${escapeAttribute(style({ flex: 1 }))}">
            <div style="${escapeAttribute(style({ "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text, margin: "0 0 6px" }))}">${escapeHtml(item.title)}</div>
            ${item.body ? `<div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${joinSectionBody(item.body)}</div>` : ""}
          </div>
        </div>
      </article>`).join("")}
    </div>
  </section>`;
}

function renderContentSection(section: Extract<HtmlPageSectionInput, { type: "content" }>, theme: PageTheme): string {
  return `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.surface }))}">
    <h2 style="${escapeAttribute(style({ margin: "0 0 12px", "font-size": theme.h2FontSize }))}">${escapeHtml(section.heading)}</h2>
    <div style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.panel, border: `1px solid ${theme.borderSubtle}`, "border-radius": theme.radiusSmall, color: theme.text }))}">${joinSectionBody(section.body)}</div>
  </section>`;
}

function renderFaqSection(section: Extract<HtmlPageSectionInput, { type: "faq" }>, theme: PageTheme): string {
  return `<section style="${escapeAttribute(style({ padding: theme.sectionPadding, background: theme.bg, display: "grid", gap: theme.gap }))}">
    <h2 style="${escapeAttribute(style({ margin: 0, "font-size": theme.h2FontSize, color: theme.text }))}">${escapeHtml(section.heading)}</h2>
    ${section.items.map((item) => `<article style="${escapeAttribute(style({ padding: theme.cardPadding, background: theme.surface, border: theme.borderCss, "border-radius": theme.radiusSmall }))}">
      <div style="${escapeAttribute(style({ "font-size": theme.h3FontSize, "font-weight": 800, color: theme.text, margin: "0 0 8px" }))}">${escapeHtml(item.question)}</div>
      <div style="${escapeAttribute(style({ color: theme.muted, "font-size": theme.bodyFontSize }))}">${joinSectionBody(item.answer)}</div>
    </article>`).join("")}
  </section>`;
}

function renderSection(section: HtmlPageSectionInput, options: HtmlPageRenderOptions): string {
  switch (section.type) {
    case "hero":
      return renderHeroSection(section, options);
    case "features":
      return renderFeatureSection(section, options.theme);
    case "steps":
      return renderStepsSection(section, options.theme);
    case "content":
      return renderContentSection(section, options.theme);
    case "faq":
      return renderFaqSection(section, options.theme);
  }
}

function renderAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
}

export function renderHtmlPage(page: HtmlPageInput, options: HtmlPageRenderOptions): string {
  const theme = options.theme;
  const attributes = renderAttributes({
    ...options.attributes,
    "data-template": page.template,
    "data-theme": page.theme
  });

  const html = `<div ${attributes} style="${escapeAttribute(style({ margin: "16px 0", background: theme.outerBackground, color: theme.text, border: theme.borderCss, "border-radius": theme.radius, "box-shadow": theme.shadow, "font-family": theme.fontFamily, "line-height": 1.7, overflow: "hidden" }))}">
    ${page.sections.map((section) => renderSection(section, options)).join("")}
  </div>`;

  return formatHtml(html);
}
