import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { collectEvidenceSources, mergeEvidenceSources } from "./evidenceNormalizer.js";
import type { EvidenceSource } from "../orchestrators/types.js";

const defaultSmartSearchCommand = "smart-search";
const smartSearchCommandEnvKeys = ["BOOK_ASSISTANT_SMART_SEARCH_COMMAND", "SMART_SEARCH_COMMAND", "SMART_SEARCH_BIN"] as const;

export type SmartSearchCommand = "search" | "fetch";
export type SmartSearchFormat = "json" | "markdown" | "content";

export interface SmartSearchSearchOptions {
  validation?: "fast" | "balanced" | "strict";
  extraSources?: number;
  fallback?: "auto" | "off";
  providers?: string;
  format?: SmartSearchFormat;
  timeoutSeconds?: number;
}

export interface SmartSearchResult {
  ok: boolean;
  command: SmartSearchCommand;
  args: string[];
  stdout: string;
  stderr: string;
  rawText: string;
  data: unknown;
  sources: EvidenceSource[];
  error?: string;
}

interface SmartSearchExecutable {
  file: string;
  shell: boolean;
}

export function resolveSmartSearchExecutable(command: string): SmartSearchExecutable | undefined {
  if (!command.trim()) {
    return undefined;
  }

  const candidates = process.platform === "win32"
    ? [command, `${command}.cmd`, `${command}.exe`, `${command}.bat`]
    : [command];

  const matched = candidates.find((candidate) => existsSync(candidate));

  if (!matched) {
    return undefined;
  }

  return {
    file: matched,
    shell: process.platform === "win32"
  };
}

export class SmartSearchUnavailableError extends Error {
  readonly code = "SMART_SEARCH_NOT_FOUND";

  constructor(command: string, cause?: unknown) {
    super(
      [
        `未找到 smart-search CLI（当前命令：${command}）。`,
        "BookAssistant 的推荐、总结和评价工具都需要通过 smart-search 检索公开来源。",
        "请先在运行 Cherry Studio 的同一环境中安装 smart-search，并确认 `smart-search doctor --format json` 可执行；",
        "如果 smart-search 不在 PATH 中，请在 MCP 配置的 env 中设置 BOOK_ASSISTANT_SMART_SEARCH_COMMAND 为 smart-search 可执行文件（Windows 通常是 smart-search.cmd）的绝对路径。"
      ].join(" ")
    );
    this.name = "SmartSearchUnavailableError";

    if (cause) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function getSmartSearchCommand(): string {
  for (const key of smartSearchCommandEnvKeys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return defaultSmartSearchCommand;
}

function buildFailedSmartSearchResult(command: SmartSearchCommand, args: string[], error: unknown, stderr = ""): SmartSearchResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    ok: false,
    command,
    args,
    stdout: "",
    stderr,
    rawText: "",
    data: undefined,
    sources: [],
    error: stderr || errorMessage
  };
}

function quoteWindowsArg(arg: string): string {
  if (arg === "") {
    return '""';
  }

  if (!/[\s"&|<>^]/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/\\(?=")/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildSmartSearchInvocation(command: string, args: string[]): SmartSearchExecutable {
  const resolved = resolveSmartSearchExecutable(command);
  const executable = resolved?.file ?? command;
  const useShell = resolved?.shell ?? process.platform === "win32";

  if (useShell) {
    const quoted = [executable, ...args].map(quoteWindowsArg).join(" ");

    return {
      file: quoted,
      shell: true
    };
  }

  return {
    file: executable,
    shell: false
  };
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

export function parseSmartSearchJson(stdout: string): unknown {
  const text = stripCodeFences(stdout);

  if (!text) {
    return text;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeRawText(data: unknown, stdout: string): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.content === "string") {
      return record.content;
    }

    if (Array.isArray(record.content)) {
      const joined = record.content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object") {
            const piece = item as Record<string, unknown>;
            if (typeof piece.text === "string") {
              return piece.text;
            }
            if (typeof piece.content === "string") {
              return piece.content;
            }
          }

          return "";
        })
        .filter(Boolean)
        .join("\n");

      if (joined) {
        return joined;
      }
    }
  }

  return stdout.trim();
}

async function runSmartSearchCommand(
  command: SmartSearchCommand,
  args: string[],
  timeoutSeconds: number
): Promise<SmartSearchResult> {
  const smartSearchCommand = getSmartSearchCommand();
  const resolvedExecutable = resolveSmartSearchExecutable(smartSearchCommand);

  if (!resolvedExecutable) {
    return buildFailedSmartSearchResult(command, args, new SmartSearchUnavailableError(smartSearchCommand));
  }

  const invocation = buildSmartSearchInvocation(resolvedExecutable.file, [command, ...args]);

  return await new Promise<SmartSearchResult>((resolve) => {
    const startedAt = Date.now();
    const child = spawn(invocation.file, invocation.shell ? [] : [command, ...args], {
      cwd: process.cwd(),
      env: process.env,
      shell: invocation.shell,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeoutMs = Math.max(1, timeoutSeconds) * 1000;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      resolve(buildFailedSmartSearchResult(command, args, new Error(`smart-search timed out after ${timeoutMs}ms`), stderr));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(buildFailedSmartSearchResult(command, args, error, stderr));
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      if (code === 0) {
        const data = parseSmartSearchJson(stdout);
        const rawText = normalizeRawText(data, stdout);
        const sources = mergeEvidenceSources(
          collectEvidenceSources(data, command === "fetch" ? "fetch" : "search"),
          collectEvidenceSources(stdout, command === "fetch" ? "fetch" : "search")
        );

        resolve({
          ok: true,
          command,
          args,
          stdout,
          stderr,
          rawText,
          data,
          sources
        });
        return;
      }

      resolve(buildFailedSmartSearchResult(command, args, new Error(`smart-search exited with code ${code ?? "unknown"}`), stderr));
    });
  });
}

export function buildSearchArgs(query: string, options: SmartSearchSearchOptions = {}): string[] {
  const validation = options.validation ?? "balanced";
  const extraSources = options.extraSources ?? 1;
  const fallback = options.fallback ?? "off";
  const format = options.format ?? "json";
  const timeoutSeconds = options.timeoutSeconds ?? 45;

  const args = [
    query,
    "--validation",
    validation,
    "--extra-sources",
    String(extraSources),
    "--fallback",
    fallback,
    "--format",
    format,
    "--timeout",
    String(timeoutSeconds),
    "--no-stream"
  ];

  if (options.providers) {
    args.push("--providers", options.providers);
  }

  return args;
}

export function buildFetchArgs(url: string, format: SmartSearchFormat = "json"): string[] {
  return [url, "--format", format];
}

export async function runSmartSearchSearch(query: string, options: SmartSearchSearchOptions = {}): Promise<SmartSearchResult> {
  return runSmartSearchCommand("search", buildSearchArgs(query, options), options.timeoutSeconds ?? 45);
}

export async function runSmartSearchFetch(url: string, format: SmartSearchFormat = "json", timeoutSeconds = 45): Promise<SmartSearchResult> {
  return runSmartSearchCommand("fetch", buildFetchArgs(url, format), timeoutSeconds);
}

export function selectPrimarySource(sources: EvidenceSource[]): EvidenceSource | undefined {
  return sources.find((source) => Boolean(source.url)) ?? sources[0];
}
