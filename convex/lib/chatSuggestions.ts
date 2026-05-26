export type SuggestedQuestionStatus = "active" | "clicked" | "archived";

export type SuggestedQuestionCandidate = {
  _id?: string;
  question: string;
  normalizedQuestion?: string;
  score: number;
  createdAt: number;
  clickedAt?: number;
  status?: SuggestedQuestionStatus;
};

export type RankedQuestionSelectionInput<T extends SuggestedQuestionCandidate> = {
  candidates: T[];
  askedQuestions?: string[];
  clickedQuestions?: string[];
  limit?: number;
};

export function normalizeSuggestedQuestion(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\bwhat['’`]?s\b/g, "what is")
    .replace(/\bwho['’`]?s\b/g, "who is")
    .replace(/\bwhere['’`]?s\b/g, "where is")
    .replace(/\bwhen['’`]?s\b/g, "when is")
    .replace(/\bhow['’`]?s\b/g, "how is")
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function selectRankedSuggestedQuestions<T extends SuggestedQuestionCandidate>({
  candidates,
  askedQuestions = [],
  clickedQuestions = [],
  limit = 2,
}: RankedQuestionSelectionInput<T>) {
  const blocked = new Set(
    [...askedQuestions, ...clickedQuestions]
      .map(normalizeSuggestedQuestion)
      .filter(Boolean),
  );
  const seen = new Set<string>();

  return [...candidates]
    .filter((candidate) => candidate.status === undefined || candidate.status === "active")
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.createdAt - left.createdAt;
    })
    .filter((candidate) => {
      const normalized =
        candidate.normalizedQuestion || normalizeSuggestedQuestion(candidate.question);
      if (!normalized || blocked.has(normalized) || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, Math.max(0, limit));
}

export function clampSuggestionScore(score: number) {
  if (!Number.isFinite(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}
