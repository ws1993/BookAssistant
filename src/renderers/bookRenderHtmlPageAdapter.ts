import type { BookRenderDocument, BookRenderSection, BookRenderTheme, BookRenderTemplate } from "./bookRenderDocument.js";
import { htmlPageSchema, type HtmlPageInput, type HtmlPageSectionInput } from "../schemas/htmlPageSchema.js";

function adaptTheme(theme: BookRenderTheme): HtmlPageInput["theme"] {
  return theme;
}

function adaptTemplate(template: BookRenderTemplate): HtmlPageInput["template"] {
  return template;
}

function adaptSection(section: BookRenderSection): HtmlPageSectionInput {
  switch (section.type) {
    case "hero":
      return {
        type: "hero",
        heading: section.heading,
        subheading: section.subheading
      };
    case "features":
      return {
        type: "features",
        heading: section.heading,
        intro: section.intro,
        items: section.items
      };
    case "steps":
      return {
        type: "steps",
        heading: section.heading,
        items: section.items
      };
    case "content":
      return {
        type: "content",
        heading: section.heading,
        body: section.body
      };
    case "faq":
      return {
        type: "faq",
        heading: section.heading,
        items: section.items
      };
  }
}

export function validateHtmlPageInput(page: HtmlPageInput): HtmlPageInput {
  return htmlPageSchema.parse(page);
}

export function adaptBookRenderDocumentToHtmlPage(document: BookRenderDocument): HtmlPageInput {
  return validateHtmlPageInput({
    template: adaptTemplate(document.template),
    title: document.title,
    description: document.title,
    lang: "zh-CN",
    theme: adaptTheme(document.theme),
    sections: document.sections.map(adaptSection)
  });
}
