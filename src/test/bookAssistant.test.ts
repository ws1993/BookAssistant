import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSearchArgs,
  parseSmartSearchJson,
  resolveSmartSearchExecutable,
  runSmartSearchSearch,
} from "../adapters/smartSearchClient.js";
import { normalizeToolArguments } from "../adapters/normalizeToolArguments.js";
import { collectEvidenceSources } from "../adapters/evidenceNormalizer.js";
import { createEvaluationResult } from "../orchestrators/bookEvaluation.js";
import { createRecommendationResult } from "../orchestrators/bookRecommendation.js";
import { createSummaryResult } from "../orchestrators/bookSummary.js";
import { adaptBookRenderDocumentToHtmlPage, validateHtmlPageInput } from "../renderers/bookRenderHtmlPageAdapter.js";
import { buildBookRenderDocument, validateBookRenderDocument } from "../renderers/bookRenderDocument.js";
import type { HtmlPageThemeTokens } from "../renderers/htmlPageRenderer.js";
import { renderBookAssistantHtml } from "../renderers/bookHtmlRenderer.js";
import { listToolDefinitions } from "../server/toolRegistry.js";
import type { HtmlPageInput } from "../schemas/htmlPageSchema.js";
import { resolveBookStyleProfile, resolveBookTheme } from "../styles/bookThemes.js";
import { presentBookAssistantResult } from "../tools/presentBookAssistantResult.js";

async function withSmartSearchUnavailable<T>(callback: () => Promise<T>): Promise<T> {
  const originalPath = process.env.PATH;
  const originalPathAlias = process.env.Path;
  const originalBookAssistantCommand = process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
  const originalSmartSearchCommand = process.env.SMART_SEARCH_COMMAND;
  const originalSmartSearchBin = process.env.SMART_SEARCH_BIN;

  process.env.PATH = "";
  process.env.Path = "";
  process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND = "definitely-not-smart-search";
  process.env.SMART_SEARCH_COMMAND = "definitely-not-smart-search";
  process.env.SMART_SEARCH_BIN = "definitely-not-smart-search";

  try {
    return await callback();
  } finally {
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }

    if (originalPathAlias === undefined) {
      delete process.env.Path;
    } else {
      process.env.Path = originalPathAlias;
    }

    if (originalBookAssistantCommand === undefined) {
      delete process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
    } else {
      process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND = originalBookAssistantCommand;
    }

    if (originalSmartSearchCommand === undefined) {
      delete process.env.SMART_SEARCH_COMMAND;
    } else {
      process.env.SMART_SEARCH_COMMAND = originalSmartSearchCommand;
    }

    if (originalSmartSearchBin === undefined) {
      delete process.env.SMART_SEARCH_BIN;
    } else {
      process.env.SMART_SEARCH_BIN = originalSmartSearchBin;
    }
  }
}

function assertNoSpawnErrorContent(value: unknown): void {
  const text = JSON.stringify(value);

  assert.doesNotMatch(text, /spawn smart-search ENOENT/);
  assert.doesNotMatch(text, /spawn definitely-not-smart-search ENOENT/);
}

test("buildSearchArgs includes standard smart-search flags", () => {
  const args = buildSearchArgs("test query", { validation: "fast", extraSources: 2, timeoutSeconds: 30 });

  assert.deepEqual(args.slice(0, 3), ["test query", "--validation", "fast"]);
  assert.ok(args.includes("--extra-sources"));
  assert.ok(args.includes("--timeout"));
  assert.ok(args.includes("--no-stream"));
});

test("normalizeToolArguments parses JSON strings and falls back to text", () => {
  assert.deepEqual(normalizeToolArguments('{"query":"悬疑"}'), { query: "悬疑" });
  assert.deepEqual(normalizeToolArguments("  hello  "), { text: "hello" });
});

test("resolveBookStyleProfile picks a matching visual profile", () => {
  assert.equal(resolveBookStyleProfile("auto", "修仙爽文 连载"), "web-fiction");
  assert.equal(resolveBookStyleProfile("auto", "历史 科普 非虚构"), "knowledge-nonfiction");
  assert.equal(resolveBookStyleProfile("auto", "文学 经典 小说"), "literary-classic");
});

test("collectEvidenceSources preserves URLs and short excerpts", () => {
  const sources = collectEvidenceSources("See https://example.com/book for details.");

  assert.ok(sources.some((source) => source.url === "https://example.com/book"));
  assert.ok(sources.some((source) => (source.excerpt ?? "").includes("See")));
});

