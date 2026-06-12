const normalizedLineEndingPattern = /\r\n?|\u2028|\u2029/g;
const leadingLineIndentPattern = /^[^\S\n]+/gm;
const trailingLineWhitespacePattern = /[^\S\n]+$/gm;
const boundaryWhitespacePattern = /^[\s\u3000]+|[\s\u3000]+$/gu;

export function normalizeRenderedText(value: unknown): string {
  return String(value ?? "")
    .replace(normalizedLineEndingPattern, "\n")
    .replace(leadingLineIndentPattern, "")
    .replace(trailingLineWhitespacePattern, "")
    .replace(boundaryWhitespacePattern, "");
}
