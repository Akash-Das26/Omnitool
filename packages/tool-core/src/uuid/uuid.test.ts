import { describe, expect, it } from 'vitest';
import {
  generateUuids,
  NANOID_ALPHABET,
  nanoid,
  type RandomBytes,
  uuidTimestamp,
  uuidV4,
  uuidV7,
} from './index';

const fixedRandom: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) bytes[index] = index + 1;
  return bytes;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV4', () => {
  it('sets version and variant bits', () => {
    const uuid = uuidV4(fixedRandom);
    expect(uuid).toMatch(UUID_PATTERN);
    expect(uuid[14]).toBe('4');
  });

  it('formats without hyphens and in upper case', () => {
    const uuid = uuidV4(fixedRandom, true, false);
    expect(uuid).toHaveLength(32);
    expect(uuid).toBe(uuid.toUpperCase());
    expect(uuid).not.toContain('-');
  });

  it('generates unique values with the platform random source', () => {
    const values = new Set(Array.from({ length: 200 }, () => uuidV4()));
    expect(values.size).toBe(200);
    for (const value of values) expect(value).toMatch(UUID_PATTERN);
  });

  it('rejects a random source with the wrong length', () => {
    expect(() => uuidV4(() => new Uint8Array(8))).toThrow('16 random bytes');
  });
});

describe('uuidV7', () => {
  it('encodes the timestamp and version', () => {
    const now = 1_700_000_000_000;
    const uuid = uuidV7(now, fixedRandom);
    expect(uuid).toMatch(UUID_PATTERN);
    expect(uuid[14]).toBe('7');
    expect(uuidTimestamp(uuid)).toBe(now);
  });

  it('sorts in timestamp order as text', () => {
    const first = uuidV7(1_700_000_000_000, fixedRandom);
    const second = uuidV7(1_700_000_000_001, fixedRandom);
    expect(first < second).toBe(true);
  });

  it('returns null for a non-v7 value', () => {
    expect(uuidTimestamp(uuidV4(fixedRandom))).toBeNull();
    expect(uuidTimestamp('nonsense')).toBeNull();
  });

  it('rejects an out-of-range timestamp', () => {
    expect(() => uuidV7(-1, fixedRandom)).toThrow('out of range');
    expect(() => uuidV7(2 ** 49, fixedRandom)).toThrow('out of range');
  });
});

describe('generateUuids', () => {
  it('uses the requested version and count', () => {
    const values = generateUuids({ version: 'v7', count: 3 }, fixedRandom);
    expect(values).toHaveLength(3);
    for (const value of values) expect(value[14]).toBe('7');
  });

  it('validates the count', () => {
    expect(() => generateUuids({ version: 'v4', count: 0 }, fixedRandom)).toThrow(
      'between 1 and 5000',
    );
    expect(() => generateUuids({ version: 'v4', count: 5001 }, fixedRandom)).toThrow(
      'between 1 and 5000',
    );
    expect(() => generateUuids({ version: 'v4', count: 2.5 }, fixedRandom)).toThrow(
      'between 1 and 5000',
    );
  });
});

describe('nanoid', () => {
  it('returns the requested length from the default alphabet', () => {
    const id = nanoid(21);
    expect(id).toHaveLength(21);
    for (const character of id) expect(NANOID_ALPHABET).toContain(character);
  });

  it('supports a custom alphabet and size', () => {
    const id = nanoid(12, 'abc', fixedRandom);
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[abc]+$/);
  });

  it('is deterministic with a fixed random source', () => {
    expect(nanoid(8, 'abcdefgh', fixedRandom)).toBe(nanoid(8, 'abcdefgh', fixedRandom));
  });

  it('rejects invalid sizes and alphabets', () => {
    expect(() => nanoid(0)).toThrow('between 1 and 256');
    expect(() => nanoid(257)).toThrow('between 1 and 256');
    expect(() => nanoid(10, 'a')).toThrow('between 2 and 256');
  });
});
