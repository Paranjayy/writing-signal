import { TokenCounts } from "./types";

const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "he",
  "her",
  "him",
  "his",
  "i",
  "if",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "with",
  "you",
  "your",
]);

export function emptyCounts(): TokenCounts {
  return {
    words: 0,
    characters: 0,
    functionWords: 0,
    contentWords: 0,
    capitalizedWords: 0,
    longWords: 0,
    numbers: 0,
    urls: 0,
    punctuation: 0,
    symbols: 0,
  };
}

/** Classifies transient text in memory. Callers must persist only the returned totals. */
export function classifyText(text: string): TokenCounts {
  const counts = emptyCounts();
  const words = text.match(/\p{L}+(?:['’-]\p{L}+)*/gu) ?? [];

  counts.characters = Array.from(text).length;
  counts.words = words.length;
  counts.numbers = (text.match(/\p{N}+/gu) ?? []).length;
  counts.urls = (text.match(/(?:https?:\/\/|www\.)\S+/giu) ?? []).length;
  counts.punctuation = (text.match(/[.,;:!?…]/gu) ?? []).length;
  counts.symbols = (text.match(/[^\p{L}\p{N}\s.,;:!?…]/gu) ?? []).length;

  for (const word of words) {
    const normalized = word.toLocaleLowerCase();
    if (FUNCTION_WORDS.has(normalized)) counts.functionWords += 1;
    else counts.contentWords += 1;
    if (/^\p{Lu}/u.test(word)) counts.capitalizedWords += 1;
    if (Array.from(word).length >= 8) counts.longWords += 1;
  }

  return counts;
}

export function positiveDelta(current: TokenCounts, previous: TokenCounts): TokenCounts {
  return Object.fromEntries(
    Object.entries(current).map(([key, value]) => [key, Math.max(0, value - previous[key as keyof TokenCounts])]),
  ) as TokenCounts;
}
