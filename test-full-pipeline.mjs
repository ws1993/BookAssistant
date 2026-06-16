/**
 * 完整流程测试脚本
 * 用于诊断 smart-search 超时问题
 */

import { createSummaryPackage } from "./dist/orchestrators/bookSummary.js";
import { renderBookHtml } from "./dist/renderers/book/renderBookHtml.js";

async function testFullPipeline() {
  console.error("\n========================================");
  console.error("开始完整流程测试");
  console.error("测试书籍：《世界大历史》");
  console.error("========================================\n");

  try {
    // Layer 1: 证据收集
    console.error("⏱️  Layer 1: 开始证据收集...");
    const startLayer1 = performance.now();
    
    const summaryPackage = await createSummaryPackage({
      title: "世界大历史",
      author: undefined,
      spoilerLevel: "light",
      language: "zh-CN",
      styleProfile: "auto"
    });
    
    const layer1Duration = performance.now() - startLayer1;
    console.error(`✅ Layer 1 完成，耗时: ${layer1Duration.toFixed(2)}ms`);
    console.error(`   - 搜索状态: ${summaryPackage.searchOk ? '成功' : '失败'}`);
    if (summaryPackage.searchError) {
      console.error(`   - 错误信息: ${summaryPackage.searchError}`);
    }
    console.error(`   - 证据长度: ${summaryPackage.evidenceDigest?.length || 0} 字符`);
    console.error(`   - 来源数量: ${summaryPackage.sources?.length || 0} 个`);

    // 检查是否需要澄清
    if (summaryPackage.status === "needs_clarification") {
      console.error("\n⚠️  需要用户澄清信息");
      console.error(JSON.stringify(summaryPackage.questions, null, 2));
      return;
    }

    // 检查搜索是否失败
    if (!summaryPackage.searchOk) {
      console.error("\n❌ 搜索失败，无法继续");
      return;
    }

    // Layer 2: 校验（模拟 - 需要 LLM 生成 page 对象）
    console.error("\n⏱️  Layer 2: 跳过（需要 LLM 生成 page 对象）");
    console.error("   提示：在实际使用中，LLM 会根据 evidenceDigest 生成 page 对象");

    // Layer 3: 渲染（使用示例 page 对象）
    console.error("\n⏱️  Layer 3: 使用示例 page 对象测试渲染...");
    const startLayer3 = performance.now();
    
    const examplePage = {
      kind: "summary",
      title: "世界大历史",
      styleProfile: "knowledge-nonfiction",
      expression: {
        coreViewpoint: "这是一本关于世界历史的书籍。"
      },
      expressions: [
        {
          type: "lead",
          body: "《世界大历史》是一本综合性的历史著作。"
        },
        {
          type: "key-takeaways",
          items: [
            { title: "全球视野", body: "从全球角度审视历史发展" },
            { title: "长时段分析", body: "关注历史的长期趋势" }
          ]
        }
      ],
      sources: summaryPackage.sources || []
    };

    const html = await renderBookHtml(examplePage);
    const layer3Duration = performance.now() - startLayer3;
    
    console.error(`✅ Layer 3 完成，耗时: ${layer3Duration.toFixed(2)}ms`);
    console.error(`   - HTML 长度: ${html.length} 字符`);

    console.error("\n========================================");
    console.error("测试完成！");
    console.error(`总耗时: ${(layer1Duration + layer3Duration).toFixed(2)}ms`);
    console.error("========================================\n");

  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testFullPipeline().catch(console.error);
