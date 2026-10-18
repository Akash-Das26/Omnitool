import { describe, expect, it } from 'vitest';
import {
  DiffError,
  diffText,
  diffTokens,
  MAX_DIFF_TOKENS,
  mergeSteps,
  tokenize,
  toRows,
} from './index';

describe('tokenize', () => {
  it('keeps line endings with their line', () => {
    expect(tokenize('a\nb', 'line')).toEqual(['a\n', 'b']);
    expect(tokenize('a\n', 'line')).toEqual(['a\n']);
  });

  it('splits words, whitespace and punctuation', () => {
    expect(tokenize('cat sat!', 'word')).toEqual(['cat', ' ', 'sat', '!']);
  });

  it('splits by code point for characters', () => {
    expect(tokenize('a🌍', 'character')).toEqual(['a', '🌍']);
  });

  it('returns an empty list for empty text', () => {
    expect(tokenize('', 'line')).toEqual([]);
    expect(tokenize('', 'character')).toEqual([]);
  });
});

describe('diffTokens', () => {
  it('returns equality for identical input', () => {
    expect(diffTokens(['a', 'b'], ['a', 'b'])).toEqual([
      { type: 'equal', token: 'a' },
      { type: 'equal', token: 'b' },
    ]);
  });

  it('detects insertions and deletions', () => {
    expect(diffTokens(['a'], ['a', 'b'])).toEqual([
      { type: 'equal', token: 'a' },
      { type: 'insert', token: 'b' },
    ]);
    expect(diffTokens(['a', 'b'], ['a'])).toEqual([
      { type: 'equal', token: 'a' },
      { type: 'delete', token: 'b' },
    ]);
  });

  it('finds the minimal change for a replacement', () => {
    const steps = diffTokens(['a', 'b', 'c'], ['a', 'x', 'c']);
    expect(steps.filter((step) => step.type === 'insert')).toHaveLength(1);
    expect(steps.filter((step) => step.type === 'delete')).toHaveLength(1);
    expect(steps.filter((step) => step.type === 'equal')).toHaveLength(2);
  });

  it('throws rather than spending unbounded memory', () => {
    expect(() => diffTokens(['a', 'b'], ['c', 'd'], 0)).toThrow(DiffError);
  });
});

describe('diffText', () => {
  it('reports a changed line with counts', () => {
    const result = diffText('one\ntwo\nthree\n', 'one\nTWO\nthree\n', 'line');
    expect(result.additions).toBe(1);
    expect(result.deletions).toBe(1);
    expect(result.unchanged).toBe(2);
    expect(result.parts).toEqual([
      { type: 'equal', value: 'one\n' },
      { type: 'delete', value: 'two\n' },
      { type: 'insert', value: 'TWO\n' },
      { type: 'equal', value: 'three\n' },
    ]);
  });

  it('works at word and character level', () => {
    const words = diffText('the cat sat', 'the dog sat', 'word');
    expect(words.parts.find((part) => part.type === 'delete')?.value).toBe('cat');
    expect(words.parts.find((part) => part.type === 'insert')?.value).toBe('dog');

    const characters = diffText('a🌍', 'a🌏', 'character');
    expect(characters.parts).toEqual([
      { type: 'equal', value: 'a' },
      { type: 'delete', value: '🌍' },
      { type: 'insert', value: '🌏' },
    ]);
  });

  it('handles empty sides', () => {
    expect(diffText('', 'new', 'line').parts).toEqual([{ type: 'insert', value: 'new' }]);
    expect(diffText('old', '', 'line').parts).toEqual([{ type: 'delete', value: 'old' }]);
    expect(diffText('', '', 'line').parts).toEqual([]);
  });

  it('refuses text beyond the token budget', () => {
    const long = 'a'.repeat(MAX_DIFF_TOKENS + 1);
    expect(() => diffText(long, '', 'character')).toThrow('limited to');
  });
});

describe('mergeSteps', () => {
  it('coalesces adjacent steps of the same type', () => {
    expect(
      mergeSteps([
        { type: 'equal', token: 'a' },
        { type: 'equal', token: 'b' },
        { type: 'insert', token: 'c' },
      ]),
    ).toEqual([
      { type: 'equal', value: 'ab' },
      { type: 'insert', value: 'c' },
    ]);
  });
});

describe('toRows', () => {
  it('pairs a replacement and keeps equal rows', () => {
    const rows = toRows(diffText('one\ntwo\n', 'one\nTWO\n', 'line').parts);
    expect(rows).toEqual([
      { left: 'one\n', right: 'one\n', kind: 'equal' },
      { left: 'two\n', right: 'TWO\n', kind: 'change' },
    ]);
  });

  it('shows one-sided rows for pure insertions and deletions', () => {
    expect(toRows([{ type: 'insert', value: 'new\n' }])).toEqual([
      { left: null, right: 'new\n', kind: 'insert' },
    ]);
    expect(toRows([{ type: 'delete', value: 'old\n' }])).toEqual([
      { left: 'old\n', right: null, kind: 'delete' },
    ]);
  });

  it('pairs uneven change chunks and leaves the extra side empty', () => {
    const rows = toRows([
      { type: 'delete', value: 'a\n' },
      { type: 'delete', value: 'b\n' },
      { type: 'insert', value: 'c\n' },
    ]);
    expect(rows).toEqual([
      { left: 'a\n', right: 'c\n', kind: 'change' },
      { left: 'b\n', right: null, kind: 'delete' },
    ]);
  });
});
