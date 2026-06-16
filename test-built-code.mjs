/**
 * 使用构建后的代码测试
 */

import { runSmartSearchSearch } from "./dist/adapters/smartSearchClient.js";

console.error("📋 测试构建后的代码");

const start = Date.now();
const result = await runSmartSearchSearch("测试", {
  validation: "fast",
  extraSources: 0,
  fallback: "off",
  format: "json",
  timeoutSeconds: 10
});
const duration = Date.now() - start;

console.error(`✅ 调用完成：`);
console.error(`   耗时: ${duration}ms`);
console.error(`   ok: ${result.ok}`);
console.error(`   error: ${result.error || "无"}`);
console.error(`   stdout 长度: ${result.stdout.length} 字节`);
console.error(`   stderr 长度: ${result.stderr.length} 字节`);

if (result.stdout) {
  console.error("\n📄 stdout 内容:");
  console.error(result.stdout);
}
