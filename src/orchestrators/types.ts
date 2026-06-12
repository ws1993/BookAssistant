import type { BookStyleProfile } from "../schemas/bookAssistantSchemas.js";
import type { BookPageKind } from "../schemas/bookPageSchema.js";

export interface ClarificationQuestion {
  id: string;
  label: string;
}

export interface EvidenceSource {
  title: string;
  url?: string;
  excerpt?: string;
  source?: string;
  kind?: "search" | "fetch" | "catalog";
  confidence?: "low" | "medium" | "high";
}

/**
 * Returned when the request is too vague to search on. The host model should
 * ask the user these questions before retrying the tool.
 */
export interface ClarificationPackage {
  status: "needs_clarification";
  kind: BookPageKind;
  title: string;
  intro: string;
  questions: ClarificationQuestion[];
  styleProfile: Exclude<BookStyleProfile, "auto">;
}

/**
 * The layer-1 output. Carries the original task, the raw synthesized evidence
 * from smart-search, and instructions telling the host model how to turn that
 * evidence into a `page` object for compose_book_page (layer 2).
 */
export interface EvidencePackage {
  status: "evidence_collected";
  kind: BookPageKind;
  task: Record<string, unknown>;
  styleProfile: Exclude<BookStyleProfile, "auto">;
  searchOk: boolean;
  searchError?: string;
  /** Verbatim synthesized answer text from smart-search for the host model to read. */
  evidenceDigest: string;
  sources: EvidenceSource[];
  guidance: string[];
  pageSkeleton: Record<string, unknown>;
  nextAction: "draft_page_then_call_compose_book_page";
}

export type BookAssistantPackage = ClarificationPackage | EvidencePackage;
