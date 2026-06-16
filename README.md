# BookAssistant MCP

BookAssistant 是一个面向 Cherry Studio 的本地 MCP Server，用于图书推荐、图书总结和图书评价。

它使用 `smart-search` CLI 作为公开网页证据检索层，优先参考豆瓣读书，同时可结合 Goodreads、微信读书、出版社、百科和书评媒体等公开来源。

## 三层管线

工具分三层协作，由宿主模型（Cherry Studio 里的模型）串联：

**第一层 · 收集证据**（调用 `smart-search` 检索公开网页，返回证据包，不渲染）

- `recommend_books`：根据用户需求收集图书推荐证据；如果需求过于模糊，会先返回澄清问题。
- `recommend_similar_books`：根据一本参考书推荐相似图书，支持按主题、风格、情感基调、题材等维度寻找相似书籍。
- `summarize_book`：收集指定图书的总结证据，支持作者 / ISBN / 版本 / 剧透策略。
- `evaluate_book`：收集公开评分、评论和书评证据。

每个工具返回 `evidenceDigest`（smart-search 合成的综述）、`sources`（引用来源）、`pageSkeleton` 和 `guidance`。宿主模型据此撰写一个 `page` 对象。

**第二层 · 校验组织**

- `compose_book_page`：对宿主模型撰写的 `page` 做 schema 校验、Markdown 残留检查和 dry-run 试渲染，返回 `readyToRender` 与结构化的 errors / warnings 及规范化后的 page。

**第三层 · 渲染**

- `render_book_html`：把校验通过的 `page` 渲染成一段连续的内联样式 HTML 片段（图书专属皮肤）。仅在 `readyToRender: true` 后调用一次。

> 一次出图需 3 次工具调用：收集 → 组织 → 渲染。

## 输出风格

内置 5 类图书风格：

- `literary-classic`：文学 / 经典 / 严肃小说
- `web-fiction`：网文 / 类型小说
- `knowledge-nonfiction`：社科 / 历史 / 商业 / 科普
- `academic-professional`：专业书 / 教材 / 学术
- `youth-light`：轻小说 / 青春 / 治愈

默认使用 `auto`，会根据书名或用户描述自动选择风格。

## 安装

```bash
npm install
npm run build
```

## 开发

```bash
npm run dev
```

## 运行

```bash
npm start
```

## Cherry Studio 配置

在 Cherry Studio 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "book-assistant-mcp": {
      "command": "node",
      "args": ["E:/Project/AI/BookAssistant/dist/index.js"],
      "cwd": "E:/Project/AI/BookAssistant"
    }
  }
}
```

如果你使用表单配置：

- 名称：`book-assistant-mcp`
- 命令：`node`
- 参数：`E:/Project/AI/BookAssistant/dist/index.js`
- 工作目录：`E:/Project/AI/BookAssistant`

## 使用建议

### 图书推荐

当用户需求不够明确时，建议先追问：

**基础维度**：
- 想看的题材或类型
- 读者画像
- 想要的阅读风格

**个性化维度（新增）**：
- **心情/氛围**：轻松治愈、悬疑烧脑、励志向上、压抑沉重、欢快爽感
- **阅读节奏**：慢节奏深度阅读、中等节奏、快节奏爽文
- **阅读难度**：轻松入门、中等难度、深度烧脑
- **长度偏好**：短篇快读、中篇、长篇史诗
- **内容警告**：要避开的敏感内容（暴力、性描写、心理创伤、自杀、虐待等）

**其他约束**：
- 必须满足的条件
- 要避开的雷点

### 图书总结

如果用户只说了一个很短的书名，优先补充：

- 作者
- ISBN
- 出版社或版本信息

### 图书评价

建议优先参考：

- 豆瓣评分和评论
- Goodreads 或微信读书反馈
- 出版社简介与媒体书评

## 说明

- 不做登录态抓取。
- 不做反爬绕过或非公开 API 调用。
- 输出 HTML 采用 inline style，适配 Cherry Studio 对话展示。

