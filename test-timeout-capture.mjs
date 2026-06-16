/**
 * 深入测试：检查超时时 stdout 是否被捕获
 */

import { spawn } from "node:child_process";

console.error("🔍 测试：超时时能否捕获 stdout\n");

// 模拟 BookAssistant 的超时处理逻辑
function testTimeout(waitBeforeResolve = 0) {
  return new Promise((resolve) => {
    const child = spawn("smart-search", ["search", "测试", "--timeout", "10", "--format", "json"], {
      shell: process.platform === "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      
      settled = true;
      child.kill();
      
      console.error(`⏱️  超时触发，kill() 已调用`);
      console.error(`   当前 stdout 长度: ${stdout.length}`);
      console.error(`   当前 stderr 长度: ${stderr.length}`);
      
      // 等待指定时间后再 resolve
      if (waitBeforeResolve > 0) {
        console.error(`   等待 ${waitBeforeResolve}ms 后 resolve...`);
        setTimeout(() => {
          console.error(`   等待后 stdout 长度: ${stdout.length}`);
          resolve({ stdout, stderr, wait: waitBeforeResolve });
        }, waitBeforeResolve);
      } else {
        console.error(`   立即 resolve`);
        resolve({ stdout, stderr, wait: 0 });
      }
    }, 10000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      console.error(`📥 收到 stdout chunk: ${chunk.length} 字节`);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      console.error(`📥 收到 stderr chunk: ${chunk.length} 字节`);
    });

    child.on("close", (code) => {
      if (settled) {
        console.error(`🚪 进程关闭（已settled），退出码: ${code}`);
        return;
      }
      
      settled = true;
      clearTimeout(timer);
      console.error(`🚪 进程正常关闭，退出码: ${code}`);
      resolve({ stdout, stderr, code });
    });
  });
}

// 测试 1: 立即 resolve
console.error("=== 测试 1: 超时后立即 resolve ===\n");
const result1 = await testTimeout(0);
console.error(`\n结果: stdout=${result1.stdout.length} 字节\n`);

// 测试 2: 等待 100ms 后 resolve
console.error("\n=== 测试 2: 超时后等待 100ms 再 resolve ===\n");
const result2 = await testTimeout(100);
console.error(`\n结果: stdout=${result2.stdout.length} 字节\n`);

// 测试 3: 等待 500ms 后 resolve
console.error("\n=== 测试 3: 超时后等待 500ms 再 resolve ===\n");
const result3 = await testTimeout(500);
console.error(`\n结果: stdout=${result3.stdout.length} 字节\n`);

console.error("\n📊 总结:");
console.error(`   立即 resolve:  ${result1.stdout.length} 字节`);
console.error(`   等待 100ms:   ${result2.stdout.length} 字节`);
console.error(`   等待 500ms:   ${result3.stdout.length} 字节`);
