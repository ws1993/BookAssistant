# 性能监控使用指南

## 概述

项目已集成性能监控工具，可以帮助识别性能瓶颈。监控通过环境变量控制，不会影响正常使用。

## 启用监控

### 方式 1：临时启用（推荐用于测试）

在运行构建后的程序前设置环境变量：

**Windows (PowerShell):**
```powershell
$env:PERF_MONITOR="1"
node dist/index.js
```

**Windows (CMD):**
```cmd
set PERF_MONITOR=1
node dist/index.js
```

**Linux/Mac:**
```bash
PERF_MONITOR=1 node dist/index.js
```

### 方式 2：在 MCP 配置中启用

编辑你的 MCP 客户端配置（如 Cherry Studio 的配置文件），在环境变量中添加：

```json
{
  "mcpServers": {
    "book-assistant": {
      "command": "node",
      "args": ["E:/Project/AI/BookAssistant/dist/index.js"],
      "env": {
        "PERF_MONITOR": "1",
        "PERF_LOG_DIR": "E:/Project/AI/BookAssistant/perf-logs"
      }
    }
  }
}
```

### 方式 3：修改启动脚本

编辑 `package.json` 的 `start` 脚本：

```json
{
  "scripts": {
    "start": "cross-env PERF_MONITOR=1 node dist/index.js"
  }
}
```

需要先安装 `cross-env`（跨平台环境变量工具）：
```bash
npm install --save-dev cross-env
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PERF_MONITOR` | 启用性能监控（设为 `1` 或 `true`） | 未启用 |
| `PERF_LOG_DIR` | 日志文件保存目录 | `./perf-logs` |

## 输出说明

### 控制台输出（stderr）

启用后，每次工具调用结束时会在控制台输出性能报告，例如：

```
================================================================================
Performance Report - 2026-06-16T08:30:45.123Z
================================================================================
Total Duration: 12345.67ms

smart-search-queries                     10234.56ms   82.9%  █████████████████████████████████████████
merge-evidence                              456.78ms    3.7%  █
render-expressions                          234.12ms    1.9%  
render-sources                              123.45ms    1.0%  
...
================================================================================
```

### 日志文件

性能数据会追加保存到 JSON 格式的日志文件中，路径如：
```
perf-logs/perf-2026-06-16T08-30-00-000Z.json
```

日志文件内容示例：
```json
{
  "timestamp": "2026-06-16T08:30:45.123Z",
  "totalDuration": 12345.67,
  "entries": [
    {
      "label": "smart-search-queries",
      "duration": 10234.56,
      "percentage": 82.9,
      "metadata": {
        "queryCount": 2
      }
    },
    {
      "label": "render-expressions",
      "duration": 234.12,
      "percentage": 1.9,
      "metadata": {
        "count": 5
      }
    }
  ]
}
```

## 监控的关键指标

### Layer 1: 证据收集 (orchestrators)

- `recommend_books_tool` / `summarize_book_tool` / `evaluate_book_tool` - 工具总耗时
- `collectBookEvidence` - 证据收集总耗时
  - `smart-search-queries` - **最耗时**：外部搜索查询（已并发）
  - `merge-evidence` - 合并证据和来源

### Layer 2: 校验组织 (composer)

- `compose_book_page_tool` - 工具总耗时
- `composeBookPage` - 校验总耗时
  - `parse-arguments` - 参数解析
  - `markdown-warnings` - Markdown 检查
  - `schema-validation` - Zod 校验 + 试渲染

### Layer 3: HTML 渲染 (renderer)

- `render_book_html_tool` - 工具总耗时
- `renderBookHtml` - 渲染总耗时
  - `parse-and-resolve` - 解析和上下文构建
  - `render-expressions` - 渲染表达式（可优化点）
  - `render-sources` - 渲染来源
  - `assemble-html` - 组装 HTML
  - `format-html` - 格式化输出

## 性能分析建议

### 预期的性能分布

在典型场景下，时间分布应该是：

```
smart-search-queries:  80-95%  ← 主要瓶颈（已优化）
其他所有步骤:          5-20%   ← 应该很快
```

### 判断是否需要优化

1. **如果 `smart-search-queries` 占比 > 90%**
   - ✅ 正常，这是 I/O 瓶颈，已通过 Promise.all 并发优化
   - 💡 可考虑：减少查询数量、调整 timeout、使用缓存

2. **如果 `render-expressions` > 100ms**
   - ⚠️ 可能需要优化（通常应 < 50ms）
   - 检查 expression 数量和复杂度
   - 可考虑并行化渲染

3. **如果 `schema-validation` > 200ms**
   - ⚠️ 可能有问题
   - 检查 page 对象的大小
   - 检查是否有过多的试渲染

4. **如果总耗时 > 60 秒**
   - 🔍 检查 smart-search 是否超时
   - 检查网络连接
   - 考虑调整查询策略

## 禁用监控

如果不需要性能监控，只需：

1. 不设置 `PERF_MONITOR` 环境变量，或
2. 设置 `PERF_MONITOR=0` 或 `PERF_MONITOR=false`

监控完全关闭时，性能开销为零（所有 perfMonitor 调用都会立即返回）。

## 故障排除

### 问题：看不到性能报告

**检查项：**
1. 确认 `PERF_MONITOR` 环境变量已设置
2. 检查 MCP 客户端是否显示 stderr 输出
3. 查看日志文件目录（默认 `./perf-logs/`）

### 问题：日志文件权限错误

**解决方法：**
1. 确保日志目录存在且有写权限
2. 或设置 `PERF_LOG_DIR` 到有权限的目录

### 问题：输出干扰 MCP 协议

**说明：**
性能监控使用 `console.error()` 输出到 stderr，不会影响 MCP 的 stdout 协议通信。

## 下一步

收集到性能数据后：

1. **分析瓶颈**：查看哪个步骤耗时最长
2. **确定优化方向**：
   - 如果是 smart-search → 优化查询策略
   - 如果是渲染 → 考虑并行化或优化算法
3. **对比优化前后**：保存日志文件，对比改进效果

## 示例：完整测试流程

```powershell
# 1. 构建项目
npm run build

# 2. 启用性能监控并运行
$env:PERF_MONITOR="1"
$env:PERF_LOG_DIR="./perf-logs"

# 3. 启动 MCP 服务器（在你的 MCP 客户端中使用）
# 或直接测试：
node dist/index.js

# 4. 使用工具进行测试（通过 MCP 客户端）

# 5. 查看性能报告
# - 控制台会显示实时报告
# - 或查看日志文件：cat perf-logs/perf-*.json
```

## 技术细节

### 监控实现

- 基于 Node.js 原生 `performance.now()` API
- 零依赖，纯 TypeScript 实现
- 支持同步和异步函数监控
- 自动计算百分比和生成可视化

### 代码位置

- 监控工具：`src/utils/performanceMonitor.ts`
- 集成点：
  - `src/orchestrators/shared.ts` - 证据收集
  - `src/composer/composeBookPage.ts` - 校验
  - `src/renderers/book/renderBookHtml.ts` - 渲染
  - `src/tools/*Tool.ts` - 工具入口

### 性能影响

- 禁用时：零开销（条件短路）
- 启用时：每次计时约 < 0.1ms（可忽略）