test("buildBookRenderDocument creates a more generic page model for recommendation results", () => {
  const document = buildBookRenderDocument({
    kind: "recommendation",
    title: "图书推荐：悬疑",
    query: "我想看悬疑推理",
    profile: "knowledge-nonfiction",
    summary: "适合喜欢悬疑推理的读者。",
    items: [
      {
        rank: 1,
        title: "无人生还",
        author: "阿加莎·克里斯蒂",
        reason: "经典密室/孤岛悬疑，节奏紧凑。",
        fit: "适合喜欢烧脑推理的读者",
        tags: ["悬疑", "经典"],
        sources: []
      }
    ],
    evidence: [],
    notes: ["示例输出"]
  });

  assert.equal(document.kind, "recommendation");
  assert.equal(document.title, "图书推荐：悬疑");
  assert.equal(document.template, "report");
  assert.equal(document.theme, "modern-blue");
  assert.equal(document.sections[0]?.type, "hero");
  assert.equal(document.sections[1]?.type, "features");
});

test("validateBookRenderDocument rejects empty generic sections", () => {
  assert.throws(
    () => validateBookRenderDocument({
      kind: "recommendation",
      title: "图书推荐",
      profile: "knowledge-nonfiction",
      template: "report",
      theme: "modern-blue",
      sections: []
    }),
    /至少需要一个渲染分区/
  );
});

test("validateHtmlPageInput rejects empty html page sections", () => {
  assert.throws(
    () => validateHtmlPageInput({
      template: "report",
      title: "图书推荐",
      lang: "zh-CN",
      theme: "modern-blue",
      sections: []
    }),
    /At least one section is required/
  );
});

test("adaptBookRenderDocumentToHtmlPage maps generic document to HtmlPageInput", () => {
  const page = adaptBookRenderDocumentToHtmlPage(buildBookRenderDocument({
    kind: "recommendation",
    title: "图书推荐：悬疑",
    query: "我想看悬疑推理",
    profile: "knowledge-nonfiction",
    summary: "适合喜欢悬疑推理的读者。",
    items: [
      {
        rank: 1,
        title: "无人生还",
        author: "阿加莎·克里斯蒂",
        reason: "经典密室/孤岛悬疑，节奏紧凑。",
        fit: "适合喜欢烧脑推理的读者",
        tags: ["悬疑", "经典"],
        sources: []
      }
    ],
    evidence: [],
    notes: ["示例输出"]
  }));

  assert.equal(page.template, "report");
  assert.equal(page.theme, "modern-blue");
  assert.equal(page.sections[0]?.type, "hero");
  assert.equal(page.sections[1]?.type, "features");
});

test("presentBookAssistantResult validates and renders HTML", () => {
  const response = presentBookAssistantResult({
    kind: "recommendation",
    title: "图书推荐：悬疑",
    query: "我想看悬疑推理",
    profile: "knowledge-nonfiction",
    summary: "适合喜欢悬疑推理的读者。",
    items: [
      {
        rank: 1,
        title: "无人生还",
        author: "阿加莎·克里斯蒂",
        reason: "经典密室/孤岛悬疑，节奏紧凑。",
        fit: "适合喜欢烧脑推理的读者",
        tags: ["悬疑", "经典"],
        sources: []
      }
    ],
    evidence: [],
    notes: ["示例输出"]
  });

  assert.equal(response.content[0]?.type, "text");
  assert.match(String(response.content[0]?.text ?? ""), /data-book-assistant="recommendation"/);
});

test("presentBookAssistantResult does not duplicate render document assembly", () => {
  const source = readFileSync(path.join(process.cwd(), "src/tools/presentBookAssistantResult.ts"), "utf8");

  assert.doesNotMatch(source, /buildBookRenderDocument/);
  assert.doesNotMatch(source, /validateBookRenderDocument/);
});

test("renderHtmlPage renders a generic HtmlPageInput without a book result", async () => {
  const rendererModule = await import("../renderers/htmlPageRenderer.js").catch(() => undefined) as ({
    renderHtmlPage?: (page: HtmlPageInput, options: {
      attributes: Record<string, string>;
      heroBadge: { text: string; background: string; color: string };
      theme: HtmlPageThemeTokens;
    }) => string;
  } | undefined);

  assert.equal(typeof rendererModule?.renderHtmlPage, "function");

  const theme: HtmlPageThemeTokens = {
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
    fontFamily: "Arial, sans-serif",
    outerBackground: "#f8fafc"
  };

  const html = rendererModule?.renderHtmlPage?.({
    template: "article",
    title: "通用页面",
    lang: "zh-CN",
    theme: "minimal-gray",
    sections: [
      { type: "hero", heading: "通用页面", subheading: "不依赖 BookAssistantResult。" },
      { type: "faq", heading: "常见问题", items: [{ question: "能否单独渲染？", answer: "可以。" }] }
    ]
  }, {
    attributes: { "data-book-assistant": "summary" },
    heroBadge: { text: "图书总结", background: theme.primarySoft, color: theme.primary },
    theme
  }) ?? "";

  assert.match(html, /data-template="article"/);
  assert.match(html, /data-theme="minimal-gray"/);
  assert.match(html, /通用页面/);
  assert.match(html, /能否单独渲染？/);
});

