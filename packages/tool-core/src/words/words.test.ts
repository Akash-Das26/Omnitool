import { describe, expect, it } from 'vitest';
import { countText } from './index';

describe('countText', () => {
  it('returns zeros for empty input', () => {
    expect(countText('')).toEqual({
      words: 0,
      sentences: 0,
      characters: 0,
      charactersNoSpaces: 0,
      paragraphs: 0,
      lines: 0,
      readingMinutes: 0,
      speakingMinutes: 0,
    });
  });

  it('counts words, sentences and characters', () => {
    const stats = countText('Hello world. This is a test!');
    expect(stats.words).toBe(6);
    expect(stats.sentences).toBe(2);
    expect(stats.characters).toBe(28);
    expect(stats.charactersNoSpaces).toBe(23);
    expect(stats.lines).toBe(1);
    expect(stats.paragraphs).toBe(1);
    expect(stats.readingMinutes).toBe(1);
  });

  it('treats numbers and punctuation through the segmenter', () => {
    const stats = countText('Version 2.1 ships 3 fixes.');
    expect(stats.words).toBe(5);
    expect(stats.sentences).toBe(1);
  });

  it('counts code points rather than UTF-16 units', () => {
    const stats = countText('a🌍b');
    expect(stats.characters).toBe(3);
    expect(stats.charactersNoSpaces).toBe(3);
  });

  it('counts paragraphs and lines', () => {
    const stats = countText('One.\n\nTwo.\nStill two.');
    expect(stats.paragraphs).toBe(2);
    expect(stats.lines).toBe(4);
  });

  it('accepts custom reading speeds', () => {
    const words = Array.from({ length: 300 }, () => 'word').join(' ');
    expect(countText(words).readingMinutes).toBe(2);
    expect(countText(words, { wordsPerMinute: 100 }).readingMinutes).toBe(3);
    expect(countText(words, { speakingPerMinute: 150 }).speakingMinutes).toBe(2);
  });

  it('does not count whitespace as a word', () => {
    expect(countText('   \n\t ').words).toBe(0);
  });
});
