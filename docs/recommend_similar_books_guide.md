# recommend_similar_books 工具使用指南

## 功能概述

`recommend_similar_books` 是 BookAssistant 新增的核心工具，用于**基于一本参考书推荐相似图书**。

这是用户最高频的使用场景之一：
- "看完《三体》，还有类似的科幻小说吗？"
- "喜欢《百年孤独》的魔幻现实风格，推荐几本"
- "similar books to Harry Potter"
- "豆瓣上说喜欢这本书的人也喜欢什么？"

## 工作原理

### 三层管线架构

与其他 BookAssistant 工具一致：

1. **Layer 1（证据收集）**：调用 `recommend_similar_books`
   - 使用 smart-search 检索豆瓣"喜欢这本书的人也喜欢"、Goodreads "Readers also enjoyed"、书评、书单等公开来源
   - 返回证据包（evidenceDigest + sources + guidance + pageSkeleton）

2. **Layer 2（校验组织）**：宿主模型根据证据撰写 page 对象，调用 `compose_book_page`
   - Schema 校验 + dry-run 试渲染

3. **Layer 3（渲染）**：调用 `render_book_html`
   - 输出精美的 inline HTML

## 输入参数

```typescript
{
  title: string;              // 必填：参考书的书名
  author?: string;            // 可选：作者，提升准确性
  isbn?: string;              // 可选：ISBN，确保精确匹配
  similarityFocus?: "auto" | "theme" | "style" | "mood" | "genre";
                              // 相似度关注点，默认 auto
  count?: number;             // 推荐数量，1-10，默认 5
  avoidAuthor?: boolean;      // 是否排除同一作者的其他作品，默认 false
  constraints?: string[];     // 额外约束条件
  language?: string;          // 默认 zh-CN
  styleProfile?: string;      // 默认 auto
}
```

### similarityFocus 说明

- **auto**：综合相似度（主题、风格、基调、读者群）
- **theme**：主题内容相似（如都是太空探索、都讨论人性）
- **style**：写作风格相似（如都是第一人称、都是碎片叙事）
- **mood**：情感基调和阅读感受相似（如都轻松治愈、都悬疑压抑）
- **genre**：题材类型相似（如都是科幻、都是历史小说）

## 使用示例

### 示例 1：基础用法

```json
{
  "title": "三体",
  "author": "刘慈欣",
  "count": 5
}
```

返回与《三体》相似的 5 本书。

### 示例 2：指定相似度关注点

```json
{
  "title": "百年孤独",
  "author": "加西亚·马尔克斯",
  "similarityFocus": "style",
  "count": 3
}
```

推荐写作风格（魔幻现实主义）类似的书。

### 示例 3：排除同一作者 + 额外约束

```json
{
  "title": "哈利·波特与魔法石",
  "author": "J.K.罗琳",
  "avoidAuthor": true,
  "constraints": ["适合青少年", "已完结"],
  "count": 5
}
```

推荐类似的奇幻小说，但排除罗琳的其他作品。

### 示例 4：按情感基调推荐

```json
{
  "title": "活着",
  "author": "余华",
  "similarityFocus": "mood",
  "count": 3
}
```

推荐情感基调相似（沉重、现实主义、深刻）的作品。

## 澄清机制

如果参考书信息过于简略（书名太短且无作者/ISBN），工具会返回澄清问题：

**输入**：
```json
{
  "title": "活着"
}
```

**返回**：
```json
{
  "status": "needs_clarification",
  "title": "需要你补充参考书的信息",
  "intro": "\"活着\"这个书名太简短了，容易匹配到多本不同的书。为了精准推荐相似图书，请补充：",
  "questions": [
    { "id": "author", "label": "作者是谁？" },
    { "id": "isbn", "label": "ISBN 或出版社？（可选）" },
    { "id": "context", "label": "这本书的主要内容或类型？（帮助确认是哪本书）" }
  ]
}
```

宿主模型应该向用户提问，获取补充信息后重新调用。

