/**
 * 调试脚本：对比手动调用和代码调用 smart-search 的差异
 */

import { runSmartSearchSearch } from "./src/adapters/smartSearchClient.js";
import { spawn } from "node:child_process";

console.error("\n========================================");
console.error("对比测试：手动调用 vs 代码调用");
console.error("========================================\n");

// 测试 1：手动调用（和我在终端中测试的一样）
console.error("📋 测试 1：手动 spawn 调用");
console.error("命令：smart-search search \"测试\" --timeout 10 --format json");

const manualTest = new Promise((resolve) => {
  const start = Date.now();
  const child = spawn("smart-search", ["search", "测试", "--timeout", "10", "--format", "json"], {
    shell: process.platform === "win32",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  child.on("close", (code) => {
    const duration = Date.now() - start;
    console.error(`✅ 手动调用完成：`);
    console.error(`   耗时: ${duration}ms`);
    console.error(`   退出码: ${code}`);
    console.error(`   stdout 长度: ${stdout.length} 字节`);
    console.error(`   stderr 长度: ${stderr.length} 字节`);
    
    try {
      const data = JSON.parse(stdout);
      console.error(`   ok: ${data.ok}`);
      console.error(`   error: ${data.error || "无"}`);
    } catch (e) {
      console.error(`   解析失败`);
    }
    
    resolve({ duration, code, stdout, stderr });
  });
});

await manualTest;

console.error("\n----------------------------------------\n");

// 测试 2：通过代码调用（BookAssistant 实际使用的方式）
console.error("📋 测试 2：通过代码封装调用");
console.error("使用 runSmartSearchSearch 函数");

const codeStart = Date.now();
const result = await runSmartSearchSearch("测试", {
  validation: "fast",
  extraSources: 0,
  fallback: "off",
  format: "json",
  timeoutSeconds: 10
});
const codeDuration = Date.now() - codeStart;

console.error(`✅ 代码调用完成：`);
console.error(`   耗时: ${codeDuration}ms`);
console.error(`   ok: ${result.ok}`);
console.error(`   error: ${result.error || "无"}`);
console.error(`   stdout 长度: ${result.stdout.length} 字节`);
console.error(`   stderr 长度: ${result.stderr.length} 字节`);

console.error("\n========================================");
console.error("对比结果：");
console.error("========================================\n");

console.error("如果两者表现一致（都超时），说明问题在 smart-search 本身");
console.error("如果两者表现不同，说明代码调用有问题");
console.error("\n");
