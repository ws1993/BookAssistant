import type { BookExpressionConfigInput, BookPageOutput } from "../../schemas/bookPageSchema.js";
import {
  resolveBookProfileDefinition,
  resolveBookStrategy,
  resolveBookStyleProfile,
  type BookProfileDefinition,
  type BookThemeTokens,
  type ResolvedBookExpressionStrategy,
  type ResolvedBookStyleProfile
} from "../../styles/bookProfiles.js";

export interface BookRenderContext {
  profile: ResolvedBookStyleProfile;
  theme: BookThemeTokens;
  definition: BookProfileDefinition;
  strategy: ResolvedBookExpressionStrategy;
  expression: BookExpressionConfigInput;
}

export function resolveBookRenderContext(page: BookPageOutput): BookRenderContext {
  const profile = resolveBookStyleProfile(page.styleProfile, [page.title, page.description].filter(Boolean).join(" "));
  const definition = resolveBookProfileDefinition(profile);
  const strategy = resolveBookStrategy(page.kind, page.expression?.strategy);

  return {
    profile,
    theme: definition.theme,
    definition,
    strategy,
    expression: page.expression
  };
}
