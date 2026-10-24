import { describe, expect, it } from 'vitest';
import { CipherError, englishScore, railFence, vigenere } from './index';

describe('vigenere', () => {
  it('does not spend a key letter on characters that are not letters', () => {
    expect(vigenere('a-b', 'bc')).toBe('b-d');
    expect(vigenere('b-d', 'bc', 'decode')).toBe('a-b');
  });

  it('wraps the key when it is shorter than the text', () => {
    expect(vigenere('aaaa', 'bc')).toBe('bcbc');
    expect(vigenere('bcbc', 'bc', 'decode')).toBe('aaaa');
  });

  it('keeps the case of each letter', () => {
    expect(vigenere('AbC', 'bcd')).toBe('BdF');
  });
});

describe('railFence', () => {
  it('returns nothing for empty text', () => {
    expect(railFence('', 2)).toBe('');
    expect(railFence('', 2, 'decode')).toBe('');
  });

  it('refuses a rail count it cannot draw', () => {
    expect(() => railFence('text', 1)).toThrow(CipherError);
    expect(() => railFence('text', 13)).toThrow('Choose between 2 and 12 rails');
    expect(() => railFence('text', 2.5)).toThrow(CipherError);
    expect(() => railFence('text', Number.NaN)).toThrow(CipherError);
  });

  it('round-trips at the smallest and largest rail counts', () => {
    const text = 'we are discovered, flee at once';
    for (const rails of [2, 3, 12]) {
      const encoded = railFence(text, rails);
      expect(railFence(encoded, rails, 'decode'), `rails ${rails}`).toBe(text);
    }
  });

  it('leaves text that fits on the rails in order', () => {
    expect(railFence('ab', 2)).toBe('ab');
    expect(railFence('ab', 2, 'decode')).toBe('ab');
  });
});

describe('englishScore', () => {
  it('gives no score to text without letters', () => {
    expect(englishScore('1234 !!!')).toBe(Number.NEGATIVE_INFINITY);
    expect(englishScore('')).toBe(Number.NEGATIVE_INFINITY);
  });

  it('scores English above a shifted version of itself', () => {
    const plain = 'the quick brown fox jumps over the lazy dog';
    const shifted = plain
      .split('')
      .map((letter) =>
        /[a-z]/.test(letter)
          ? String.fromCharCode(((letter.charCodeAt(0) - 97 + 7) % 26) + 97)
          : letter,
      )
      .join('');
    expect(englishScore(plain)).toBeGreaterThan(englishScore(shifted));
  });

  it('penalises a very short sample rather than trusting it', () => {
    expect(englishScore('e')).toBeLessThan(englishScore('e'.repeat(20)));
  });
});
