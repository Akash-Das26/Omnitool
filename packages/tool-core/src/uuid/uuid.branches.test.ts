import { describe, expect, it } from 'vitest';
import { generateUuids, nanoid, uuidTimestamp, uuidV4, uuidV7 } from './index';

/** A deterministic stand-in for crypto.getRandomValues. */
function fixedRandom(fill: number, length = 16) {
  return (wanted: number) => new Uint8Array(Math.min(wanted, length) || wanted).fill(fill);
}

function countingRandom(values: number[]) {
  let index = 0;
  return (wanted: number) => {
    const bytes = new Uint8Array(wanted);
    for (let position = 0; position < wanted; position += 1) {
      bytes[position] = values[index % values.length] as number;
      index += 1;
    }
    return bytes;
  };
}

describe('uuidV4', () => {
  it('sets the version and variant bits and formats the hex', () => {
    expect(uuidV4(fixedRandom(0xab))).toBe('abababab-abab-4bab-abab-abababababab');
  });

  it('can be upper case and can drop the hyphens', () => {
    const upper = uuidV4(fixedRandom(0xcd), true, false);
    expect(upper).toBe('CDCDCDCDCDCD4DCD8DCDCDCDCDCDCDCD');
    expect(upper).toHaveLength(32);
  });

  it('refuses a random source that is not 16 bytes', () => {
    expect(() => uuidV4((length) => new Uint8Array(length - 1))).toThrow(
      'UUID v4 needs 16 random bytes',
    );
  });
});

describe('uuidV7', () => {
  it('puts the timestamp in the first six bytes and marks version 7', () => {
    const uuid = uuidV7(1_700_000_000_000, fixedRandom(0));
    expect(uuid.slice(14, 15)).toBe('7');
    expect(uuidTimestamp(uuid)).toBe(1_700_000_000_000);
  });

  it('refuses a timestamp outside what six bytes can hold', () => {
    expect(() => uuidV7(-1)).toThrow('UUID v7 timestamp is out of range');
    expect(() => uuidV7(Number.NaN)).toThrow('UUID v7 timestamp is out of range');
    expect(() => uuidV7(2 ** 48)).toThrow('UUID v7 timestamp is out of range');
  });

  it('refuses a random source that is not 16 bytes', () => {
    expect(() => uuidV7(0, (length) => new Uint8Array(length + 1))).toThrow(
      'UUID v7 needs 16 random bytes',
    );
  });
});

describe('generateUuids', () => {
  it('makes the number asked for, in the version asked for', () => {
    const v4 = generateUuids({ version: 'v4', count: 3 }, fixedRandom(1));
    expect(v4).toHaveLength(3);
    expect(v4.every((uuid) => uuid.slice(14, 15) === '4')).toBe(true);

    const v7 = generateUuids({ version: 'v7', count: 2 }, fixedRandom(2));
    expect(v7).toHaveLength(2);
    expect(v7.every((uuid) => uuid.slice(14, 15) === '7')).toBe(true);
  });

  it('passes the formatting options on', () => {
    const [uuid] = generateUuids(
      { version: 'v4', count: 1, uppercase: true, hyphens: false },
      fixedRandom(0x0f),
    );
    expect(uuid).toMatch(/^[0-9A-F]{32}$/);
  });

  it('refuses a count that is not a whole number in range', () => {
    for (const count of [0, 5001, 1.5, Number.NaN]) {
      expect(() => generateUuids({ version: 'v4', count }), String(count)).toThrow(
        'Count must be a whole number between 1 and 5000',
      );
    }
  });
});

describe('uuidTimestamp', () => {
  it('reads the time back out of a v7 UUID', () => {
    const uuid = uuidV7(1_234_567_890_123, fixedRandom(0));
    expect(uuidTimestamp(uuid)).toBe(1_234_567_890_123);
  });

  it('gives null for anything that is not a v7 UUID', () => {
    expect(uuidTimestamp('not-a-uuid')).toBeNull();
    expect(uuidTimestamp('zzzzzzzz-zzzz-7zzz-zzzz-zzzzzzzzzzzz')).toBeNull();
    expect(uuidTimestamp(uuidV4(fixedRandom(1)))).toBeNull();
  });
});

describe('nanoid', () => {
  it('uses the requested size and alphabet', () => {
    const id = nanoid(10, 'abc', countingRandom([0, 1, 2]));
    expect(id).toHaveLength(10);
    expect(id).toMatch(/^[abc]{10}$/);
  });

  it('skips bytes that would bias the alphabet', () => {
    // 256 % 200 = 56, so bytes at 200 and above are discarded.
    const id = nanoid(4, 'a'.repeat(199) + 'b', countingRandom([250, 0]));
    expect(id).toBe('aaaa');
  });

  it('refuses a size or alphabet it cannot use', () => {
    expect(() => nanoid(0)).toThrow('Nano ID size must be between 1 and 256');
    expect(() => nanoid(257)).toThrow('Nano ID size must be between 1 and 256');
    expect(() => nanoid(10, 'a')).toThrow(
      'Nano ID alphabet must contain between 2 and 256 characters',
    );
    expect(() => nanoid(10, 'ab'.repeat(200))).toThrow(
      'Nano ID alphabet must contain between 2 and 256 characters',
    );
  });
});
