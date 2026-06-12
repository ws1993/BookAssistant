import assert from "node:assert/strict";
import test from "node:test";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { composeBookPage } from "../composer/composeBookPage.js";
import { renderBookHtml } from "../renderers/book/renderBookHtml.js";
import { bookPageSchema } from "../schemas/bookPageSchema.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { listToolDefinitions } from "../server/toolRegistry.js";
import { runSmartSearchSearch } from "../adapters/smartSearchClient.js";
import { buildGuidancePackage } from "../orchestrators/guidance.js";
import { createSummaryPackage } from "../orchestrators/bookSummary.js";

test("tool registry exposes 5 tools", () => {
  const tools = listToolDefinitions();
  assert.equal(tools.length, 5);
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("recommend_books"));
  assert.ok(names.includes("summarize_book"));
  assert.ok(names.includes("evaluate_book"));
  assert.ok(names.includes("compose_book_page"));
  assert.ok(names.includes("render_book_html"));
});

test("composeBookPage validates minimal page", () => {
  const result = composeBookPage({
    page: {
      kind: "summary",
      title: "Test Book",
      expression: { coreViewpoint: "Core insight." }
    }
  });

  assert.equal(result.readyToRender, true);
  assert.equal(result.errors.length, 0);
});

test("composeBookPage rejects missing kind", () => {
  const result = composeBookPage({ page: { title: "Test" } });
  assert.equal(result.readyToRender, false);
  assert.ok(result.errors.length > 0);
});

test("composeBookPage escapes script tags in rich text", () => {
  const result = composeBookPage({
    page: {
      kind: "evaluation",
      title: "Test",
      expression: { coreViewpoint: "<script>alert(1)</script>" }
    }
  });

  assert.equal(result.readyToRender, true);
  assert.ok(result.dryRun && !result.dryRun.containsScript);
});

test("renderBookHtml produces inline HTML", () => {
  const page = {
    kind: "recommendation" as const,
    title: "Test Books",
    styleProfile: "knowledge-nonfiction" as const,
    expression: { coreViewpoint: "Great reads." },
    expressions: [],
    sources: []
  };

  const html = renderBookHtml(page);
  assert.ok(html.includes("data-book-assistant="));
  assert.ok(html.includes("background:"));
  assert.ok(!html.includes("<!doctype"));
  assert.ok(!html.includes("<html"));
});

test("bookPageSchema accepts all 9 expression types", () => {
  const expressions = [
    { type: "lead", body: "Intro" },
    { type: "key-takeaways", items: [{ title: "Point 1" }] },
    { type: "executive-summary", recommendation: "Do this" },
    { type: "evidence-map", claim: "Claim", evidence: [{ title: "E1" }] },
    { type: "decision-matrix", title: "Matrix", criteria: ["C1"], options: [{ name: "O1" }] },
    { type: "argument-map", claim: "Arg", reasons: [{ title: "R1" }] },
    { type: "process-guide", title: "Guide", goal: "Goal", steps: [{ title: "S1" }] },
    { type: "ranked-list", title: "List", items: [{ title: "I1" }] },
    { type: "section-outline", title: "Outline", sections: [{ title: "S1" }] }
  ];

  for (const expr of expressions) {
    const parsed = bookPageSchema.safeParse({
      kind: "summary",
      title: "Test",
      expressions: [expr]
    });
    assert.ok(parsed.success, `Expression ${expr.type} should validate`);
  }
});

test("resolveBookStyleProfile detects web-fiction", () => {
  const profile = resolveBookStyleProfile("auto", "网文修仙");
  assert.equal(profile, "web-fiction");
});

test("resolveBookStyleProfile detects academic-professional", () => {
  const profile = resolveBookStyleProfile("auto", "学术研究");
  assert.equal(profile, "academic-professional");
});

test("guidance asks host model for richer top-down book pages", () => {
  const { guidance, pageSkeleton } = buildGuidancePackage("summary", "图书总结：测试书", "knowledge-nonfiction");
  const expressions = pageSkeleton.expressions as Array<{ type: string }>;

  assert.ok(guidance.some((line) => line.includes("先总后分")));
  assert.ok(guidance.some((line) => line.includes("不要只给一句话")));
  assert.ok(expressions.length >= 4);
  assert.equal(expressions[0]?.type, "lead");
  assert.ok(expressions.some((expression) => expression.type === "key-takeaways"));
  assert.ok(expressions.some((expression) => expression.type === "evidence-map"));
});

test("resolveBookStyleProfile maps varied book themes to distinct visual profiles", () => {
  assert.equal(resolveBookStyleProfile("auto", "《三体》刘慈欣 科幻 宇宙文明"), "web-fiction");
  assert.equal(resolveBookStyleProfile("auto", "《置身事内》经济 政府 产业 政策"), "knowledge-nonfiction");
  assert.equal(resolveBookStyleProfile("auto", "《算法导论》计算机科学 教材 课程"), "academic-professional");
  assert.equal(resolveBookStyleProfile("auto", "《小王子》童话 成长 温柔"), "youth-light");
  assert.equal(resolveBookStyleProfile("auto", "《百年孤独》文学 经典 拉美小说"), "literary-classic");
});

