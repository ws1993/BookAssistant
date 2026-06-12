import type { BookExpressionStrategy, BookPageKind, BookStyleProfile } from "../schemas/bookPageSchema.js";

export type ResolvedBookStyleProfile = Exclude<BookStyleProfile, "auto">;
export type ResolvedBookExpressionStrategy = Exclude<BookExpressionStrategy, "auto">;

export interface BookThemeTokens {
  bg: string;
  surface: string;
  panel: string;
  text: string;
  muted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  border: string;
  borderSubtle: string;
  borderCss: string;
  radius: string;
  radiusSmall: string;
  shadow: string;
  softShadow: string;
  sectionPadding: string;
  cardPadding: string;
  gap: string;
  bodyFontSize: string;
  smallFontSize: string;
  h1FontSize: string;
  h2FontSize: string;
  h3FontSize: string;
  fontFamily: string;
  outerBackground: string;
}

export interface BookProfileDefinition {
  theme: BookThemeTokens;
  treatment: {
    leadTreatment: string;
    sectionTreatment: string;
    sourceTreatment: string;
  };
}

const bookThemes: Record<ResolvedBookStyleProfile, BookThemeTokens> = {
  "literary-classic": {
    bg: "#f3eadb",
    surface: "#fff9f0",
    panel: "#f4e8d4",
    text: "#2c1f16",
    muted: "#6f5a49",
    primary: "#8a4f2d",
    primarySoft: "#f3ddc4",
    accent: "#5b3b1d",
    accentSoft: "#ead8c2",
    border: "#c8aa86",
    borderSubtle: "#e4d3be",
    borderCss: "1px solid #c8aa86",
    radius: "10px",
    radiusSmall: "6px",
    shadow: "0 10px 26px rgba(73, 46, 28, 0.10)",
    softShadow: "0 4px 12px rgba(73, 46, 28, 0.06)",
    sectionPadding: "24px",
    cardPadding: "16px",
    gap: "12px",
    bodyFontSize: "15px",
    smallFontSize: "12.5px",
    h1FontSize: "29px",
    h2FontSize: "19px",
    h3FontSize: "16px",
    fontFamily: "Georgia, 'Times New Roman', 'Noto Serif SC', 'Songti SC', SimSun, serif",
    outerBackground: "linear-gradient(180deg, #fffaf2, #f3eadb)"
  },
  "web-fiction": {
    bg: "#101828",
    surface: "#172033",
    panel: "#1f2a44",
    text: "#f8fafc",
    muted: "#cbd5e1",
    primary: "#60a5fa",
    primarySoft: "rgba(96, 165, 250, 0.20)",
    accent: "#f472b6",
    accentSoft: "rgba(244, 114, 182, 0.18)",
    border: "#334155",
    borderSubtle: "#24324f",
    borderCss: "1px solid #334155",
    radius: "18px",
    radiusSmall: "12px",
    shadow: "0 20px 50px rgba(2, 6, 23, 0.42)",
    softShadow: "0 8px 24px rgba(2, 6, 23, 0.26)",
    sectionPadding: "24px",
    cardPadding: "16px",
    gap: "12px",
    bodyFontSize: "15px",
    smallFontSize: "12.5px",
    h1FontSize: "30px",
    h2FontSize: "20px",
    h3FontSize: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    outerBackground:
      "radial-gradient(circle at 10% 0%, rgba(96, 165, 250, 0.18), transparent 28%), linear-gradient(180deg, #0f172a, #101828)"
  },
  "knowledge-nonfiction": {
    bg: "#f8fafc",
    surface: "#ffffff",
    panel: "#eef6ff",
    text: "#172033",
    muted: "#64748b",
    primary: "#2563eb",
    primarySoft: "#dbeafe",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
    border: "#cbd5e1",
    borderSubtle: "#e2e8f0",
    borderCss: "1px solid #dbe5f0",
    radius: "22px",
    radiusSmall: "16px",
    shadow: "0 18px 44px rgba(15, 23, 42, 0.10)",
    softShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
    sectionPadding: "28px",
    cardPadding: "18px",
    gap: "14px",
    bodyFontSize: "15px",
    smallFontSize: "12.5px",
    h1FontSize: "30px",
    h2FontSize: "20px",
    h3FontSize: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    outerBackground: "radial-gradient(circle at 12% 0%, rgba(37, 99, 235, 0.12), transparent 30%), #f8fafc"
  },
  "academic-professional": {
    bg: "#f5f7fb",
    surface: "#ffffff",
    panel: "#f1f5f9",
    text: "#111827",
    muted: "#4b5563",
    primary: "#1e3a8a",
    primarySoft: "#e0e7ff",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
    border: "#9ca3af",
    borderSubtle: "#d1d5db",
    borderCss: "1px solid #cbd5e1",
    radius: "12px",
    radiusSmall: "8px",
    shadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    softShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    sectionPadding: "24px",
    cardPadding: "16px",
    gap: "12px",
    bodyFontSize: "14.5px",
    smallFontSize: "12.5px",
    h1FontSize: "27px",
    h2FontSize: "18px",
    h3FontSize: "15px",
    fontFamily: "Georgia, 'Times New Roman', 'Noto Serif SC', 'Songti SC', SimSun, serif",
    outerBackground: "linear-gradient(180deg, #ffffff, #f5f7fb)"
  },
  "youth-light": {
    bg: "#fff7fb",
    surface: "#ffffff",
    panel: "#fef2f9",
    text: "#2d1930",
    muted: "#81556f",
    primary: "#db2777",
    primarySoft: "#fce7f3",
    accent: "#8b5cf6",
    accentSoft: "#ede9fe",
    border: "#f9a8d4",
    borderSubtle: "#fbcfe8",
    borderCss: "1px solid #f9a8d4",
    radius: "20px",
    radiusSmall: "14px",
    shadow: "0 14px 34px rgba(190, 24, 93, 0.10)",
    softShadow: "0 6px 16px rgba(190, 24, 93, 0.06)",
    sectionPadding: "24px",
    cardPadding: "16px",
    gap: "12px",
    bodyFontSize: "14.5px",
    smallFontSize: "12.5px",
    h1FontSize: "28px",
    h2FontSize: "19px",
    h3FontSize: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    outerBackground: "radial-gradient(circle at 15% 0%, rgba(219, 39, 119, 0.12), transparent 32%), #fff7fb"
  }
};

