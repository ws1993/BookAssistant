import { composeBookPage } from "../composer/composeBookPage.js";
import { textContent } from "../server/toolResponse.js";
import { composeBookPageInputSchema } from "../toolSchemas/composeBookPageInputSchema.js";
import type { BookAssistantTool } from "./types.js";

export const composeBookPageTool: BookAssistantTool = {
  name: "compose_book_page",
  description:
    "图书卡片的第二层（组织+校验）。在用 recommend_books / summarize_book / evaluate_book 收集到证据后，由你（宿主模型）把证据提炼成结构化的 book page 对象，调用本工具做 zod 校验、Markdown 残留检查和试渲染。返回 readyToRender、errors、warnings 和规范化后的 page。只有当 readyToRender 为 true 时，才调用 render_book_html 出图。",
  inputSchema: composeBookPageInputSchema,
  async handle(args: unknown) {
    return textContent(composeBookPage(args));
  }
};