test("htmlPageRenderer does not depend on book theme module", () => {
  const source = readFileSync(path.join(process.cwd(), "src/renderers/htmlPageRenderer.ts"), "utf8");

  assert.doesNotMatch(source, /bookThemes/);
});

test("assembleBookHtmlPage exposes second-layer page assembly", async () => {
  const assemblerModule = await import("../renderers/bookHtmlPageAssembler.js").catch(() => undefined) as ({
    assembleBookHtmlPage?: (result: {
      kind: "recommendation";
      title: string;
      query: string;
      profile: "knowledge-nonfiction";
      summary: string;
      items: Array<{
        rank: number;
        title: string;
        author?: string;
        reason: string;
        fit: string;
        tags: string[];
        sources: [];
      }>;
      evidence: [];
      notes: string[];
    }) => {
      page: HtmlPageInput;
      renderOptions: {
        attributes: Record<string, string>;
        heroBadge: { text: string; background: string; color: string };
        theme: HtmlPageThemeTokens;
      };
    };
  } | undefined);

  assert.equal(typeof assemblerModule?.assembleBookHtmlPage, "function");

  const assembled = assemblerModule?.assembleBookHtmlPage?.({
    kind: "recommendation",
    title: "图书推荐：悬疑",
    query: "我想看悬疑推理",
    profile: "knowledge-nonfiction",
    summary: "适合喜欢悬疑推理的读者。",
    items: [
      {
        rank: 1,
        title: "无人生还",
        author: "阿加莎·克里斯蒂",
        reason: "经典密室/孤岛悬疑，节奏紧凑。",
        fit: "适合喜欢烧脑推理的读者",
        tags: ["悬疑", "经典"],
        sources: []
      }
    ],
    evidence: [],
    notes: ["示例输出"]
  });

  assert.equal(assembled?.page.template, "report");
  assert.equal(assembled?.page.sections[0]?.type, "hero");
  assert.equal(assembled?.renderOptions.attributes["data-book-assistant"], "recommendation");
  assert.equal(assembled?.renderOptions.heroBadge.text, "图书推荐");
});

test("renderBookAssistantHtml renders faq sections from HtmlPageInput path", () => {
  const html = renderBookAssistantHtml({
    kind: "clarification",
    title: "需要补充书目信息",
    intro: "这本书的身份还不够明确，需要更多线索。",
    questions: [
      { id: "author", label: "这本书的作者是谁？" },
      { id: "isbn", label: "如果有 ISBN，请提供。" }
    ],
    styleProfile: "knowledge-nonfiction"
  });

  assert.match(html, /需要补充信息/);
  assert.match(html, /这本书的作者是谁？/);
});

test("renderBookAssistantHtml uses generic section rendering path", () => {
  const html = renderBookAssistantHtml({
    kind: "summary",
    title: "图书总结：置身事内",
    profile: "knowledge-nonfiction",
    bookTitle: "置身事内",
    author: "兰小欢",
    spoilerPolicy: "safe",
    overview: "一本从财政与地方治理角度理解中国经济运作的非虚构作品。",
    keyPoints: ["土地财政", "地方激励"],
    structure: ["制度背景", "运行逻辑"],
    audience: ["关心中国经济的读者"],
    sources: [],
    notes: ["基于公开资料整理"]
  });

  assert.match(html, /data-template="report"/);
  assert.match(html, /关键要点/);
  assert.match(html, /土地财政/);
});

test("renderBookAssistantHtml renders recommendation output", () => {
  const html = renderBookAssistantHtml({
    kind: "recommendation",
    title: "图书推荐：悬疑",
    query: "我想看悬疑推理",
    profile: "knowledge-nonfiction",
    summary: "适合喜欢悬疑推理的读者。",
    items: [
      {
        rank: 1,
        title: "无人生还",
        author: "阿加莎·克里斯蒂",
        reason: "经典密室/孤岛悬疑，节奏紧凑。",
        fit: "适合喜欢烧脑推理的读者",
        tags: ["悬疑", "经典"],
        sources: []
      }
    ],
    evidence: [],
    notes: ["示例输出"]
  });

  assert.match(html, /data-book-assistant="recommendation"/);
  assert.match(html, /无人生还/);
});

