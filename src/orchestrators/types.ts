import type { BookStyleProfile } from "../schemas/bookAssistantSchemas.js";

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

export interface ClarificationResult {
  kind: "clarification";
  title: string;
  intro: string;
  questions: ClarificationQuestion[];
  styleProfile: BookStyleProfile;
}

export interface RecommendationItem {
  rank: number;
  title: string;
  author?: string;
  reason: string;
  fit: string;
  warning?: string;
  tags: string[];
  sources: EvidenceSource[];
}

export interface RecommendationResult {
  kind: "recommendation";
  title: string;
  query: string;
  profile: BookStyleProfile;
  summary: string;
  items: RecommendationItem[];
  evidence: EvidenceSource[];
  notes: string[];
}

export interface SummaryResult {
  kind: "summary";
  title: string;
  profile: BookStyleProfile;
  bookTitle: string;
  author?: string;
  edition?: string;
  spoilerPolicy: string;
  overview: string;
  keyPoints: string[];
  structure: string[];
  audience: string[];
  sources: EvidenceSource[];
  notes: string[];
}

export interface EvaluationResult {
  kind: "evaluation";
  title: string;
  profile: BookStyleProfile;
  bookTitle: string;
  author?: string;
  edition?: string;
  score: number;
  verdict: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  avoidIf: string[];
  sources: EvidenceSource[];
  notes: string[];
}

export type BookAssistantResult = ClarificationResult | RecommendationResult | SummaryResult | EvaluationResult;
