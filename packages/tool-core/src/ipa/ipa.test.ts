import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARPABET_TO_IPA,
  arpabetToIpa,
  IpaError,
  joinTranscription,
  tokenise,
  transcribe,
  VOWELS,
} from './index';

/** A tiny dictionary, so the tests do not depend on the committed data. */
const DICTIONARY: Record<string, string[]> = {
  hello: ['HH AH0 L OW1'],
  world: ['W ER1 L D'],
  read: ['R IY1 D', 'R EH1 D'],
  room: ['R UW1 M'],
  stop: ['S T AA1 P'],
  'ice-cream': ['AY1 S K R IY2 M'],
  don: ['D AA1 N'],
  "don't": ['D OW1 N T'],
};

const lookup = (word: string) => DICTIONARY[word];

describe('arpabetToIpa', () => {
  it('writes a known word with its stress marks', () => {
    expect(arpabetToIpa('HH AH0 L OW1')).toBe('həˈloʊ');
  });

  it('uses the unstressed letters for AH0 and ER0', () => {
    expect(arpabetToIpa('AH0')).toBe('ə');
    expect(arpabetToIpa('ER0')).toBe('ɚ');
    expect(arpabetToIpa('ER1')).toBe('ˈɝ');
  });

  it('marks secondary stress', () => {
    expect(arpabetToIpa('K R IY2 M')).toBe('ˌkɹim');
  });

  it('refuses a symbol it cannot map', () => {
    expect(() => arpabetToIpa('XX1')).toThrow(IpaError);
    expect(() => arpabetToIpa('HH AA3')).toThrow(IpaError);
  });

  it('covers every ARPAbet symbol that appears in the committed dictionary', () => {
    const source = new URL('../../../../data/pronunciation/cmudict.dict', import.meta.url);
    const text = readFileSync(source, 'utf8');
    const symbols = new Set<string>();
    const malformed = new Set<string>();
    // One pass over the file: every phone is an upper-case symbol with an
    // optional stress digit, and the words themselves are lower case.
    for (const [phone] of text.matchAll(/[A-Z][A-Z0-9]*/g)) {
      const match = /^([A-Z]+)([012])?$/.exec(phone);
      if (match) symbols.add(match[1] as string);
      else malformed.add(phone);
    }
    expect([...malformed].slice(0, 5)).toEqual([]);
    expect(symbols.size).toBeGreaterThan(30);
    for (const symbol of symbols) {
      expect(ARPABET_TO_IPA[symbol], symbol).toBeDefined();
      const isVowel = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)$/.test(symbol);
      expect(VOWELS.has(symbol), `${symbol} vowel flag`).toBe(isVowel);
    }
    // The mapping adds nothing the data never uses.
    expect(Object.keys(ARPABET_TO_IPA).sort()).toEqual([...symbols].sort());
  }, 20_000);
});

describe('tokenise', () => {
  it('keeps words, numbers, punctuation and spacing in order', () => {
    expect(tokenise("Hello, world! It's 42.")).toEqual([
      { kind: 'word', text: 'Hello' },
      { kind: 'other', text: ', ' },
      { kind: 'word', text: 'world' },
      { kind: 'other', text: '! ' },
      { kind: 'word', text: "It's" },
      { kind: 'other', text: ' ' },
      { kind: 'number', text: '42' },
      { kind: 'other', text: '.' },
    ]);
  });

  it('keeps a hyphen inside a word', () => {
    expect(tokenise('ice-cream').map((token) => token.text)).toEqual(['ice-cream']);
    expect(tokenise('well-known word').map((token) => token.text)).toEqual([
      'well-known',
      ' ',
      'word',
    ]);
  });
});

describe('transcribe', () => {
  it('transcribes known words and keeps the punctuation', () => {
    const result = transcribe('Hello, world!', lookup);
    expect(result.words).toBe(2);
    expect(result.transcribed).toBe(2);
    expect(result.unknown).toEqual([]);
    expect(joinTranscription(result)).toBe('həˈloʊ, ˈwɝld!');
  });

  it('shows every variant the dictionary has, in order', () => {
    const result = transcribe('read', lookup);
    expect(result.segments[0]?.variants).toEqual(['ˈɹid', 'ˈɹɛd']);
  });

  it('reports a word it does not know instead of guessing', () => {
    const result = transcribe('hello zzzz', lookup);
    expect(result.unknown).toEqual(['zzzz']);
    expect(joinTranscription(result)).toBe('həˈloʊ ⟨zzzz⟩');
  });

  it('is case-insensitive', () => {
    expect(joinTranscription(transcribe('HELLO', lookup))).toBe('həˈloʊ');
  });

  it('leaves numbers alone and says so through the count', () => {
    const result = transcribe('room 101', lookup);
    expect(result.words).toBe(1);
    expect(result.segments.at(-1)).toEqual({ kind: 'number', text: '101', variants: [] });
    expect(joinTranscription(result)).toBe('ˈɹum 101');
  });

  it('handles an apostrophe', () => {
    const result = transcribe("don't stop", lookup);
    expect(result.unknown).toEqual([]);
    expect(joinTranscription(result)).toBe('ˈdoʊnt ˈstɑp');
  });

  it('transcribes a listed hyphenated word as one entry', () => {
    expect(joinTranscription(transcribe('ice-cream', lookup))).toBe('ˈaɪsˌkɹim');
  });

  it('transcribes an unlisted hyphenated word from its parts', () => {
    expect(joinTranscription(transcribe('hello-world', lookup))).toBe('həˈloʊ-ˈwɝld');
  });

  it('reports a hyphenated word whose parts are also missing', () => {
    const result = transcribe('foo-bar', lookup);
    expect(result.unknown).toEqual(['foo-bar']);
  });

  it('never silently drops a word: every word token is transcribed or reported', () => {
    const text = "One, two; three's 4 and five-six!";
    const result = transcribe(text, lookup);
    const wordTokens = tokenise(text).filter((token) => token.kind === 'word').length;
    expect(result.words).toBe(wordTokens);
    expect(result.transcribed + result.unknown.length).toBe(wordTokens);
  });
});