test("listToolDefinitions exposes the three book tools", () => {
  const tools = listToolDefinitions();

  assert.deepEqual(tools.map((tool) => tool.name), ["recommend_books", "summarize_book", "evaluate_book"]);
});

test("parseSmartSearchJson handles code fences", () => {
  const parsed = parseSmartSearchJson("```json\n{\"ok\":true}\n```");

  assert.deepEqual(parsed, { ok: true });
});

test("resolveSmartSearchExecutable resolves Windows command shims", () => {
  const directory = path.join(tmpdir(), `book-assistant-${process.pid}-${Date.now()}`);
  mkdirSync(directory, { recursive: true });

  try {
    const executableName = process.platform === "win32" ? "smart-search.cmd" : "smart-search";
    const executablePath = path.join(directory, executableName);
    writeFileSync(executablePath, process.platform === "win32" ? "@echo off\r\n" : "#!/bin/sh\n");

    const resolved = resolveSmartSearchExecutable(path.join(directory, "smart-search"));

    assert.equal(resolved?.file, executablePath);
    assert.equal(resolved?.shell, process.platform === "win32");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("runSmartSearchSearch returns actionable failure when CLI is missing", async () => {
  const previousCommand = process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
  process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND = path.join(tmpdir(), "missing-smart-search-command");

  try {
    const result = await runSmartSearchSearch("test query", { timeoutSeconds: 1 });

    assert.equal(result.ok, false);
    assert.equal(result.rawText, "");
    assert.deepEqual(result.sources, []);
    assert.match(result.error ?? "", /未找到 smart-search CLI/);
    assertNoSpawnErrorContent(result);
  } finally {
    if (previousCommand === undefined) {
      delete process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
    } else {
      process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND = previousCommand;
    }
  }
});

test("summary output does not treat missing smart-search as book content", async () => {
  const result = await withSmartSearchUnavailable(() => createSummaryResult({
    title: "置身事内",
    author: "兰小欢",
    spoilerPolicy: "safe",
    language: "zh-CN",
    styleProfile: "auto"
  }));

  assert.equal(result.kind, "summary");
  assertNoSpawnErrorContent(result);
  assert.match(result.overview, /暂时无法检索|当前证据不足/);
  assert.equal(result.sources.length, 0);
  assert.ok(result.notes.some((note) => note.includes("smart-search")));

  const html = renderBookAssistantHtml(result);
  assert.match(html, /smart-search/);
  assertNoSpawnErrorContent(html);
});

test("recommendation output does not treat missing smart-search as recommendations", async () => {
  const result = await withSmartSearchUnavailable(() => createRecommendationResult({
    query: "我想读适合了解中国经济和地方政府运作的非虚构书籍",
    audience: "成年读者",
    genre: "经济非虚构",
    tone: "清晰严谨",
    constraints: [],
    avoid: [],
    count: 3,
    language: "zh-CN",
    styleProfile: "auto"
  }));

  assert.equal(result.kind, "recommendation");
  assertNoSpawnErrorContent(result);
  assert.match(result.summary, /暂时无法检索|当前证据不足/);
  assert.equal(result.items.length, 0);
  assert.equal(result.evidence.length, 0);
  assert.ok(result.notes.some((note) => note.includes("smart-search")));

  const html = renderBookAssistantHtml(result);
  assert.match(html, /smart-search/);
  assertNoSpawnErrorContent(html);
});

test("evaluation output does not treat missing smart-search as review content", async () => {
  const result = await withSmartSearchUnavailable(() => createEvaluationResult({
    title: "置身事内",
    author: "兰小欢",
    language: "zh-CN",
    styleProfile: "auto"
  }));

  assert.equal(result.kind, "evaluation");
  assertNoSpawnErrorContent(result);
  assert.match(result.verdict, /暂时无法检索|当前证据不足/);
  assert.ok(Number.isNaN(result.score));
  assert.deepEqual(result.pros, []);
  assert.deepEqual(result.cons, []);
  assert.equal(result.sources.length, 0);
  assert.ok(result.notes.some((note) => note.includes("smart-search")));

  const html = renderBookAssistantHtml(result);
  assert.match(html, /smart-search/);
  assertNoSpawnErrorContent(html);
});
