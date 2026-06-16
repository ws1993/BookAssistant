import { z } from "zod";
import { parseJsonString } from "../adapters/parseJsonString.js";
import { bookPageSchema, type BookPageOutput } from "../schemas/bookPageSchema.js";
import { perfMonitor } from "../utils/performanceMonitor.js";
import { renderBookHtml } from "../renderers/book/renderBookHtml.js";

export interface ComposeDiagnostic {
  path: string;
  code: string;
  message: string;
  fix: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeArguments(value: unknown): Record<string, unknown> {
  const args = parseJsonString(value, "arguments");

  if (!isRecord(args)) {
    return {};
  }

  return isRecord(args.params) && !("page" in args) ? args.params : args;
}

function pathToString(path: PropertyKey[]): string {
  return `page${path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("")}`;
}

function diagnostic(path: string, code: string, message: string, fix: string): ComposeDiagnostic {
  return { path, code, message, fix };
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function zodFixForIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.join(".");

  if (path.includes("expressions")) {
    return "使用受支持的语义表达对象（lead / key-takeaways / ranked-list / section-outline / evidence-map / decision-matrix / argument-map / process-guide / executive-summary），并补齐该类型的必填字段。";
  }

  if (path.includes("sources")) {
    return "sources[] 每项至少要有 title；url、excerpt、confidence 可选。";
  }

  if (path.includes("kind")) {
    return "kind 必须是 recommendation、summary 或 evaluation 之一。";
  }

  return "按 book page schema 调整该字段后再渲染。";
}

function zodDiagnostics(error: z.ZodError): ComposeDiagnostic[] {
  return error.issues.map((issue) =>
    diagnostic(pathToString(issue.path), String(issue.code), issue.message, zodFixForIssue(issue))
  );
}

const markdownTablePattern = /^\s*\|.+\|\s*$/m;
const markdownHeadingPattern = /^\s{0,3}#{1,6}\s+\S/m;
const markdownListPattern = /^\s*(?:[-*+] |\d+\.\s+)\S/m;
const markdownBoldPattern = /\*\*[^*]+\*\*/;
const codeFencePattern = /```/;

function collectMarkdownWarnings(value: unknown, path: Array<string | number> = []): ComposeDiagnostic[] {
  const warnings: ComposeDiagnostic[] = [];

  if (typeof value === "string") {
    const stringPath = pathToString(path);

    if (codeFencePattern.test(value)) {
      warnings.push(
        diagnostic(
          stringPath,
          "markdown_code_fence",
          "富文本字段里的 ``` 代码块会被转义成纯文本。",
          "把内容改成正文、步骤或要点，不要使用代码块围栏。"
        )
      );
    }

    if (markdownTablePattern.test(value)) {
      warnings.push(
        diagnostic(
          stringPath,
          "markdown_table",
          "Markdown 表格不会被渲染成 HTML 表格。",
          "改用 decision-matrix 表达式承载对比信息。"
        )
      );
    }

    if (markdownHeadingPattern.test(value)) {
      warnings.push(
        diagnostic(
          stringPath,
          "markdown_heading",
          "富文本字段里的 Markdown 标题会被当作纯文本渲染。",
          "把内容拆成多个带 title 的表达式或 section-outline。"
        )
      );
    }

    if (markdownListPattern.test(value)) {
      warnings.push(
        diagnostic(
          stringPath,
          "markdown_list",
          "富文本字段里的 Markdown 列表不会被转换成列表组件。",
          "改用 key-takeaways items、process-guide steps 或 ranked-list items。"
        )
      );
    }

    if (markdownBoldPattern.test(value)) {
      warnings.push(
        diagnostic(
          stringPath,
          "markdown_bold_marker",
          "Markdown 加粗标记不会被渲染成粗体。",
          "用 <strong> 标签或直接在措辞中强调。"
        )
      );
    }

    if (value.length > 1400) {
      warnings.push(
        diagnostic(
          stringPath,
          "long_rich_text_field",
          "这个富文本字段过长，可能压平页面层次。",
          "拆成多个表达式、步骤、条目或 outline section。"
        )
      );
    }

    return warnings;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => warnings.push(...collectMarkdownWarnings(item, [...path, index])));
    return warnings;
  }

  if (isRecord(value)) {
    Object.entries(value).forEach(([key, nested]) => warnings.push(...collectMarkdownWarnings(nested, [...path, key])));
  }

  return warnings;
}

