# 启用性能监控 - 快速指南

## 🚀 方法 1：在 Cherry Studio 中启用（推荐）

### 步骤 1：找到配置文件

Cherry Studio 的 MCP 配置通常在：
- **Windows**: `%APPDATA%\cherry-studio\mcp_settings.json`
- **或**: Cherry Studio 设置界面中的 MCP 服务器配置

### 步骤 2：编辑配置

找到你的 `book-assistant-mcp` 配置，添加 `env` 字段：

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

**关键字段：**
- `PERF_MONITOR`: 设为 `"1"` 启用监控
- `PERF_LOG_DIR`: 日志保存目录（可选，默认为 `./perf-logs`）

### 步骤 3：重启 Cherry Studio

保存配置后，完全关闭并重新打开 Cherry Studio，让配置生效。

---

## 🚀 方法 2：临时测试（用于调试）

### Windows PowerShell:

```powershell
# 进入项目目录
cd E:\Project\AI\BookAssistant

# 设置环境变量
$env:PERF_MONITOR="1"
$env:PERF_LOG_DIR="./perf-logs"

# 运行（仅用于测试）
node dist/index.js
```

**注意：** 这个方法只适合测试，实际使用时还是要在 MCP 配置中启用。

---

## 📊 查看监控结果

### 方式 1：查看控制台输出（实时）

如果你的 MCP 客户端显示 stderr 输出，你会看到类似这样的报告：

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

**如何看懂：**
- 每行显示：`步骤名称  耗时  占比  柱状图`
- 按耗时从高到低排序
- 重点关注占比最高的步骤

### 方式 2：查看日志文件（详细记录）

日志文件保存在 `perf-logs/` 目录：

```powershell
# 查看最新的日志文件
cd E:\Project\AI\BookAssistant\perf-logs

# 列出所有日志
ls

# 查看某个日志文件
cat perf-2026-06-16T08-30-00-000Z.json
```

**日志文件格式：**

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

---

## 🔍 如何分析结果

### 场景 1：正常情况

```
smart-search-queries     10000ms   90%  ████████████████████████████████████████████
render-expressions          100ms    1%  █
其他步骤                      900ms    9%  ████
```

**解读：**
- ✅ **正常** - smart-search 占大部分时间
- ✅ 渲染只占 1%，非常快
- **结论：** 无需优化，性能很好

### 场景 2：渲染成为瓶颈

```
smart-search-queries     5000ms   50%  █████████████████████████
render-expressions       4500ms   45%  ██████████████████████
其他步骤                     500ms    5%  ██
```

**解读：**
- ⚠️ **需要优化** - 渲染占了 45% 的时间
- 如果有多个 expressions，可以考虑并行化
- **结论：** 值得优化渲染性能

### 场景 3：所有步骤都很快

```
Total Duration: 150ms

smart-search-queries       100ms   67%  ████████████████████████████████
render-expressions          30ms   20%  ████████
其他步骤                      20ms   13%  █████
```

**解读：**
- ✅ **完美** - 总时间很短
- **结论：** 完全不需要优化

---

## 📋 监控检查清单

### 启用监控后，运行以下测试：

1. **简单推荐**（1-2 expressions）
   - 在 Cherry Studio 中："推荐几本科幻小说"
   - 查看 `render-expressions` 耗时

2. **详细评价**（5+ expressions）
   - 在 Cherry Studio 中："详细评价《三体》"
   - 查看 `render-expressions` 耗时

3. **完整分析**（8+ expressions）
   - 在 Cherry Studio 中："全面分析《百年孤独》的文学价值"
   - 查看 `render-expressions` 耗时

### 记录结果：

| 测试场景 | Expression 数量 | render-expressions 耗时 | 占总时间比例 |
|---------|----------------|------------------------|-------------|
| 简单推荐 | 2 | ?ms | ?% |
| 详细评价 | 5 | ?ms | ?% |
| 完整分析 | 8 | ?ms | ?% |

**决策标准：**
- 如果 `render-expressions` **< 100ms** → ✅ 无需优化
- 如果 `render-expressions` **> 100ms** 且有 **5+ expressions** → ⚠️ 可考虑优化
- 如果 `render-expressions` **< 总时间的 10%** → ✅ 不是瓶颈，无需优化

---

## 🛠️ 故障排除

### 问题 1：看不到性能报告

**可能原因：**
1. 环境变量没有设置
2. MCP 客户端没有显示 stderr
3. 配置后没有重启

**解决方法：**
1. 检查配置文件中的 `env` 字段
2. 查看日志文件：`perf-logs/perf-*.json`
3. 完全重启 Cherry Studio

### 问题 2：日志文件不存在

**可能原因：**
- `PERF_LOG_DIR` 路径错误
- 没有写入权限

**解决方法：**
```powershell
# 手动创建目录
mkdir E:\Project\AI\BookAssistant\perf-logs

# 检查权限
icacls E:\Project\AI\BookAssistant\perf-logs
```

### 问题 3：监控影响性能

**不用担心：**
- 监控本身的开销 < 0.1ms
- 对用户体验无影响

---

## ✅ 验证监控已启用

启用后，你应该看到：

1. **控制台输出**（如果 MCP 客户端显示）：
   ```
   [PerformanceMonitor] Enabled. Logs will be written to: E:/Project/AI/BookAssistant/perf-logs/perf-2026-06-16T...json
   ```

2. **日志文件创建**：
   ```powershell
   ls E:\Project\AI\BookAssistant\perf-logs
   ```
   应该看到 `perf-*.json` 文件

3. **使用工具后出现性能报告**（在控制台或日志中）

---

## 🎯 下一步

1. ✅ 启用监控
2. ✅ 运行 3 种测试场景
3. ✅ 查看性能报告
4. ✅ 记录结果
5. 📊 **把结果发给我，我帮你分析是否需要优化**

有任何问题随时问我！
