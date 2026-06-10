export type StyleRules = Record<string, string | number | undefined>;

export function style(rules: StyleRules): string {
  return Object.entries({
    ...rules,
    "text-align": "left !important",
    "text-indent": "0 !important",
    "white-space": "normal !important"
  })
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}
