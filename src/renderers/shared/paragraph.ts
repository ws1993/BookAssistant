import { escapeAttribute } from "../../utils/escapeHtml.js";
import { renderInlineRichTextParagraphs } from "../../utils/renderInlineRichText.js";

export interface ParagraphGroupOptions {
  singleTag?: "p" | "div";
  singleClassName?: string;
  singleStyle?: string;
  multiWrapperClassName?: string;
  multiWrapperStyle?: string;
  multiParagraphClassName?: string;
  multiParagraphStyle?: string;
}

function classAttribute(value: string | undefined): string {
  return value ? ` class="${escapeAttribute(value)}"` : "";
}

function styleAttribute(value: string | undefined): string {
  return value ? ` style="${escapeAttribute(value)}"` : "";
}

export function renderParagraphGroup(value: unknown, options: ParagraphGroupOptions = {}): string {
  const paragraphs = renderInlineRichTextParagraphs(value);

  if (paragraphs.length === 0) {
    return "";
  }

  if (paragraphs.length === 1) {
    const tag = options.singleTag ?? "p";
    const attributes = `${classAttribute(options.singleClassName)}${styleAttribute(options.singleStyle)}`;

    return `<${tag}${attributes}>${paragraphs[0]}</${tag}>`;
  }

  const wrapperAttributes = `${classAttribute(options.multiWrapperClassName)}${styleAttribute(options.multiWrapperStyle)}`;
  const paragraphAttributes = `${classAttribute(options.multiParagraphClassName)}${styleAttribute(options.multiParagraphStyle)}`;

  return `<div${wrapperAttributes}>${paragraphs
    .map((paragraph) => `<p${paragraphAttributes}>${paragraph}</p>`)
    .join("")}</div>`;
}
