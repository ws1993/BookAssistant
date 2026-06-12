import type { BookPageKind } from "../schemas/bookPageSchema.js";

/**
 * Shared guidance + page skeleton for the host model. Layer-1 tools attach this
 * so the model knows how to turn the raw evidence digest into a `page` object
 * for compose_book_page (layer 2).
 */

const sharedGuidance: string[] = [
  "下面的 evidenceDigest 是 smart-search 合成的公开网页综述，sources 是其引用来源。",
  "请你（宿主模型）阅读 evidenceDigest，把它组织成一个 book page 对象，再调用 compose_book_page 校验。",
  "输出要先总后分：先用 lead / executive-summary 给出清晰总判断，再分层展开结构、理由、适合人群、争议或局限。",
  "不要只给一句话或几个短 bullet。每个主要 expression 至少写 2-4 句有信息量的正文，解释原因、读者收益和证据边界。",
  "根据图书主题选择 styleProfile：文学经典用 literary-classic，科幻/奇幻/悬疑/类型小说用 web-fiction，社科历史商业科普用 knowledge-nonfiction，教材/专业/学术/技术用 academic-professional，童话/青春/治愈/亲子用 youth-light；不确定时才用 auto。",
  "不要编造证据里没有的事实；证据不足时在相应字段或 expression 中说明，并降低 confidence。",
  "page.expressions 里的富文本字段使用纯文本或 <strong> 等少量内联标签，不要放 Markdown 表格、代码块、# 标题或 - 列表。",
  "compose_book_page 返回 readyToRender: true 后，再调用一次 render_book_html，传入它返回的 normalized page。"
];

function baseSkeleton(kind: BookPageKind, title: string, styleProfile: string): Record<string, unknown> {
  return {
    kind,
    title,
    styleProfile,
    expression: {
      strategy: "auto",
      density: "balanced",
      hierarchy: "strong",
      coreViewpoint: "用一句话写出核心结论 / 推荐理由 / 总结要旨。",
      keyTakeaways: [
        "第一条写这本书最重要的价值，不少于 2 句。",
        "第二条写它适合哪些读者或场景，不少于 2 句。",
        "第三条写阅读前应知道的限制、争议或门槛。"
      ]
    },
    expressions: [],
    sources: [
      {
        title: "来源标题（取自 sources）",
        url: "https://...",
        excerpt: "支撑结论的摘录",
        confidence: "medium"
      }
    ]
  };
}

function recommendationExpressions(): unknown[] {
  return [
    {
      type: "lead",
      eyebrow: "先给结论",
      title: "推荐判断",
      body: "先概括这份书单的总体方向、选择逻辑和适合读者。不要只说推荐，要说明为什么这些书能共同解决用户的问题。"
    },
    {
      type: "ranked-list",
      title: "推荐书单",
      intro: "说明这份书单的筛选标准。",
      items: [
        {
          rank: 1,
          title: "书名 · 作者",
          fit: "适合的人群或场景",
          body: "推荐理由，结合证据。",
          tags: ["标签"]
        }
      ]
    },
    {
      type: "key-takeaways",
      title: "怎么选择",
      intro: "把推荐逻辑拆成 3-5 条判断标准，帮助用户根据自己的时间、基础和偏好取舍。",
      items: [
        { title: "先读哪一本", body: "给出首选书及原因。" },
        { title: "进阶路线", body: "说明读完第一本后如何延伸。" },
        { title: "避坑提醒", body: "说明哪些读者可能不适合某些书。" }
      ]
    },
    {
      type: "evidence-map",
      title: "证据依据",
      claim: "这份推荐需要由公开评分、书评、出版社信息或读者反馈共同支撑。",
      evidence: [{ title: "公开来源", body: "从 evidenceDigest 和 sources 中提取具体依据。", confidence: "medium" }],
      limitations: ["如果证据只覆盖少数平台，请明确说明样本有限。"]
    }
  ];
}

function summaryExpressions(): unknown[] {
  return [
    {
      type: "lead",
      eyebrow: "先总后分",
      title: "一句话总览",
      body: "先说明这本书真正关心的问题、核心观点和阅读价值。正文要有判断，不要只复述目录。"
    },
    {
      type: "key-takeaways",
      title: "核心要点",
      intro: "用 3-5 个要点拆开说明本书的主张、方法、重要情节或论证支点。",
      items: [
        { title: "主问题", body: "这本书试图回答什么。" },
        { title: "关键推进", body: "作者如何展开或故事如何推进。" },
        { title: "读者收获", body: "读者读完能带走什么。" }
      ]
    },
    {
      type: "section-outline",
      title: "结构脉络",
      sections: [{ title: "第一部分", body: "这一部分讲了什么。" }]
    },
    {
      type: "evidence-map",
      title: "证据与边界",
      claim: "总结应以公开简介、书评和可核验来源为依据。",
      evidence: [{ title: "公开来源", body: "从 evidenceDigest 和 sources 中提取支撑信息。", confidence: "medium" }],
      limitations: ["证据不足、版本差异或涉及剧透的地方要明确标注。"]
    }
  ];
}

function evaluationExpressions(): unknown[] {
  return [
    {
      type: "executive-summary",
      title: "总评先行",
      recommendation: "先给出是否值得读、最适合谁、不适合谁。需要明确判断和理由，不要停留在泛泛评价。",
      decisionHeadlines: ["价值判断", "适合读者", "主要风险"]
    },
    {
      type: "decision-matrix",
      title: "评价维度",
      recommendation: "一句话总评 + 适合谁。",
      criteria: ["可读性", "深度", "实用性"],
      options: [
        {
          name: "这本书",
          verdict: "recommended",
          scores: ["高", "中", "高"],
          rationale: "结合证据说明评分理由。"
        }
      ]
    },
    {
      type: "argument-map",
      title: "优点与争议",
      claim: "综合公开评价后，拆开说明这本书的核心优势和主要争议。",
      reasons: [{ title: "优势", body: "列出证据支持的优点。" }],
      counterarguments: [{ title: "不足", body: "列出证据支持的批评或阅读门槛。" }],
      conclusion: "最后回到具体读者，给出选择建议。"
    },
    {
      type: "evidence-map",
      title: "证据来源",
      claim: "评价结论必须能回到公开评分、评论或书评来源。",
      evidence: [{ title: "公开来源", body: "从 sources 中挑选最能支撑结论的来源。", confidence: "medium" }],
      limitations: ["如果评分平台、评论群体或版本差异会影响判断，请写清楚。"]
    }
  ];
}

export function buildGuidancePackage(
  kind: BookPageKind,
  title: string,
  styleProfile: string
): { guidance: string[]; pageSkeleton: Record<string, unknown> } {
  const skeleton = baseSkeleton(kind, title, styleProfile);

  if (kind === "recommendation") {
    skeleton.expressions = recommendationExpressions();
  } else if (kind === "summary") {
    skeleton.expressions = summaryExpressions();
  } else {
    skeleton.expressions = evaluationExpressions();
  }

  return { guidance: sharedGuidance, pageSkeleton: skeleton };
}
