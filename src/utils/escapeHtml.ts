import { normalizeRenderedText } from "./normalizeRenderedText.js";

export function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeHtml(value: unknown): string {
  return escapeHtmlText(normalizeRenderedText(value));
}

export function escapeAttribute(value: unknown): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
