import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

interface PerformanceEntry {
  label: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceReport {
  timestamp: string;
  totalDuration: number;
  entries: Array<{
    label: string;
    duration: number;
    percentage: number;
    metadata?: Record<string, unknown>;
  }>;
}

class PerformanceMonitor {
  private enabled: boolean;
  private timers: Map<string, PerformanceEntry> = new Map();
  private completed: PerformanceEntry[] = [];
  private sessionStart: number = 0;
  private logFile?: string;

  constructor() {
    // 通过环境变量控制是否启用
    this.enabled = process.env.PERF_MONITOR === "true" || process.env.PERF_MONITOR === "1";

    if (this.enabled) {
      // 设置日志文件路径
      const logDir = process.env.PERF_LOG_DIR || "./perf-logs";
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      this.logFile = resolve(logDir, `perf-${timestamp}.json`);
      
      console.error(`[PerformanceMonitor] Enabled. Logs will be written to: ${this.logFile}`);
    }
  }

  /**
   * 开始新的性能监控会话
   */
  startSession(): void {
    if (!this.enabled) return;
    this.sessionStart = performance.now();
    this.timers.clear();
    this.completed = [];
  }

  /**
   * 开始计时
   */
  start(label: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    if (this.sessionStart === 0) {
      this.startSession();
    }

    const entry: PerformanceEntry = {
      label,
      startTime: performance.now(),
      metadata
    };

    this.timers.set(label, entry);
    this.log(`[START] ${label}`, metadata);
  }

  /**
   * 结束计时
   */
  end(label: string, metadata?: Record<string, unknown>): number | undefined {
    if (!this.enabled) return undefined;

    const entry = this.timers.get(label);
    if (!entry) {
      console.error(`[PerformanceMonitor] Timer "${label}" not found`);
      return undefined;
    }

    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.completed.push(entry);
    this.timers.delete(label);

    this.log(`[END] ${label}: ${entry.duration.toFixed(2)}ms`, entry.metadata);
    return entry.duration;
  }

  /**
   * 结束会话并生成报告
   */
  endSession(): PerformanceReport | undefined {
    if (!this.enabled) return undefined;

    const totalDuration = performance.now() - this.sessionStart;

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      entries: this.completed.map((entry) => ({
        label: entry.label,
        duration: entry.duration!,
        percentage: ((entry.duration! / totalDuration) * 100),
        metadata: entry.metadata
      }))
    };

    // 写入日志文件
    if (this.logFile) {
      try {
        const logEntry = {
          ...report,
          entries: report.entries.sort((a, b) => b.duration - a.duration)
        };
        appendFileSync(this.logFile, JSON.stringify(logEntry, null, 2) + "\n\n");
      } catch (error) {
        console.error(`[PerformanceMonitor] Failed to write log:`, error);
      }
    }

    // 输出到 stderr（不影响 MCP 协议的 stdout）
    this.printReport(report);

    // 重置
    this.sessionStart = 0;
    this.completed = [];
    this.timers.clear();

    return report;
  }

  /**
   * 打印报告到 stderr
   */
  private printReport(report: PerformanceReport): void {
    const sorted = [...report.entries].sort((a, b) => b.duration - a.duration);

    console.error("\n" + "=".repeat(80));
    console.error(`Performance Report - ${report.timestamp}`);
    console.error("=".repeat(80));
    console.error(`Total Duration: ${report.totalDuration.toFixed(2)}ms\n`);

    sorted.forEach((entry) => {
      const bar = "█".repeat(Math.floor(entry.percentage / 2));
      console.error(
        `${entry.label.padEnd(35)} ${entry.duration.toFixed(2).padStart(10)}ms  ${entry.percentage.toFixed(1).padStart(6)}%  ${bar}`
      );
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.error(`${"".padEnd(35)} ${JSON.stringify(entry.metadata)}`);
      }
    });

    console.error("=".repeat(80) + "\n");
  }

  /**
   * 辅助日志函数
   */
  private log(message: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;
    const meta = metadata ? ` ${JSON.stringify(metadata)}` : "";
    console.error(`[PERF] ${message}${meta}`);
  }

  /**
   * 包装异步函数并自动计时
   */
  async measure<T>(label: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    this.start(label, metadata);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label, { error: String(error) });
      throw error;
    }
  }

  /**
   * 包装同步函数并自动计时
   */
  measureSync<T>(label: string, fn: () => T, metadata?: Record<string, unknown>): T {
    if (!this.enabled) {
      return fn();
    }

    this.start(label, metadata);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label, { error: String(error) });
      throw error;
    }
  }
}

// 导出单例
export const perfMonitor = new PerformanceMonitor();
