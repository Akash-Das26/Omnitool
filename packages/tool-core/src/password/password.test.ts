import { describe, expect, it } from 'vitest';
import {
  cryptoRandomBytes,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassphrase,
  generatePassword,
  PASSPHRASE_WORDS,
  PasswordError,
  passphraseEntropyBits,
  passwordEntropyBits,
  randomIndex,
} from './index';

function sequenceBytes(values: number[]): (count: number) => Uint8Array {
  let index = 0;
  return (count) => {
    const bytes = new Uint8Array(count);
    for (let offset = 0; offset < count; offset += 1) {
      bytes[offset] = values[index % values.length] ?? 0;
      index += 1;
    }
    return bytes;
  };
}

describe('randomIndex', () => {
  it('rejects bytes above the largest multiple of the range', () => {
    // 256 % 10 = 6, so bytes 250-255 are rejected.
    const random = sequenceBytes([250, 255, 5]);
    expect(randomIndex(10, random)).toBe(5);
  });

  it('rejects invalid ranges and exhausted sources', () => {
    expect(() => randomIndex(0)).toThrow(PasswordError);
    expect(() => randomIndex(1.5)).toThrow(PasswordError);
    expect(() => randomIndex(10, sequenceBytes([255]))).toThrow('enough random data');
  });

  it('uses crypto.getRandomValues by default', () => {
    const bytes = cryptoRandomBytes(16);
    expect(bytes).toHaveLength(16);
    expect(bytes.some((byte) => byte !== 0)).toBe(true);
  });
});

describe('generatePassword', () => {
  it('honours the requested length and character sets', () => {
    const password = generatePassword(
      { ...DEFAULT_PASSWORD_OPTIONS, length: 32 },
      sequenceBytes([7, 33, 99, 4]),
    );
    expect(password).toHaveLength(32);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });

  it('removes ambiguous characters when asked', () => {
    for (let run = 0; run < 50; run += 1) {
      const password = generatePassword(DEFAULT_PASSWORD_OPTIONS);
      expect(password).not.toMatch(/[Il1O0o|`'"]/);
    }
  });

  it('keeps ambiguous characters when the option is off', () => {
    const options = {
      ...DEFAULT_PASSWORD_OPTIONS,
      length: 64,
      digits: false,
      symbols: false,
      excludeAmbiguous: false,
    };
    const samples = Array.from({ length: 20 }, () => generatePassword(options)).join('');
    expect(samples).toMatch(/[Il1O0o]/);
  });

  it('errors on impossible options', () => {
    expect(() =>
      generatePassword(
        {
          length: 20,
          lowercase: false,
          uppercase: false,
          digits: false,
          symbols: false,
          excludeAmbiguous: true,
        },
        sequenceBytes([1]),
      ),
    ).toThrow('at least one character set');
    expect(() =>
      generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 2 }, sequenceBytes([1])),
    ).toThrow('between 4 and 256');
    expect(() =>
      generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 999 }, sequenceBytes([1])),
    ).toThrow('between 4 and 256');
  });

  it('estimates entropy from the selected pool', () => {
    expect(passwordEntropyBits()).toBeGreaterThan(120);
    expect(
      passwordEntropyBits({ ...DEFAULT_PASSWORD_OPTIONS, symbols: false, excludeAmbiguous: false }),
    ).toBeGreaterThan(100);
    expect(
      passwordEntropyBits({
        length: 20,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
        excludeAmbiguous: false,
      }),
    ).toBe(0);
  });
});

describe('passphrases', () => {
  it('joins the requested number of words', () => {
    const phrase = generatePassphrase(
      { words: 5, separator: ' ', capitalise: false },
      sequenceBytes([1, 2, 3]),
    );
    expect(phrase.split(' ')).toHaveLength(5);
    expect(phrase).toMatch(/^[a-z]+( [a-z]+){4}$/);
  });

  it('capitalises words when asked', () => {
    const phrase = generatePassphrase(
      { words: 3, separator: '-', capitalise: true },
      sequenceBytes([9]),
    );
    expect(phrase.split('-').every((word) => /^[A-Z][a-z]+$/.test(word))).toBe(true);
  });

  it('enforces word bounds', () => {
    expect(() => generatePassphrase({ words: 1, separator: '-', capitalise: false })).toThrow(
      'between 2 and 12',
    );
    expect(() => generatePassphrase({ words: 13, separator: '-', capitalise: false })).toThrow(
      'between 2 and 12',
    );
  });

  it('has a local word list with enough entropy', () => {
    expect(new Set(PASSPHRASE_WORDS).size).toBe(PASSPHRASE_WORDS.length);
    expect(PASSPHRASE_WORDS.length).toBeGreaterThanOrEqual(128);
    expect(passphraseEntropyBits(4)).toBeGreaterThan(25);
  });
});

describe('crypto availability', () => {
  it('explains when the browser has no random source', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('crypto', undefined);
    try {
      expect(() => cryptoRandomBytes(4)).toThrow('secure random numbers');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