test("renderBookHtml includes distinct visual signatures by resolved theme", () => {
  const fictionHtml = renderBookHtml({
    kind: "summary",
    title: "三体 科幻 宇宙文明",
    styleProfile: "auto",
    expression: { coreViewpoint: "文明尺度下的命运寓言。" }
  });
  const academicHtml = renderBookHtml({
    kind: "summary",
    title: "算法导论 计算机科学 教材",
    styleProfile: "auto",
    expression: { coreViewpoint: "系统学习算法设计与分析。" }
  });

  assert.match(fictionHtml, /data-style-profile="web-fiction"/);
  assert.match(fictionHtml, /data-visual-signature="genre-pulse"/);
  assert.match(academicHtml, /data-style-profile="academic-professional"/);
  assert.match(academicHtml, /data-visual-signature="research-dossier"/);
});

test("createSummaryPackage uses a fast smart-search budget", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "book-assistant-summary-budget-"));
  const mockScriptPath = path.join(dir, "smart-search-mock.cjs");
  const commandPath = path.join(dir, process.platform === "win32" ? "smart-search.cmd" : "smart-search");
  const originalPath = process.env.PATH;
  const originalBookCommand = process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
  const originalSmartCommand = process.env.SMART_SEARCH_COMMAND;
  const originalSmartBin = process.env.SMART_SEARCH_BIN;

  await writeFile(
    mockScriptPath,
    [
      "const args = process.argv.slice(2);",
      "process.stdout.write(JSON.stringify({",
      "  content: args.join(' '),",
      "  sources: [{ title: 'Budget Source', url: 'https://example.com/budget' }]",
      "}));"
    ].join("\n"),
    "utf8"
  );

  if (process.platform === "win32") {
    await writeFile(commandPath, `@echo off\r\nnode "%~dp0smart-search-mock.cjs" %*\r\n`, "utf8");
  } else {
    await writeFile(commandPath, `#!/usr/bin/env sh\nnode "$(dirname "$0")/smart-search-mock.cjs" "$@"\n`, "utf8");
    await chmod(commandPath, 0o755);
  }

  process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ""}`;
  delete process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
  delete process.env.SMART_SEARCH_COMMAND;
  delete process.env.SMART_SEARCH_BIN;

  try {
    const result = await createSummaryPackage({
      title: "三体",
      author: "刘慈欣",
      spoilerPolicy: "safe",
      language: "zh-CN",
      styleProfile: "auto"
    });

    assert.equal(result.status, "evidence_collected");
    assert.equal(result.searchOk, true);
    assert.match(result.evidenceDigest, /--validation fast/);
    assert.match(result.evidenceDigest, /--extra-sources 0/);
    assert.match(result.evidenceDigest, /--timeout 25/);
  } finally {
    process.env.PATH = originalPath;

    if (originalBookCommand === undefined) {
      delete process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
    } else {
      process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND = originalBookCommand;
    }

    if (originalSmartCommand === undefined) {
      delete process.env.SMART_SEARCH_COMMAND;
    } else {
      process.env.SMART_SEARCH_COMMAND = originalSmartCommand;
    }

    if (originalSmartBin === undefined) {
      delete process.env.SMART_SEARCH_BIN;
    } else {
      process.env.SMART_SEARCH_BIN = originalSmartBin;
    }
  }
});

test("runSmartSearchSearch resolves smart-search from PATH", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "book-assistant-smart-search-mock-"));
  const mockScriptPath = path.join(dir, "smart-search-mock.cjs");
  const commandPath = path.join(dir, process.platform === "win32" ? "smart-search.cmd" : "smart-search");
  const originalPath = process.env.PATH;
  const originalBookCommand = process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
  const originalSmartCommand = process.env.SMART_SEARCH_COMMAND;
  const originalSmartBin = process.env.SMART_SEARCH_BIN;

  await writeFile(
    mockScriptPath,
    [
      "const args = process.argv.slice(2);",
      "process.stdout.write(JSON.stringify({",
      "  content: `mock response for ${args[1] ?? ''}`,",
      "  sources: [{ title: 'Mock Source', url: 'https://example.com/mock' }]",
      "}));"
    ].join("\n"),
    "utf8"
  );

  if (process.platform === "win32") {
    await writeFile(commandPath, `@echo off\r\nnode "%~dp0smart-search-mock.cjs" %*\r\n`, "utf8");
  } else {
    await writeFile(commandPath, `#!/usr/bin/env sh\nnode "$(dirname "$0")/smart-search-mock.cjs" "$@"\n`, "utf8");
    await chmod(commandPath, 0o755);
  }

  process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ""}`;
  delete process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
  delete process.env.SMART_SEARCH_COMMAND;
  delete process.env.SMART_SEARCH_BIN;

  try {
    const result = await runSmartSearchSearch("PATH lookup smoke", {
      extraSources: 0,
      timeoutSeconds: 5
    });

    assert.equal(result.ok, true);
    assert.match(result.rawText, /mock response for PATH lookup smoke/);
    assert.ok(result.sources.some((source) => source.url === "https://example.com/mock"));
  } finally {
    process.env.PATH = originalPath;

    if (originalBookCommand === undefined) {
      delete process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND;
    } else {
      process.env.BOOK_ASSISTANT_SMART_SEARCH_COMMAND = originalBookCommand;
    }

    if (originalSmartCommand === undefined) {
      delete process.env.SMART_SEARCH_COMMAND;
    } else {
      process.env.SMART_SEARCH_COMMAND = originalSmartCommand;
    }

    if (originalSmartBin === undefined) {
      delete process.env.SMART_SEARCH_BIN;
    } else {
      process.env.SMART_SEARCH_BIN = originalSmartBin;
    }
  }
});
