export interface CountOptions {
  readonly locale?: string;
  readonly wordsPerMinute?: number;
  readonly speakingPerMinute?: number;
}

export interface TextStats {
  readonly words: number;
  readonly sentences: number;
  readonly characters: number;
  readonly charactersNoSpaces: number;
  readonly paragraphs: number;
  readonly lines: number;
  readonly readingMinutes: number;
  readonly speakingMinutes: number;
}

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
}

function segmenter(locale: string, granularity: 'word' | 'sentence'): SegmenterLike | null {
  const Constructor = (
    Intl as unknown as {
      Segmenter?: new (
        locale: string,
        options: { granularity: 'word' | 'sentence' },
      ) => SegmenterLike;
    }
  ).Segmenter;
  return typeof Constructor === 'function' ? new Constructor(locale, { granularity }) : null;
}

function countWords(text: string, locale: string): number {
  if (text.trim() === '') return 0;
  const segmenterInstance = segmenter(locale, 'word');
  if (!segmenterInstance) {
    return text.trim().split(/\s+/u).length;
  }
  let count = 0;
  for (const part of segmenterInstance.segment(text)) {
    if (part.isWordLike) count += 1;
  }
  return count;
}

function countSentences(text: string, locale: string): number {
  if (text.trim() === '') return 0;
  const segmenterInstance = segmenter(locale, 'sentence');
  if (!segmenterInstance) {
    return text.split(/[.!?]+/u).filter((part) => part.trim() !== '').length;
  }
  let count = 0;
  for (const part of segmenterInstance.segment(text)) {
    if (part.segment.trim() !== '') count += 1;
  }
  return count;
}

/**
 * Words and sentences come from `Intl.Segmenter`, so punctuation, numbers and
 * scripts other than Latin are handled by the platform.
 */
export function countText(text: string, options: CountOptions = {}): TextStats {
  const locale = options.locale ?? 'en-GB';
  const wordsPerMinute = options.wordsPerMinute ?? 200;
  const speakingPerMinute = options.speakingPerMinute ?? 130;

  const words = countWords(text, locale);
  const sentences = countSentences(text, locale);
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text).filter((character) => !/\s/u.test(character)).length;
  const paragraphs = text.split(/\n\s*\n/u).filter((block) => block.trim() !== '').length;
  const lines = text === '' ? 0 : text.split('\n').length;

  return {
    words,
    sentences,
    characters,
    charactersNoSpaces,
    paragraphs,
    lines,
    readingMinutes: words === 0 ? 0 : Math.ceil(words / wordsPerMinute),
    speakingMinutes: words === 0 ? 0 : Math.ceil(words / speakingPerMinute),
  };
}