function createDryRunSummary(page: BookPageOutput): Promise<Record<string, unknown>> {
  return renderBookHtml(page).then((html) => {
    const rootDataAttribute = html.match(/data-book-assistant="([^"]+)"/)?.[1];

    return {
      renderable: true,
      htmlLength: html.length,
      rootDataAttribute,
      containsHtmlDocumentTag: /<!doctype|<html|<body/i.test(html),
      containsScript: /<script\b/i.test(html)
    };
  });
}

export interface ComposeBookPageResult {
  readyToRender: boolean;
  errors: ComposeDiagnostic[];
  warnings: ComposeDiagnostic[];
  dryRun?: Record<string, unknown>;
  normalizedArguments?: { page: BookPageOutput };
  nextAction: string;
}

export async function composeBookPage(value: unknown): Promise<ComposeBookPageResult> {
  return perfMonitor.measure("composeBookPage", async () => {
    perfMonitor.start("parse-arguments");
    const args = normalizeArguments(value);
    const errors: ComposeDiagnostic[] = [];
    const warnings: ComposeDiagnostic[] = [];
    let page: unknown;

    try {
      page = parseJsonString(args.page, "page");
    } catch (error) {
      errors.push(
        diagnostic(
          "page",
          "invalid_json",
          `page 必须是对象或合法 JSON 字符串。${formatUnknownError(error)}`,
          "优先以原生对象传入 page；若用 JSON 字符串，请正确转义引号和数组。"
        )
      );

      return { readyToRender: false, errors, warnings, nextAction: "revise_page" };
    }
    perfMonitor.end("parse-arguments");

    perfMonitor.start("markdown-warnings");
    warnings.push(...collectMarkdownWarnings(page));
    perfMonitor.end("markdown-warnings");

    perfMonitor.start("schema-validation");
    const parsed = bookPageSchema.safeParse(page);
    let dryRun: Record<string, unknown> | undefined;

    if (!parsed.success) {
      errors.push(...zodDiagnostics(parsed.error));
    } else if (args.dryRun !== false) {
      try {
        dryRun = await createDryRunSummary(parsed.data);

        if (dryRun.containsHtmlDocumentTag) {
          errors.push(
            diagnostic(
              "page",
              "dry_run_document_tag",
              "试渲染输出包含文档级标签。",
              "最终输出应是连续的 HTML 片段，不含 doctype/html/body 标签。"
            )
          );
        }

        if (dryRun.containsScript) {
          errors.push(
            diagnostic("page", "dry_run_script_tag", "试渲染输出包含 script 标签。", "渲染前移除类脚本内容。")
          );
        }
      } catch (error) {
        dryRun = { renderable: false, error: formatUnknownError(error) };
        errors.push(
          diagnostic(
            "page",
            "dry_run_failed",
            `page 通过了 schema 校验但试渲染失败：${formatUnknownError(error)}`,
            "调整 page 对象；若 schema 合法却无法渲染，请反馈为渲染器缺陷。"
          )
        );
      }
    }
    perfMonitor.end("schema-validation");

    const readyToRender = errors.length === 0;

    return {
      readyToRender,
      errors,
      warnings,
      dryRun,
      normalizedArguments: parsed.success ? { page: parsed.data } : undefined,
      nextAction: readyToRender ? "call_render_book_html_once" : "revise_page"
    };
  });
}