## 与 recommend_books 的区别

| 特性 | recommend_books | recommend_similar_books |
|------|----------------|------------------------|
| 使用场景 | 从需求出发（题材/风格/读者） | 从一本参考书出发 |
| 输入 | 描述性需求 | 具体书名 |
| 优势 | 发现新领域 | 精准匹配口味 |
| 示例 | "推荐几本科幻小说" | "类似《三体》的科幻" |

## 证据来源

工具会优先检索：

1. **豆瓣读书**："喜欢这本书的人也喜欢"列表
2. **Goodreads**："Readers also enjoyed" 推荐
3. **书单/榜单**：包含该书的主题书单
4. **书评**：提到相似作品的专业书评
5. **读者反馈**：评论中的对比和推荐

所有来源都是公开网页，不涉及登录态或 API 调用。

## 典型输出结构

宿主模型拿到证据后，通常会组织成 `ranked-list` 表达式：

```json
{
  "kind": "recommendation",
  "title": "喜欢《三体》的读者还会喜欢",
  "expressions": [
    {
      "type": "lead",
      "body": "基于豆瓣和Goodreads的读者推荐..."
    },
    {
      "type": "ranked-list",
      "title": "相似推荐（综合维度）",
      "items": [
        {
          "rank": 1,
          "title": "《球状闪电》",
          "body": "刘慈欣另一部硬科幻力作...",
          "fit": "相似点：硬科幻设定、宏大叙事、物理学想象",
          "tags": ["硬科幻", "刘慈欣", "物理学"]
        },
        // ... 更多推荐
      ]
    }
  ],
  "sources": [...]
}
```

## 最佳实践

### 提升推荐质量

1. **尽量提供作者**：避免同名书籍混淆
2. **明确相似维度**：如果用户有明确偏好（"我喜欢它的叙事手法"），设置 `similarityFocus: "style"`
3. **合理设置数量**：3-5 本通常最合适，太多会降低质量
4. **利用约束条件**：如"中文"、"近年出版"、"不要太长"

### 用户体验优化

- 在对话中识别"类似"、"相似"、"也喜欢"等关键词
- 自动从上下文提取参考书信息
- 如果用户说"还有吗"，增加 count 重新调用

## 后续扩展方向

未来可能增强的功能：

1. **多书输入**：基于多本书的综合推荐
2. **反向排除**：明确不想要某些特征
3. **相似度评分**：给出每本推荐书的相似度百分比
4. **可视化**：相似度雷达图、关系网络图

## 技术细节

### 搜索查询构建

工具会构建两个 smart-search 查询：

1. **主查询**：相似推荐
   ```
   推荐与《三体》（刘慈欣）相似的图书，综合相似度（主题、风格、基调、读者群）。
   请给出5本书的书名、作者，并说明为什么与《三体》相似。
   优先参考豆瓣读书、Goodreads的"喜欢这本书的人也喜欢"等公开推荐。
   ```

2. **辅助查询**：读者画像
   ```
   《三体》，作者刘慈欣 这本书的读者画像、核心吸引力和典型评价是什么？
   ```

### 风格自动推断

`styleProfile` 会根据参考书自动推断：
- 《三体》→ `knowledge-nonfiction`（科幻偏硬核）
- 《哈利·波特》→ `youth-light`（青少年奇幻）
- 《百年孤独》→ `literary-classic`（文学经典）

---

## 快速开始

**Cherry Studio 对话示例**：

```
用户：喜欢《三体》，推荐几本类似的科幻小说

AI：[调用 recommend_similar_books]
    title: "三体"
    author: "刘慈欣"
    count: 5
    
    [收到证据包]
    [撰写 page 对象]
    [调用 compose_book_page 校验]
    [调用 render_book_html 渲染]
    
    [展示精美的 HTML 推荐列表]
```

这就是新工具的全部！它完美复用了你现有的三层架构，只是在证据收集阶段专注于"相似推荐"这个核心场景。