const bookProfileDefinitions: Record<ResolvedBookStyleProfile, BookProfileDefinition> = {
  "literary-classic": {
    theme: bookThemes["literary-classic"],
    treatment: { leadTreatment: "导读", sectionTreatment: "章节脉络", sourceTreatment: "参考与延伸" }
  },
  "web-fiction": {
    theme: bookThemes["web-fiction"],
    treatment: { leadTreatment: "速览", sectionTreatment: "看点", sourceTreatment: "来源" }
  },
  "knowledge-nonfiction": {
    theme: bookThemes["knowledge-nonfiction"],
    treatment: { leadTreatment: "核心观点", sectionTreatment: "知识结构", sourceTreatment: "证据来源" }
  },
  "academic-professional": {
    theme: bookThemes["academic-professional"],
    treatment: { leadTreatment: "摘要", sectionTreatment: "结构", sourceTreatment: "文献来源" }
  },
  "youth-light": {
    theme: bookThemes["youth-light"],
    treatment: { leadTreatment: "一句话推荐", sectionTreatment: "亮点", sourceTreatment: "来源" }
  }
};

const strategyByKind: Record<BookPageKind, ResolvedBookExpressionStrategy> = {
  recommendation: "catalog",
  summary: "top-down",
  evaluation: "decision"
};

export function resolveBookStyleProfile(profile: BookStyleProfile, text = ""): ResolvedBookStyleProfile {
  if (profile !== "auto") {
    return profile;
  }

  const normalized = text.toLowerCase();

  if (/网文|修仙|玄幻|仙侠|快穿|爽文|连载|男频|女频/.test(normalized)) {
    return "web-fiction";
  }

  if (/专业|教材|学术|研究|论文|统计|编程|工程|医学|法律|金融|管理|方法/.test(normalized)) {
    return "academic-professional";
  }

  if (/历史|社会|经济|科普|商业|传记|非虚构|知识|认知/.test(normalized)) {
    return "knowledge-nonfiction";
  }

  if (/治愈|轻松|青春|轻小说|亲子|成长|温暖/.test(normalized)) {
    return "youth-light";
  }

  if (/经典|文学|小说|文艺|散文|诗歌/.test(normalized)) {
    return "literary-classic";
  }

  return "knowledge-nonfiction";
}

export function resolveBookProfileDefinition(profile: ResolvedBookStyleProfile): BookProfileDefinition {
  return bookProfileDefinitions[profile];
}

export function resolveBookTheme(profile: BookStyleProfile, text = ""): BookThemeTokens {
  return bookThemes[resolveBookStyleProfile(profile, text)];
}

export function resolveBookStrategy(kind: BookPageKind, requested: BookExpressionStrategy | undefined): ResolvedBookExpressionStrategy {
  if (requested && requested !== "auto") {
    return requested;
  }

  return strategyByKind[kind];
}
