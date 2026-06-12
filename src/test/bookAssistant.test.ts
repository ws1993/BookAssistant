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
