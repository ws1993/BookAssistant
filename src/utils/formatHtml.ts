export function formatHtml(html: string): string {
  return html
    .split("\n")
    .map((line) => line.trim())
    .join("");
}
