import { describe, expect, it } from 'vitest';
import {
  atbash,
  CipherError,
  caesar,
  englishScore,
  railFence,
  rankCaesar,
  rot13,
  vigenere,
} from './index';

describe('caesar', () => {
  it('matches the classic vectors and keeps case', () => {
    expect(caesar('HELLO', 3)).toBe('KHOOR');
    expect(caesar('Hello, World!', 3)).toBe('Khoor, Zruog!');
    expect(caesar('KHOOR', -3)).toBe('HELLO');
  });

  it('wraps in both directions and handles shifts beyond 26', () => {
    expect(caesar('xyz', 3)).toBe('abc');
    expect(caesar('abc', -3)).toBe('xyz');
    expect(caesar('abc', 29)).toBe(caesar('abc', 3));
    expect(caesar('abc', 26)).toBe('abc');
  });

  it('leaves everything that is not a Latin letter alone', () => {
    const text = 'Ça va? 42 — yes/no…';
    expect(caesar(text, 5)).toBe('Çf af? 42 — djx/st…');
  });

  it('rejects a fractional shift', () => {
    expect(() => caesar('abc', 1.5)).toThrow(CipherError);
  });
});

describe('rot13', () => {
  it('decodes the usual vector and is its own inverse', () => {
    expect(rot13('Hello, World!')).toBe('Uryyb, Jbeyq!');
    expect(rot13(rot13('Anything at all 123'))).toBe('Anything at all 123');
  });
});

describe('atbash', () => {
  it('mirrors the alphabet and is its own inverse', () => {
    expect(atbash('ATTACK AT DAWN')).toBe('ZGGZXP ZG WZDM');
    expect(atbash(atbash('lower case'))).toBe('lower case');
  });
});

describe('vigenere', () => {
  it('matches the standard vector', () => {
    expect(vigenere('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR');
    expect(vigenere('LXFOPVEFRNHR', 'LEMON', 'decode')).toBe('ATTACKATDAWN');
  });

  it('keeps case and does not consume key letters on punctuation', () => {
    expect(vigenere('Attack at dawn!', 'lemon')).toBe('Lxfopv ef rnhr!');
    expect(vigenere('Lxfopv ef rnhr!', 'lemon', 'decode')).toBe('Attack at dawn!');
  });

  it('repeats a short key and rejects a key with no letters', () => {
    expect(vigenere('AAAAAA', 'ab')).toBe('ABABAB');
    expect(() => vigenere('text', '123')).toThrow(CipherError);
  });
});

describe('rail fence', () => {
  it('matches the three-rail vector and round-trips', () => {
    const plain = 'WEAREDISCOVEREDFLEEATONCE';
    const encoded = railFence(plain, 3);
    expect(encoded).toBe('WECRLTEERDSOEEFEAOCAIVDEN');
    expect(railFence(encoded, 3, 'decode')).toBe(plain);
  });

  it('round-trips at every rail count it allows', () => {
    const text = 'The quick brown fox jumps over the lazy dog. 0123456789';
    for (let rails = 2; rails <= 12; rails += 1) {
      expect(railFence(railFence(text, rails), rails, 'decode'), `${rails} rails`).toBe(text);
    }
  });

  it('rejects rail counts outside 2-12', () => {
    expect(() => railFence('abc', 1)).toThrow(CipherError);
    expect(() => railFence('abc', 13)).toThrow(CipherError);
    expect(() => railFence('abc', 2.5)).toThrow(CipherError);
  });

  it('handles empty and single-character input', () => {
    expect(railFence('', 3)).toBe('');
    expect(railFence('a', 3)).toBe('a');
    expect(railFence('a', 3, 'decode')).toBe('a');
  });
});

describe('englishScore and rankCaesar', () => {
  const plain = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG';

  it('scores English above a shifted copy', () => {
    const unreadable = caesar(plain, 7);
    expect(englishScore(plain)).toBeGreaterThan(englishScore(unreadable));
  });

  it('puts the decoding shift first', () => {
    const encoded = caesar('It was the best of times, it was the worst of times.', 7);
    expect(rankCaesar(encoded)[0]?.shift).toBe(7);
    expect(rankCaesar(encoded)[0]?.text).toBe(
      'It was the best of times, it was the worst of times.',
    );
  });

  it('returns 25 candidates in descending score order', () => {
    const candidates = rankCaesar('hello there');
    expect(candidates).toHaveLength(25);
    for (let index = 1; index < candidates.length; index += 1) {
      expect(candidates[index - 1]?.score).toBeGreaterThanOrEqual(candidates[index]?.score ?? 0);
    }
  });

  it('does not throw on text with no letters', () => {
    expect(englishScore('1234 — !!')).toBe(-Infinity);
    expect(rankCaesar('1234').every((candidate) => candidate.score === -Infinity)).toBe(true);
  });
});
