import { type GenerateBooklistInput } from "../schemas/bookAssistantSchemas.js";
import { resolveBookStyleProfile } from "../styles/bookProfiles.js";
import { collectBookEvidence } from "./shared.js";
import { buildGuidancePackage } from "./guidance.js";
import type { BookAssistantPackage } from "./types.js";

function buildSearchQueries(input: GenerateBooklistInput): string[] {
  const audience = input.targetAudience ? `，目标读者：${input.targetAudience}` : "";
  const focus = input.focus ? `，重点关注：${input.focus}` : "";

  const progressionGuide = {
    "beginner-to-advanced": "按从易到难的顺序组织，适合循序渐进学习。",
    thematic: "按主题或子领域分类组织。",
    chronological: "按出版时间或历史发展顺序组织。",
    auto: "根据主题特点自动选择最合适的组织方式。"
  };

  const organization = progressionGuide[input.progression];

  return [
    `请为"${input.theme}"这个主题生成一份包含${input.count}本书的书单${audience}${focus}。

要求：
1. 每本书都要说明：书名、作者、推荐理由（为什么在这个主题下重要）
2. 组织方式：${organization}
3. 如果是从易到难，明确标注难度级别（入门/进阶/高级）
4. 如果是主题分类，说明每个子主题
5. 如果是时间顺序，标注出版年代或时期
6. 给出整体阅读建议（阅读顺序、时间规划、配套资源等）

参考豆瓣读书、知乎书单、Goodreads等公开来源，推荐高质量、有影响力的经典作品。`
  ];
}

export async function createBooklistPackage(input: GenerateBooklistInput): Promise<BookAssistantPackage> {
  const styleSeed = [input.theme, input.targetAudience, input.focus].filter(Boolean).join(" ");
  const styleProfile = resolveBookStyleProfile(input.styleProfile, styleSeed);

  if (input.theme.trim().length < 2) {
    return {
      status: "needs_clarification",
      kind: "recommendation",
      title: "需要明确书单主题",
      intro: "请提供一个更具体的书单主题，例如：科幻入门、女性成长、商业思维、心理学经典等。",
      questions: [
        { id: "theme", label: "你想要什么主题的书单？" },
        { id: "targetAudience", label: "这份书单主要给谁看？（初学者、专业人士等）" },
        { id: "progression", label: "希望如何组织？（从易到难、按主题分类、按时间顺序）" }
      ],
      styleProfile
    };
  }

  const evidence = await collectBookEvidence(buildSearchQueries(input), {
    validation: "balanced",
    extraSources: 2,
    fallback: "off",
    format: "json",
    timeoutSeconds: 60
  });

  const { guidance, pageSkeleton } = buildGuidancePackage("recommendation", `主题书单：${input.theme}`, styleProfile);

  return {
    status: "evidence_collected",
    kind: "recommendation",
    task: { ...input },
    styleProfile,
    searchOk: evidence.ok,
    searchError: evidence.error,
    evidenceDigest: evidence.digest,
    sources: evidence.sources,
    guidance,
    pageSkeleton,
    nextAction: "draft_page_then_call_compose_book_page"
  };
}
