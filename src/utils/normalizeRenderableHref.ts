const renderableHrefProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

export function normalizeRenderableHref(value: unknown): string | undefined {
  const href = String(value ?? "").trim();

  if (!href || href === "#" || href.startsWith("#")) {
    return undefined;
  }

  try {
    const url = new URL(href);
    return renderableHrefProtocols.has(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}
