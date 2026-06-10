import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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
import { renderBookAssistantHtml } from "../renderers/bookHtmlRenderer.js";
import { resolveBookStyleProfile } from "../styles/bookThemes.js";
import { listToolDefinitions } from "../server/toolRegistry.js";
import { createEvaluationResult } from "../orchestrators/bookEvaluation.js";
import { createRecommendationResult } from "../orchestrators/bookRecommendation.js";
import { createSummaryResult } from "../orchestrators/bookSummary.js";

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
