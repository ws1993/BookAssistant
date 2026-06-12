import type { BookPageKind } from "../schemas/bookPageSchema.js";

/**
 * Shared guidance + page skeleton for the host model. Layer-1 tools attach this
 * so the model knows how to turn the raw evidence digest into a `page` object
 * for compose_book_page (layer 2).
 */

const sharedGuidance: string[] = [
  "下面的 evidenceDigest 是 smart-search 合成的公开网页综述，sources 是其引用来源。",
  "请你（宿主模型）阅读 evidenceDigest，把它组织成一个 book page 对象，再调用 compose_book_page 校验。",
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
      coreViewpoint: "用一句话写出核心结论 / 推荐理由 / 总结要旨。",
      keyTakeaways: ["面向读者的第一个要点。", "面向读者的第二个要点。"]
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
    }
  ];
}

function summaryExpressions(): unknown[] {
  return [
    {
      type: "section-outline",
      title: "结构脉络",
      sections: [{ title: "第一部分", body: "这一部分讲了什么。" }]
    }
  ];
}

function evaluationExpressions(): unknown[] {
  return [
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
