# BookAssistant MCP

BookAssistant 是一个面向 Cherry Studio 的本地 MCP Server，用于图书推荐、图书总结和图书评价。

它使用 `smart-search` CLI 作为公开网页证据检索层，优先参考豆瓣读书，同时可结合 Goodreads、微信读书、出版社、百科和书评媒体等公开来源。

## 功能

- `recommend_books`：根据用户需求推荐图书；如果需求过于模糊，会先返回澄清问题。
- `summarize_book`：总结指定图书，支持作者 / ISBN / 版本 / 剧透策略。
- `evaluate_book`：基于公开评分、评论和书评证据做图书评价。

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

- 想看的题材或类型
- 读者画像
- 想要的阅读风格
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

