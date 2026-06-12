import { escapeHtmlText } from "./escapeHtml.js";
import { normalizeRenderedText } from "./normalizeRenderedText.js";

const inlineFormattingTags = [
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "mark",
  "small",
  "sub",
  "sup"
] as const;

const inlineFormattingTagPattern = inlineFormattingTags.join("|");
const rawFormattingTagPattern = `<\\s*/?\\s*(?:${inlineFormattingTagPattern})\\s*>`;
const rawBrTagPattern = "<\\s*br\\s*/?\\s*>";
const rawAllowedTagPattern = `(?:${rawFormattingTagPattern}|${rawBrTagPattern})`;
const markdownCodeWrappedAllowedTagsPattern = new RegExp(
  "`\\s*(" + rawAllowedTagPattern + "(?:\\s*" + rawAllowedTagPattern + ")*)\\s*`",
  "gi"
);
const escapedFormattingTagPattern = new RegExp(
  `&lt;\\s*(/?)\\s*(${inlineFormattingTagPattern})\\s*&gt;`,
  "gi"
);
const rawBrTagMatcher = new RegExp(rawBrTagPattern, "gi");
const richTextParagraphSplitPattern = /\n(?:[^\S\n]*\n)+/u;
const softLineBreakPattern = /\n+/g;
const explicitBreakToken = "__BOOK_ASSISTANT_EXPLICIT_BR__";

function normalizeAllowedInlineTags(value: string): string {
  return value.replace(markdownCodeWrappedAllowedTagsPattern, "$1");
}

function normalizeParagraphSource(value: string): string {
  const joined = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");

  return joined
    .replaceAll(` ${explicitBreakToken}`, explicitBreakToken)
    .replaceAll(`${explicitBreakToken} `, explicitBreakToken)
    .trim();
}

function restoreAllowedInlineTags(value: string): string {
  return value.replace(escapedFormattingTagPattern, (_match, slash: string, tag: string) => {
    return `<${slash}${tag.toLowerCase()}>`;
  });
}

export function renderInlineRichTextParagraphs(value: unknown): string[] {
  const normalized = normalizeRenderedText(normalizeAllowedInlineTags(String(value ?? "")));

  if (!normalized) {
    return [];
  }

  return normalized
    .replace(rawBrTagMatcher, explicitBreakToken)
    .split(richTextParagraphSplitPattern)
    .map(normalizeParagraphSource)
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => escapeHtmlText(paragraph))
    .map(restoreAllowedInlineTags)
    .map((paragraph) => paragraph.replaceAll(explicitBreakToken, "<br>"))
    .map((paragraph) => paragraph.replace(softLineBreakPattern, " "));
}

/**
 * Renders user-supplied rich text while only allowing a very small inline HTML subset.
 * Everything else is HTML-escaped, so attributes/scripts cannot be injected.
 */
export function renderInlineRichText(value: unknown): string {
  const paragraphs = renderInlineRichTextParagraphs(value);

  if (paragraphs.length <= 1) {
    return paragraphs[0] ?? "";
  }

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
}
